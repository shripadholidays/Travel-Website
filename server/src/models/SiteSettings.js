const mongoose = require('mongoose');

// ── Reusable sub-schemas ──────────────────────────────────────────────────────

const heroSlideSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    color: { type: String, default: 'from-blue-500/80' },
    ctaLink: { type: String, default: '/destinations' },
    ctaLabel: { type: String, default: 'Explore' },
}, { _id: true });

const promoSlideSchema = new mongoose.Schema({
    partner: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    accentColor: { type: String, default: 'text-emerald-400' },
    discount: { type: String, default: '' },   // only shown when a real discount exists
    fromPrice: { type: Number, default: 999 },
    searchQuery: { type: String, default: '' },
}, { _id: true });

const testimonialSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    image: { type: String, default: '' },
    quote: { type: String, default: '' },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    location: { type: String, default: '' },
}, { _id: true });

const faqSchema = new mongoose.Schema({
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
    order: { type: Number, default: 0 },
}, { _id: true });

const planTripStepSchema = new mongoose.Schema({
    icon: { type: String, default: 'Map' },   // lucide icon name
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    link: { type: String, default: '' },     // '' = a sensible page for the step's position
}, { _id: true });

const supportFeatureSchema = new mongoose.Schema({
    icon: { type: String, default: 'Zap' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
}, { _id: true });

const chatMessageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['user', 'assistant'], default: 'assistant' },
    text: { type: String, default: '' },
}, { _id: true });

const aboutStatSchema = new mongoose.Schema({
    value: { type: String, default: '' },
    label: { type: String, default: '' },
}, { _id: true });

