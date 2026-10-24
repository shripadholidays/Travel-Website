-- WandEazy schema, first version (moved from MongoDB to Turso / libSQL).
-- Ids are 24-character hex strings (the same shape as the old MongoDB ids).
-- Dates are ISO-8601 UTC text, booleans are 0/1, lists and nested objects are JSON text.
-- References are plain id columns: the app keeps them consistent (tours with bookings are
-- hidden instead of deleted, accounts with bookings are suspended instead of deleted).

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    display_name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    auth_provider TEXT,
    profile_picture TEXT,
    role TEXT,
    is_suspended INTEGER,
    is_email_verified INTEGER,
    email_verification_token TEXT,
    email_verification_token_expiry TEXT,
    reset_password_token TEXT,
    reset_password_expiry TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE tours (
    id TEXT PRIMARY KEY,
    title TEXT,
    location TEXT,
    price REAL,
    currency TEXT,
    price_usd REAL,
    duration_days INTEGER,
    duration_nights INTEGER,
    validity TEXT,
    inclusions TEXT,
    itinerary TEXT,
    image_url TEXT,
    images TEXT,
    categories TEXT,
    emi TEXT,
    overview_about TEXT,
    overview_gallery TEXT,
    reviews_rating REAL,
    reviews_based_on INTEGER,
    reviews_individual_reviews TEXT,
    max_group_size INTEGER,
    is_featured INTEGER,
    status TEXT,
    coordinates_lat REAL,
    coordinates_lng REAL,
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    tour_id TEXT,
    travel_date TEXT,
    number_of_travelers INTEGER,
    contact_info_first_name TEXT,
    contact_info_last_name TEXT,
    contact_info_email TEXT,
    contact_info_phone TEXT,
    addons TEXT,
    subtotal_amount REAL,
    coupon TEXT,
    total_amount REAL,
    currency TEXT,
    unit_price REAL,
    tour_currency TEXT,
    exchange_rate REAL,
    base_currency TEXT,
    base_amount REAL,
    status TEXT,
    payment_id TEXT,
    special_requests TEXT,
    cancelled_at TEXT,
    refunded_amount REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE destinations (
    id TEXT PRIMARY KEY,
    name TEXT,
    slug TEXT UNIQUE,
    country TEXT,
    continent TEXT,
    description TEXT,
    cover_image TEXT,
    images TEXT,
    highlights TEXT,
    best_time_to_visit TEXT,
    coordinates_lat REAL,
    coordinates_lng REAL,
    tour_count INTEGER,
    rating REAL,
    is_active INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT,
    slug TEXT UNIQUE,
    description TEXT,
    cover_image TEXT,
    tours TEXT,
    is_active INTEGER,
    display_order INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    tour_id TEXT,
    user_id TEXT,
    rating INTEGER,
    title TEXT,
    content TEXT,
    is_verified_booking INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE blog_posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    slug TEXT UNIQUE,
    content TEXT,
    excerpt TEXT,
    author_id TEXT,
    cover_image TEXT,
    tags TEXT,
    status TEXT,
    review_note TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    order_id TEXT,
    user_id TEXT,
    amount REAL,
    currency TEXT,
    method TEXT,
    stripe_payment_intent_id TEXT,
    status TEXT,
    gateway_response TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE travel_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT,
    linked_booking_id TEXT,
    provider TEXT,
    provider_ref TEXT,
    offer_id TEXT,
    status TEXT,
    offer TEXT,
    travellers TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    pricing TEXT,
    charge TEXT,
    payment_id TEXT,
    failure_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    discount_type TEXT,
    discount_value REAL,
    currency TEXT,
    min_order_amount REAL,
    max_uses INTEGER,
    used_count INTEGER,
    expires_at TEXT,
    is_active INTEGER,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE inquiries (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    preferred_travel_date TEXT,
    number_of_travelers INTEGER,
    topic TEXT,
    context TEXT,
    source TEXT,
    message TEXT,
    status TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    action TEXT,
    resource TEXT,
    resource_id TEXT,
    label TEXT,
    detail TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE wishlists (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    tours TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE newsletter_subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- One row (id = 1) holding the site's settings and page content as JSON
CREATE TABLE site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX users_role ON users (role);
CREATE INDEX tours_status_rating ON tours (status, reviews_rating DESC);
CREATE INDEX tours_price_usd ON tours (price_usd);
CREATE INDEX tours_featured ON tours (is_featured, status);
CREATE INDEX tours_validity ON tours (validity);
CREATE INDEX tours_updated ON tours (updated_at DESC);
CREATE INDEX bookings_user_created ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_status_created ON bookings (status, created_at DESC);
CREATE INDEX bookings_tour ON bookings (tour_id);
CREATE INDEX destinations_active ON destinations (is_active, name);
CREATE INDEX collections_active_order ON collections (is_active, display_order);
CREATE UNIQUE INDEX reviews_user_tour ON reviews (user_id, tour_id);
CREATE INDEX reviews_tour_created ON reviews (tour_id, created_at DESC);
CREATE INDEX blog_posts_status ON blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_author ON blog_posts (author_id);
CREATE INDEX payments_intent ON payments (stripe_payment_intent_id);
CREATE INDEX payments_status ON payments (status, created_at DESC);
CREATE INDEX payments_user ON payments (user_id);
CREATE INDEX travel_orders_user_created ON travel_orders (user_id, created_at DESC);
CREATE INDEX travel_orders_kind_status ON travel_orders (kind, status);
CREATE INDEX coupons_active ON coupons (is_active, expires_at);
CREATE INDEX inquiries_status_created ON inquiries (status, created_at DESC);
CREATE INDEX activity_log_created ON activity_log (created_at DESC);
CREATE INDEX activity_log_resource ON activity_log (resource, created_at DESC);
CREATE INDEX activity_log_actor ON activity_log (actor_id);
