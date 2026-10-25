-- Razorpay and Stripe both stay available (Admin → Settings → Payments picks one), so the homepage
-- "Secure Booking" card names neither; only the untouched default sentence is replaced.
UPDATE site_settings SET data = replace(data, 'Secure payments by Razorpay (cards, UPI, netbanking), and your booking details in your dashboard.', 'Secure card, UPI and netbanking payments, and your booking details in your dashboard.');