const aboutValueSchema = new mongoose.Schema({
    icon: { type: String, default: 'Globe2' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
}, { _id: true });

const navLinkSchema = new mongoose.Schema({
    label: { type: String, default: '' },
    path: { type: String, default: '/' },
    order: { type: Number, default: 0 },
}, { _id: true });

const footerLinkSchema = new mongoose.Schema({
    label: { type: String, default: '' },
    path: { type: String, default: '/' },
}, { _id: true });

// ── Main schema ───────────────────────────────────────────────────────────────

const siteSettingsSchema = new mongoose.Schema({
    // ── Company / Contact ────────────────────────────────────────────────────
    companyName: { type: String, default: 'Wandeazy Travels' },
    contactEmail: { type: String, default: 'hello@wandeazy.com' },
    // No stand-in phone or address: the site hides them until the real ones are entered
    contactPhone: { type: String, default: '' },
    address: { type: String, default: '' },

    // ── Social Links ─────────────────────────────────────────────────────────
    socialLinks: {
        facebook:  { type: String, default: '' },
        instagram: { type: String, default: '' },
        twitter:   { type: String, default: '' },
    },

    // ── Footer ───────────────────────────────────────────────────────────────
    footer: {
        showQuickLinks:  { type: Boolean, default: true },
        showNewsletter:  { type: Boolean, default: true },
        copyrightText:   { type: String,  default: '' },   // '' = "© <this year> <company>. All rights reserved."
    },
    footerExploreLinks: { type: [footerLinkSchema], default: [
        { label: 'Destinations', path: '/destinations' },
        { label: 'Tours',        path: '/tours' },
        { label: 'Collections',  path: '/collections' },
        { label: 'Plan a Custom Trip', path: '/contact?topic=trip' },
    ]},
    footerCompanyLinks: { type: [footerLinkSchema], default: [
        { label: 'About Us',        path: '/about' },
        { label: 'Contact',         path: '/contact' },
        { label: 'Travel Blog',     path: '/blog' },
        { label: 'FAQ',             path: '/faq' },
        { label: 'Privacy Policy',  path: '/privacy' },
    ]},

    // ── Navbar ────────────────────────────────────────────────────────────────
    navLinks: { type: [navLinkSchema], default: [
        { label: 'Destinations', path: '/destinations', order: 0 },
        { label: 'Tours',        path: '/tours',        order: 1 },
        { label: 'Collections',  path: '/collections',  order: 2 },
        { label: 'Magazine',     path: '/blog',         order: 3 },
        { label: 'About',        path: '/about',        order: 4 },
    ]},

    // ── Offer / Announcement Bar ──────────────────────────────────────────────
    offerBar: {
        // Off until there is a real offer to announce
        enabled:       { type: Boolean, default: false },
        badgeLabel:    { type: String,  default: '' },
        text:          { type: String,  default: '' },
        countdownEnd:  { type: Date,    default: null },    // null = no countdown
        gradientFrom:  { type: String,  default: '#f97316' },
        gradientTo:    { type: String,  default: '#e11d48' },
        ctaLink:       { type: String,  default: '' },
        ctaLabel:      { type: String,  default: '' },
    },

    // ── Hero Slides ───────────────────────────────────────────────────────────
    heroSlides: { type: [heroSlideSchema], default: [
        { title: 'Paradise Found',  subtitle: 'Pristine Beaches',  image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop', color: 'from-blue-500/80',    ctaLink: '/tours?category=Beach', ctaLabel: 'Explore Beaches' },
        { title: 'Alpine Peaks',    subtitle: 'Mountain Escapes',  image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop', color: 'from-emerald-600/80', ctaLink: '/tours?category=Trekking', ctaLabel: 'Explore Mountains' },
        { title: 'Urban Lights',    subtitle: 'City Breaks',       image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop', color: 'from-purple-600/80', ctaLink: '/tours?category=City', ctaLabel: 'Explore Cities' },
        { title: 'Golden Sands',    subtitle: 'Desert Safaris',    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=2070&auto=format&fit=crop', color: 'from-orange-600/80', ctaLink: '/tours?q=Dubai', ctaLabel: 'Explore Deserts' },
        { title: 'Deep Wilds',      subtitle: 'Jungle Trekking',   image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop', color: 'from-green-800/80',  ctaLink: '/tours?category=Adventure', ctaLabel: 'Explore Jungles' },
    ]},

    // ── Promotional Carousel ──────────────────────────────────────────────────
    promoSlides: { type: [promoSlideSchema], default: [
        { partner: 'Singapore Tourism', title: 'The Garden City Awaits',      subtitle: 'Experience the magic of Sentosa and the Gardens by the Bay.',      image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1600', accentColor: 'text-emerald-400', discount: '', fromPrice: 1200, searchQuery: 'Singapore' },
        { partner: 'Visit Dubai',       title: 'Golden Sands & Skyscrapers', subtitle: 'Discover the future of luxury in the heart of the desert.',          image: 'https://images.unsplash.com/photo-1603521097795-3b798129197f?q=80&w=1600', accentColor: 'text-amber-400',   discount: '', fromPrice: 1500, searchQuery: 'Dubai' },
        { partner: 'Switzerland Tourism', title: 'Alpine Peaks & Valleys',   subtitle: 'Breathe in the freshest air atop the world\'s most famous mountains.', image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1600', accentColor: 'text-blue-200',    discount: '', fromPrice: 1800, searchQuery: 'Switzerland' },
    ]},

    // ── Plan Trip Steps ───────────────────────────────────────────────────────
    planTrip: {
        heading:    { type: String, default: 'Plan Your Dream Trip' },
        subheading: { type: String, default: 'Easy as 1-2-3-4' },
        steps: { type: [planTripStepSchema], default: [
            { icon: 'Map',          title: 'Pick Destination', description: 'Browse tours and destinations' },
            { icon: 'Calendar',     title: 'Select Dates',     description: 'Pick the dates that suit you' },
            { icon: 'Settings',     title: 'Custom Addons',    description: 'Add extras that suit your trip' },
            { icon: 'CheckCircle2', title: 'Confirm Travel',   description: 'Book securely and get ready to explore' },
        ]},
    },

    // ── Testimonials ──────────────────────────────────────────────────────────
    // Empty by default: the homepage then shows real traveller reviews
    testimonials: { type: [testimonialSchema], default: [] },

    // ── Support / Concierge Section ───────────────────────────────────────────
    supportSection: {
        heading:     { type: String, default: 'You Travel, We Handle The Rest.' },
        subheading:  { type: String, default: 'Support Beyond Booking' },
        paragraph:   { type: String, default: 'From the moment you click book until you\'re back home, our team is a message away.' },
        features: { type: [supportFeatureSchema], default: [
            { icon: 'MessageCircle', title: 'Ask Us Anything',      description: 'Travel queries, visa help or itinerary tweaks: send a message from any page.' },
            { icon: 'Clock',        title: 'Replies Within 24 Hours', description: 'A real travel specialist answers every message, usually the same day.' },
            { icon: 'Route',        title: 'Trips Made to Measure', description: 'Tell us what you love and we will shape an itinerary around it.' },
            { icon: 'ShieldCheck',  title: 'Secure Booking',       description: 'Payments handled by Stripe, and your booking details in your dashboard.' },
        ]},
        // Greeting shown above the live message box on the homepage
        chatMessages: { type: [chatMessageSchema], default: [
            { sender: 'assistant', text: 'Hi! Tell us where you would like to go, or ask anything about a booking. A travel specialist will reply by email.' },
        ]},
    },

    // ── FAQs ──────────────────────────────────────────────────────────────────
    faqs: { type: [faqSchema], default: [
        { question: 'How do I book a tour?',               answer: 'Browse our tours, pick the one you love, choose your travel date and number of guests, then complete the secure checkout. You\'ll receive a confirmation with all your booking details.', order: 0 },
        { question: 'Can I cancel or change my booking?',  answer: 'Yes. Most tours offer free cancellation up to 24 hours before departure. You can cancel directly from your dashboard, and refunds are processed according to each tour\'s cancellation policy.', order: 1 },
        { question: 'What payment methods do you accept?', answer: 'We accept all major credit and debit cards through our secure, PCI-compliant payment provider. Your payment information is encrypted and never stored on our servers.', order: 2 },
        { question: 'Are flights included in the tour price?', answer: 'Unless explicitly stated in the tour inclusions, international flights are not included. Each tour page lists exactly what\'s covered so there are no surprises.', order: 3 },
        { question: 'Do I need travel insurance?',         answer: 'We strongly recommend travel insurance for all trips. While not mandatory, it protects you against unexpected cancellations, medical emergencies, and lost belongings.', order: 4 },
        { question: 'How can I contact support?',          answer: 'Send us a message from the Contact page or the message box on the homepage, or email us. We reply within 24 hours.', order: 5 },
        { question: 'Can you create a custom itinerary?',  answer: 'Absolutely! Head to our Contact page, tell us about your dream trip, and our specialists will craft a personalized itinerary just for you.', order: 6 },
    ]},

    // ── About Page ────────────────────────────────────────────────────────────
    aboutPage: {
        heroImage:       { type: String, default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80' },
        heroHeadline:    { type: String, default: 'We turn wanderlust into unforgettable journeys' },
        heroSubtext:     { type: String, default: 'Wandeazy was born from a simple belief: extraordinary travel should be effortless, personal, and within reach for everyone.' },
        storyParagraph1: { type: String, default: 'What started as a small group of travel obsessives sketching itineraries on napkins has grown into a platform trusted by travelers worldwide. We\'ve walked the trails, tasted the food, and slept under the stars — so we know exactly what makes a trip worth taking.' },
        storyParagraph2: { type: String, default: 'Today, we partner with the best local operators on the planet to bring you experiences that are authentic, responsible, and unforgettable.' },
        // Empty = the About page shows live numbers worked out from real tours, reviews and bookings
        stats: { type: [aboutStatSchema], default: [] },
        values: { type: [aboutValueSchema], default: [
            { icon: 'Globe2',      title: 'Global Reach',            description: 'Hand-picked experiences in destinations around the world.' },
            { icon: 'ShieldCheck', title: 'Travel With Confidence',   description: 'Secure payments, trusted local partners and clear cancellation terms.' },
            { icon: 'Heart',       title: 'Crafted With Care',        description: 'Every itinerary is curated by travel specialists, not algorithms.' },
            { icon: 'Users',       title: 'Real Support',             description: 'A real team that answers every message within 24 hours.' },
        ]},
        ctaHeading:  { type: String, default: 'Ready to start your journey?' },
        ctaSubtext:  { type: String, default: 'Browse our curated tours or tell us about your dream trip — we\'ll handle the rest.' },
        ctaBtn1Label: { type: String, default: 'Explore Tours' },
        ctaBtn1Link:  { type: String, default: '/tours' },
        ctaBtn2Label: { type: String, default: 'Plan My Trip' },
        ctaBtn2Link:  { type: String, default: '/contact' },
    },

    // ── Booking services (admin-only switches) ────────────────────────────────
    // Off by default: when a service is off it does not exist on the public site.
    features: {
        flights: { type: Boolean, default: false },
        hotels:  { type: Boolean, default: false },
    },
    travelMarkup: {
        flightPct: { type: Number, default: 5, min: 0, max: 50 },
        hotelPct:  { type: Number, default: 8, min: 0, max: 50 },
    },

    // ── Content Section Visibility ────────────────────────────────────────────
    contentSections: [{
        sectionId:   { type: String, required: true },
        name:        { type: String, required: true },
        description: String,
        isVisible:   { type: Boolean, default: true },
    }],

}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
