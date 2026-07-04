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
    discount: { type: String, default: 'Save 20%' },
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
    contactPhone: { type: String, default: '+1 (555) 000-0000' },
    address: { type: String, default: '123 Adventure Lane, Wanderlust City, WL 99999' },

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
        copyrightText:   { type: String,  default: '© 2024 Wandeazy Inc. All rights reserved.' },
    },
    footerExploreLinks: { type: [footerLinkSchema], default: [
        { label: 'Destinations', path: '/destinations' },
        { label: 'Tours',        path: '/tours' },
        { label: 'Collections',  path: '/collections' },
        { label: 'Hot Deals',    path: '/tours' },
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
        enabled:       { type: Boolean, default: true },
        badgeLabel:    { type: String,  default: 'Sale' },
        text:          { type: String,  default: 'Winter Sale! Save Up to 40% on Your Next Trip' },
        countdownEnd:  { type: Date,    default: null },    // null = no countdown
        gradientFrom:  { type: String,  default: '#f97316' },
        gradientTo:    { type: String,  default: '#e11d48' },
        ctaLink:       { type: String,  default: '' },
        ctaLabel:      { type: String,  default: '' },
    },

    // ── Hero Slides ───────────────────────────────────────────────────────────
    heroSlides: { type: [heroSlideSchema], default: [
        { title: 'Paradise Found',  subtitle: 'Pristine Beaches',  image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop', color: 'from-blue-500/80',    ctaLink: '/destinations', ctaLabel: 'Explore Beaches' },
        { title: 'Alpine Peaks',    subtitle: 'Mountain Escapes',  image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop', color: 'from-emerald-600/80', ctaLink: '/destinations', ctaLabel: 'Explore Mountains' },
        { title: 'Urban Lights',    subtitle: 'City Breaks',       image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop', color: 'from-purple-600/80', ctaLink: '/destinations', ctaLabel: 'Explore Cities' },
        { title: 'Golden Sands',    subtitle: 'Desert Safaris',    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=2070&auto=format&fit=crop', color: 'from-orange-600/80', ctaLink: '/destinations', ctaLabel: 'Explore Deserts' },
        { title: 'Deep Wilds',      subtitle: 'Jungle Trekking',   image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop', color: 'from-green-800/80',  ctaLink: '/destinations', ctaLabel: 'Explore Jungles' },
    ]},

    // ── Promotional Carousel ──────────────────────────────────────────────────
    promoSlides: { type: [promoSlideSchema], default: [
        { partner: 'Singapore Tourism', title: 'The Garden City Awaits',      subtitle: 'Experience the magic of Sentosa and the Gardens by the Bay.',      image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1600', accentColor: 'text-emerald-400', discount: 'Save 25%', fromPrice: 1200, searchQuery: 'Singapore' },
        { partner: 'Visit Dubai',       title: 'Golden Sands & Skyscrapers', subtitle: 'Discover the future of luxury in the heart of the desert.',          image: 'https://images.unsplash.com/photo-1603521097795-3b798129197f?q=80&w=1600', accentColor: 'text-amber-400',   discount: 'Save 30%', fromPrice: 1500, searchQuery: 'Dubai' },
        { partner: 'Switzerland Tourism', title: 'Alpine Peaks & Valleys',   subtitle: 'Breathe in the freshest air atop the world\'s most famous mountains.', image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1600', accentColor: 'text-blue-200',    discount: 'Save 20%', fromPrice: 1800, searchQuery: 'Switzerland' },
    ]},

    // ── Plan Trip Steps ───────────────────────────────────────────────────────
    planTrip: {
        heading:    { type: String, default: 'Plan Your Dream Trip' },
        subheading: { type: String, default: 'Easy as 1-2-3-4' },
        steps: { type: [planTripStepSchema], default: [
            { icon: 'Map',          title: 'Pick Destination', description: 'Choose from 100+ locations' },
            { icon: 'Calendar',     title: 'Select Dates',     description: 'When do you want to fly?' },
            { icon: 'Settings',     title: 'Custom Addons',    description: 'Hotels, flights, & activities' },
            { icon: 'CheckCircle2', title: 'Confirm Travel',   description: 'Get ready to explore!' },
        ]},
    },

    // ── Testimonials ──────────────────────────────────────────────────────────
    testimonials: { type: [testimonialSchema], default: [
        { name: 'Sarah Johnson', role: 'Adventure Enthusiast', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200', quote: 'Wandeazy made my trip to Bali absolutely unforgettable. The curated experiences were top-notch!', rating: 5, location: 'Bali, Indonesia' },
        { name: 'Michael Chen',  role: 'Travel Photographer',  image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', quote: 'As a photographer, I look for unique spots. Their guides knew exactly where to take me for the perfect shot.', rating: 5, location: 'Kyoto, Japan' },
        { name: 'Emma Watson',   role: 'Solo Traveler',        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200', quote: 'I felt so safe and well-cared for. If you\'re traveling solo, this is the agency to book with.', rating: 5, location: 'Swiss Alps' },
        { name: 'David Miller',  role: 'Family Vacation',      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200', quote: 'Planning a trip for 5 people is a nightmare, but Wandeazy handled everything perfectly.', rating: 5, location: 'Paris, France' },
        { name: 'Lisa Wong',     role: 'Foodie',               image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200', quote: 'The culinary tour they organized was beyond my expectations. Authentic flavors every step of the way.', rating: 4, location: 'Bangkok, Thailand' },
        { name: 'James Wilson',  role: 'Hiker',                image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200', quote: 'The trekking guides were professional and fun. Machu Picchu was a dream come true.', rating: 5, location: 'Cusco, Peru' },
    ]},

    // ── Support / Concierge Section ───────────────────────────────────────────
    supportSection: {
        heading:     { type: String, default: 'You Travel, We Handle The Rest.' },
        subheading:  { type: String, default: 'Support Beyond Booking' },
        paragraph:   { type: String, default: 'From the moment you click book until you\'re back home, our dedicated team acts as your personal travel concierge 24/7.' },
        features: { type: [supportFeatureSchema], default: [
            { icon: 'Zap',          title: 'Instant Answers',      description: 'Travel queries, visa help, or itinerary tweaks — get assistance anytime, anywhere.' },
            { icon: 'Headphones',   title: '24/7 Priority Support', description: 'Chat or call — we\'re always instantly available when you\'re traveling.' },
            { icon: 'MessageCircle', title: 'On-the-Go Replans',   description: 'Weather updates, activity swaps, and real-time confirmations on the fly.' },
            { icon: 'ShieldCheck',  title: 'Trusted by Thousands', description: '3M+ happy explorers • 97% satisfaction • 4.8★ average rating.' },
        ]},
        chatMessages: { type: [chatMessageSchema], default: [
            { sender: 'assistant', text: 'Hi! I\'m your Wandeazy travel assistant. How can I help today?' },
            { sender: 'user',      text: 'I booked a Bali trip but haven\'t received my flight confirmation.' },
            { sender: 'assistant', text: 'Let me quickly check that for you. Could you share your booking ID?' },
            { sender: 'user',      text: 'It\'s WD-983245. Paid last week.' },
            { sender: 'assistant', text: 'Found it! Your flight is confirmed. The updated itinerary has been sent to your email and WhatsApp.' },
        ]},
    },

    // ── FAQs ──────────────────────────────────────────────────────────────────
    faqs: { type: [faqSchema], default: [
        { question: 'How do I book a tour?',               answer: 'Browse our tours, pick the one you love, choose your travel date and number of guests, then complete the secure checkout. You\'ll receive a confirmation with all your booking details.', order: 0 },
        { question: 'Can I cancel or change my booking?',  answer: 'Yes. Most tours offer free cancellation up to 24 hours before departure. You can cancel directly from your dashboard, and refunds are processed according to each tour\'s cancellation policy.', order: 1 },
        { question: 'What payment methods do you accept?', answer: 'We accept all major credit and debit cards through our secure, PCI-compliant payment provider. Your payment information is encrypted and never stored on our servers.', order: 2 },
        { question: 'Are flights included in the tour price?', answer: 'Unless explicitly stated in the tour inclusions, international flights are not included. Each tour page lists exactly what\'s covered so there are no surprises.', order: 3 },
        { question: 'Do I need travel insurance?',         answer: 'We strongly recommend travel insurance for all trips. While not mandatory, it protects you against unexpected cancellations, medical emergencies, and lost belongings.', order: 4 },
        { question: 'How can I contact support?',          answer: 'Our team is available around the clock. Reach out through our Contact page or email, and we\'ll get back to you within 24 hours.', order: 5 },
        { question: 'Can you create a custom itinerary?',  answer: 'Absolutely! Head to our Contact page, tell us about your dream trip, and our specialists will craft a personalized itinerary just for you.', order: 6 },
    ]},

    // ── About Page ────────────────────────────────────────────────────────────
    aboutPage: {
        heroImage:       { type: String, default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80' },
        heroHeadline:    { type: String, default: 'We turn wanderlust into unforgettable journeys' },
        heroSubtext:     { type: String, default: 'Wandeazy was born from a simple belief: extraordinary travel should be effortless, personal, and within reach for everyone.' },
        storyParagraph1: { type: String, default: 'What started as a small group of travel obsessives sketching itineraries on napkins has grown into a platform trusted by travelers worldwide. We\'ve walked the trails, tasted the food, and slept under the stars — so we know exactly what makes a trip worth taking.' },
        storyParagraph2: { type: String, default: 'Today, we partner with the best local operators on the planet to bring you experiences that are authentic, responsible, and unforgettable.' },
        stats: { type: [aboutStatSchema], default: [
            { value: '120k+', label: 'Happy travelers' },
            { value: '500+',  label: 'Curated tours' },
            { value: '50+',   label: 'Destinations' },
            { value: '4.9/5', label: 'Average rating' },
        ]},
        values: { type: [aboutValueSchema], default: [
            { icon: 'Globe2',      title: 'Global Reach',            description: 'Hand-picked experiences across 50+ countries and counting.' },
            { icon: 'ShieldCheck', title: 'Travel With Confidence',   description: 'Secure payments, verified partners, and free cancellation on most tours.' },
            { icon: 'Heart',       title: 'Crafted With Care',        description: 'Every itinerary is curated by travel specialists, not algorithms.' },
            { icon: 'Users',       title: 'Real Support',             description: 'A dedicated team available around the clock, wherever you roam.' },
        ]},
        ctaHeading:  { type: String, default: 'Ready to start your journey?' },
        ctaSubtext:  { type: String, default: 'Browse our curated tours or tell us about your dream trip — we\'ll handle the rest.' },
        ctaBtn1Label: { type: String, default: 'Explore Tours' },
        ctaBtn1Link:  { type: String, default: '/tours' },
        ctaBtn2Label: { type: String, default: 'Plan My Trip' },
        ctaBtn2Link:  { type: String, default: '/contact' },
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
