const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin (one-time setup)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

exports.handler = async (event, context) => {
    const sig = event.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let stripeEvent;
    
    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return { statusCode: 400, body: 'Webhook Error' };
    }
    
    try {
        console.log('Processing webhook event:', stripeEvent.type);
        
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(stripeEvent.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(stripeEvent.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(stripeEvent.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(stripeEvent.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${stripeEvent.type}`);
        }
        
        return { statusCode: 200, body: 'Success' };
    } catch (error) {
        console.error('Webhook handler error:', error);
        return { statusCode: 500, body: 'Error' };
    }
};

async function handleCheckoutCompleted(session) {
    console.log('Handling checkout completed:', session.id);
    
    const { firebaseUserId, plan } = session.metadata;
    
    if (!firebaseUserId) {
        console.error('No Firebase user ID in session metadata');
        return;
    }
    
    // Update user's subscription status in Firestore
    await admin.firestore().collection('users').doc(firebaseUserId).update({
        subscription: plan,
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer,
        stripeSessionId: session.id,
        lastUpdated: new Date().toISOString()
    });
    
    console.log(`Updated user ${firebaseUserId} to ${plan} subscription`);
}

async function handleSubscriptionUpdated(subscription) {
    console.log('Handling subscription updated:', subscription.id);
    
    // Find user by Stripe customer ID
    const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('stripeCustomerId', '==', subscription.customer)
        .get();
    
    if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const subscriptionTier = getSubscriptionTier(subscription.items.data[0].price.id);
        
        await userDoc.ref.update({
            subscription: subscriptionTier,
            subscriptionStatus: subscription.status,
            stripeSubscriptionId: subscription.id,
            lastUpdated: new Date().toISOString()
        });
        
        console.log(`Updated subscription for user ${userDoc.id} to ${subscriptionTier}`);
    } else {
        console.error('No user found for customer:', subscription.customer);
    }
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Handling subscription deleted:', subscription.id);
    
    // Find user and set to free tier
    const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('stripeCustomerId', '==', subscription.customer)
        .get();
    
    if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            subscription: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: subscription.id,
            lastUpdated: new Date().toISOString()
        });
        
        console.log(`Set user ${userDoc.id} to free tier`);
    } else {
        console.error('No user found for customer:', subscription.customer);
    }
}

async function handlePaymentSucceeded(invoice) {
    console.log('Handling payment succeeded:', invoice.id);
    
    // Find user by Stripe customer ID
    const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('stripeCustomerId', '==', invoice.customer)
        .get();
    
    if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            subscriptionStatus: 'active',
            lastPaymentDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        
        console.log(`Updated payment status for user ${userDoc.id}`);
    }
}

async function handlePaymentFailed(invoice) {
    console.log('Handling payment failed:', invoice.id);
    
    // Find user by Stripe customer ID
    const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('stripeCustomerId', '==', invoice.customer)
        .get();
    
    if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            subscriptionStatus: 'past_due',
            lastPaymentFailed: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        
        console.log(`Updated payment failed status for user ${userDoc.id}`);
    }
}

function getSubscriptionTier(priceId) {
    const priceMap = {
        [process.env.STRIPE_BASIC_PRICE_ID]: 'basic',
        [process.env.STRIPE_PRO_PRICE_ID]: 'pro'
    };
    return priceMap[priceId] || 'free';
}
