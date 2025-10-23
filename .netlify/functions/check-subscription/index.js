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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { userId } = JSON.parse(event.body);
        
        if (!userId) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    subscription: 'free',
                    hasStripeId: false 
                })
            };
        }

        // Check Firestore first for cached subscription status
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // If user has Stripe customer ID, check their subscription
        if (userData.stripeCustomerId) {
            try {
                const subscriptions = await stripe.subscriptions.list({
                    customer: userData.stripeCustomerId,
                    status: 'active',
                    limit: 1
                });
                
                if (subscriptions.data.length > 0) {
                    const subscription = subscriptions.data[0];
                    const subscriptionTier = getSubscriptionTier(subscription.items.data[0].price.id);
                    
                    // Update Firestore with current status (cache for faster future checks)
                    await admin.firestore().collection('users').doc(userId).update({
                        subscription: subscriptionTier,
                        subscriptionStatus: subscription.status,
                        lastChecked: new Date().toISOString()
                    });
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ 
                            subscription: subscriptionTier,
                            hasStripeId: true,
                            stripeCustomerId: userData.stripeCustomerId,
                            subscriptionStatus: subscription.status
                        })
                    };
                } else {
                    // User has Stripe ID but no active subscription
                    await admin.firestore().collection('users').doc(userId).update({
                        subscription: 'free',
                        subscriptionStatus: 'inactive',
                        lastChecked: new Date().toISOString()
                    });
                }
            } catch (stripeError) {
                console.error('Error checking Stripe subscription:', stripeError);
                // Fall back to cached data if Stripe is unavailable
            }
        }
        
        // User has no Stripe ID or no active subscription
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                subscription: userData.subscription || 'free',
                hasStripeId: !!userData.stripeCustomerId,
                stripeCustomerId: userData.stripeCustomerId
            })
        };
        
    } catch (error) {
        console.error('Error checking subscription:', error);
        return {
            statusCode: 200, // Return free tier on error, don't break the app
            headers,
            body: JSON.stringify({ 
                subscription: 'free', 
                hasStripeId: false,
                error: error.message 
            })
        };
    }
};

function getSubscriptionTier(priceId) {
    const priceMap = {
        [process.env.STRIPE_BASIC_PRICE_ID]: 'basic',
        [process.env.STRIPE_PRO_PRICE_ID]: 'pro'
    };
    return priceMap[priceId] || 'free';
}
