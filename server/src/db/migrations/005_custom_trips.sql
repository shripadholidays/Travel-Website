-- Trips travellers put together themselves in the trip builder. The team sends a final
-- price (quote) for each one; until then the traveller sees the builder's price range.
CREATE TABLE custom_trips (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    title TEXT,
    start_date TEXT,
    adults INTEGER,
    children INTEGER,
    hotel_class TEXT,
    stops TEXT,
    extras TEXT,
    notes TEXT,
    based_on TEXT,
    estimate TEXT,
    status TEXT,
    quote REAL,
    quote_note TEXT,
    staff_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX custom_trips_status_updated ON custom_trips (status, updated_at DESC);
CREATE INDEX custom_trips_user ON custom_trips (user_id, created_at DESC);
