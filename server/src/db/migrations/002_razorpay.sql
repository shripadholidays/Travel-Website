-- Payments move from Stripe to Razorpay: the Stripe payment-intent id becomes the gateway order id
-- (older Stripe rows keep their id there), and the Razorpay payment id gets its own column.
ALTER TABLE payments RENAME COLUMN stripe_payment_intent_id TO gateway_order_id;
ALTER TABLE payments ADD COLUMN gateway_payment_id TEXT;
DROP INDEX IF EXISTS payments_intent;
CREATE INDEX payments_gateway_order ON payments (gateway_order_id);

-- The homepage "Secure Booking" card named Stripe; only the untouched default sentence is replaced
UPDATE site_settings SET data = replace(data, 'Payments handled by Stripe, and your booking details in your dashboard.', 'Secure payments by Razorpay (cards, UPI, netbanking), and your booking details in your dashboard.');
