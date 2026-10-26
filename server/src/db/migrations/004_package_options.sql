-- Packages sold in several lengths and hotel classes: the choices live on the tour, and each
-- booking keeps the length and hotel class the traveller picked (and was charged for).
ALTER TABLE tours ADD COLUMN package_options TEXT;
ALTER TABLE tours ADD COLUMN best_time TEXT;
ALTER TABLE bookings ADD COLUMN package_choice TEXT;
