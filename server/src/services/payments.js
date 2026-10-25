'use strict';
/**
 * Payments through Razorpay or Stripe — whichever is set up.
 *
 * New checkouts use the gateway chosen in Admin → Settings → Payments ("automatic" picks
 * Razorpay when its keys are set, otherwise Stripe). A chosen gateway without keys falls back
 * to the other one, so checkout keeps working while keys are being sorted out. Without any keys
 * (local dev) there is no gateway and bookings confirm at once.
 *
 * Every payment records the gateway that took it, so confirming and refunding it always goes
 * back to that gateway, even after switching.
 */
const razorpay = require('./gateways/razorpay');
const stripe = require('./gateways/stripe');
const { PaymentError, toMinor } = require('./gateways/common');

const GATEWAYS = { razorpay, stripe };
const CHOICES = ['auto', 'razorpay', 'stripe'];

const available = () => ({ razorpay: razorpay.configured(), stripe: stripe.configured() });

async function chosen() {
    // Required here: settings → currency → … would otherwise load in a cycle
    const SiteSettings = require('../models/SiteSettings');
    const choice = (await SiteSettings.find())?.payments?.gateway;
    return CHOICES.includes(choice) ? choice : 'auto';
}

/** The gateway new checkouts use, or null when none is set up. */
async function active() {
    const ready = available();
    const choice = await chosen();
    if (choice !== 'auto' && ready[choice]) return GATEWAYS[choice];
    if (ready.razorpay) return razorpay;
    if (ready.stripe) return stripe;
    return null;
}

/** The gateway that took a payment (older rows without a method were Stripe). */
const forPayment = (payment) => GATEWAYS[payment?.method] || stripe;

/** For the admin Payments card: which gateways have keys, the choice, and what checkout uses now. */
async function status() {
    const gw = await active();
    return { available: available(), choice: await chosen(), active: gw ? gw.name : null };
}

/** Refunds a completed payment in full through the gateway that took it. */
async function refund(payment) {
    const gw = forPayment(payment);
    if (!gw.configured()) throw new Error(`${gw.label} is no longer set up, so this payment can't be refunded here. Refund it from the ${gw.label} dashboard.`);
    return gw.refund(payment);
}

// Only for tests: swap in a fake gateway API (null restores the real one)
function setTestClient(fake, gateway = 'razorpay') {
    GATEWAYS[gateway].setTestClient(fake);
}

module.exports = { GATEWAYS, CHOICES, available, active, forPayment, status, refund, toMinor, PaymentError, setTestClient };
