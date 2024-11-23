const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID;

module.exports = { stripe, PREMIUM_PRICE_ID }; 