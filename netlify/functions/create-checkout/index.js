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
        const { plan, userId } = JSON.parse(event.body);
        
        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'User must be logged in' })
            };
        }

        if (!plan || !['basic', 'pro'].includes(plan)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid plan specified' })
            };
        }

        // Check if user already has a Stripe customer ID
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        let customerId = userData.stripeCustomerId;
        
        // If no Stripe customer ID exists, create one
        if (!customerId) {
            try {
                // Get user info from Firebase Auth
                const user = await admin.auth().getUser(userId);
                
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        firebaseUserId: userId
                    }
                });
                
                customerId = customer.id;
                
                // Save Stripe customer ID to Firestore
                await admin.firestore().collection('users').doc(userId).set({
                    stripeCustomerId: customerId,
                    email: user.email,
                    subscription: 'free',
                    createdAt: new Date().toISOString()
                }, { merge: true });
                
            } catch (error) {
                console.error('Error creating Stripe customer:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Failed to create customer account' })
                };
            }
        }

        // Define price IDs - you'll need to replace these with your actual Stripe price IDs
        const priceIds = {
            basic: process.env.STRIPE_BASIC_PRICE_ID,
            pro: process.env.STRIPE_PRO_PRICE_ID
        };
        
        if (!priceIds[plan]) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Price ID not configured for ${plan} plan` })
            };
        }
        
        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: priceIds[plan],
                quantity: 1,
            }],
            success_url: `${process.env.URL || 'https://your-site.netlify.app'}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://your-site.netlify.app'}/subscribe/`,
            metadata: {
                firebaseUserId: userId,
                plan: plan
            },
            subscription_data: {
                metadata: {
                    firebaseUserId: userId,
                    plan: plan
                }
            }
        });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ sessionId: session.id })
        };
        
    } catch (error) {
        console.error('Error creating checkout:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
