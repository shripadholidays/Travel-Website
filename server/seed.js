/**
 * Database Seed Script
 * Run: node seed.js
 * Seeds: Tours, Destinations, Collections, Blog Posts, Reviews, Site Settings
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { recomputeAllTourRatings } = require('./src/services/rating-service');
const TravelDestination = require('./src/models/TravelDestination');
const Destination = require('./src/models/Destination');
const Collection = require('./src/models/Collection');
const BlogPost = require('./src/models/BlogPost');
const Review = require('./src/models/Review');
const User = require('./src/models/User');
const SiteSettings = require('./src/models/SiteSettings');

const PLACEHOLDER = 'https://images.unsplash.com/photo-';

const TOUR_IMAGES = {
    himalaya: `${PLACEHOLDER}1544735716-392fe2489ffa?w=800`,
    bali: `${PLACEHOLDER}1537996194471-e657df975ab4?w=800`,
    paris: `${PLACEHOLDER}1502602898657-3e91760cbb34?w=800`,
    dubai: `${PLACEHOLDER}1603521097795-3b798129197f?w=800`,
    maldives: `${PLACEHOLDER}1514282401047-d79a71a590e8?w=800`,
    tokyo: `${PLACEHOLDER}1540959733332-eab4deabeeaf?w=800`,
    safari: `${PLACEHOLDER}1516426122078-c23e76319801?w=800`,
    switzerland: `${PLACEHOLDER}1530122037265-a5f1f91d3b99?w=800`,
    rome: `${PLACEHOLDER}1552832230-c0197dd311b5?w=800`,
    newYork: `${PLACEHOLDER}1496442226666-8d4d0e62e6e9?w=800`,
    iceland: `${PLACEHOLDER}1491466424936-e304919aada7?w=800`,
    thailand: `${PLACEHOLDER}1528181304800-259b08848526?w=800`,
};

// Extra photos for tour galleries
const EXTRA_IMAGES = {
    himalaya: [`${PLACEHOLDER}1464822759023-fed622ff2c3b?w=1200`],
    bali: [`${PLACEHOLDER}1584132967334-10e028bd69f7?w=1200`],
    paris: [`${PLACEHOLDER}1431274172761-fca41d930114?w=1200`],
    dubai: [`${PLACEHOLDER}1512453979798-5ea266f8880c?w=1200`, `${PLACEHOLDER}1509316975850-ff9c5deb0cd9?w=1200`],
    maldives: [`${PLACEHOLDER}1507525428034-b723cf961d3e?w=1200`],
    switzerland: [`${PLACEHOLDER}1464822759023-fed622ff2c3b?w=1200`],
    thailand: [`${PLACEHOLDER}1508009603885-50cf7c579365?w=1200`],
};

const DEST_IMAGES = {
    india: `${PLACEHOLDER}1524492412937-b28074a5d7da?w=800`,
    indonesia: `${PLACEHOLDER}1537996194471-e657df975ab4?w=800`,
    france: `${PLACEHOLDER}1431274172761-fca41d930114?w=800`,
    uae: `${PLACEHOLDER}1663768266259-d723cfbe969b?w=800`,
    maldives: `${PLACEHOLDER}1514282401047-d79a71a590e8?w=800`,
    japan: `${PLACEHOLDER}1540959733332-eab4deabeeaf?w=800`,
    kenya: `${PLACEHOLDER}1516426122078-c23e76319801?w=800`,
    switzerland: `${PLACEHOLDER}1530122037265-a5f1f91d3b99?w=800`,
    italy: `${PLACEHOLDER}1552832230-c0197dd311b5?w=800`,
    iceland: `${PLACEHOLDER}1491466424936-e304919aada7?w=800`,
};

const BLOG_IMAGES = {
    packing: `${PLACEHOLDER}1553062407-98eeb64c6a62?w=800`,
    budget: `${PLACEHOLDER}1488646953014-85cb44e25828?w=800`,
    solo: `${PLACEHOLDER}1501555088652-021faa106b9b?w=800`,
    food: `${PLACEHOLDER}1414235077428-338989a2e8c0?w=800`,
};

// ─── TOURS ────────────────────────────────────────────
const tours = [
    {
        title: 'Majestic Himalayan Trek',
        location: 'Nepal, Asia',
        price: 850,
        currency: '$',
        duration: { days: 7, nights: 6 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.himalaya,
        images: [TOUR_IMAGES.himalaya, ...EXTRA_IMAGES.himalaya],
        categories: ['Adventure', 'Trekking', 'Nature'],
        inclusions: [
            { title: 'Professional mountain guide', included: true },
            { title: 'All meals during trek', included: true },
            { title: 'Camping equipment', included: true },
            { title: 'Porter service', included: true },
            { title: 'International flights', included: false },
            { title: 'Travel insurance', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Kathmandu. Transfer to hotel. Welcome dinner and trek briefing.', location: 'Kathmandu' },
            { day: 2, activity: 'Fly to Lukla. Trek to Phakding through lush forests.', location: 'Lukla - Phakding' },
            { day: 3, activity: 'Trek along the Dudh Kosi river to Namche Bazaar.', location: 'Namche Bazaar' },
            { day: 4, activity: 'Acclimatization day. Visit Everest View Hotel and Sherpa museum.', location: 'Namche Bazaar' },
            { day: 5, activity: 'Trek to Tengboche. Visit the famous Buddhist monastery.', location: 'Tengboche' },
            { day: 6, activity: 'Trek to Dingboche with views of Ama Dablam and Lhotse.', location: 'Dingboche' },
            { day: 7, activity: 'Return trek to Lukla. Farewell dinner and cultural show.', location: 'Lukla' },
        ],
        overview: {
            about: 'Embark on a breathtaking journey through the Himalayas on this 7-day guided trek. Experience stunning mountain vistas, ancient Buddhist monasteries, and the warm hospitality of Sherpa communities. This moderate-difficulty trek takes you through some of the most spectacular scenery on Earth, with views of Everest, Lhotse, and Ama Dablam.',
            gallery: [{ imageURL: TOUR_IMAGES.himalaya, altText: 'Himalayan peaks at sunrise' }],
        },
        reviews: { rating: 4.8, basedOn: 124, individualReviews: [] },
    },
    {
        title: 'Bali Paradise Escape',
        location: 'Bali, Indonesia',
        price: 1200,
        currency: '$',
        duration: { days: 5, nights: 4 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.bali,
        images: [TOUR_IMAGES.bali, ...EXTRA_IMAGES.bali],
        categories: ['Beach', 'Relaxation', 'Culture'],
        inclusions: [
            { title: 'Luxury villa accommodation', included: true },
            { title: 'Daily breakfast & 2 dinners', included: true },
            { title: 'Temple tour with guide', included: true },
            { title: 'Spa treatment', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Denpasar. Transfer to beachfront villa. Sunset welcome cocktail.', location: 'Seminyak' },
            { day: 2, activity: 'Morning yoga. Visit Tanah Lot temple. Afternoon surfing lesson.', location: 'Tanah Lot' },
            { day: 3, activity: 'Ubud rice terraces. Monkey Forest. Traditional dance performance.', location: 'Ubud' },
            { day: 4, activity: 'Nusa Penida day trip. Snorkeling with manta rays. Kelingking Beach.', location: 'Nusa Penida' },
            { day: 5, activity: 'Free morning for spa. Airport transfer.', location: 'Seminyak' },
        ],
        overview: {
            about: 'Discover the magic of Bali on this 5-day luxury escape. From ancient temples to pristine beaches, rice terraces to vibrant nightlife, experience the Island of the Gods in ultimate comfort. Includes a full-day trip to the stunning Nusa Penida island.',
            gallery: [{ imageURL: TOUR_IMAGES.bali, altText: 'Bali rice terraces' }],
        },
        reviews: { rating: 4.9, basedOn: 89, individualReviews: [] },
    },
    {
        title: 'Romantic Paris Getaway',
        location: 'Paris, France',
        price: 1800,
        currency: '$',
        duration: { days: 4, nights: 3 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.paris,
        images: [TOUR_IMAGES.paris, ...EXTRA_IMAGES.paris],
        categories: ['City', 'Romance', 'Culture'],
        inclusions: [
            { title: 'Boutique hotel near Champs-Élysées', included: true },
            { title: 'Skip-the-line Eiffel Tower tickets', included: true },
            { title: 'Seine river cruise dinner', included: true },
            { title: 'Louvre Museum guided tour', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Paris. Check in. Evening stroll along Champs-Élysées and Arc de Triomphe.', location: 'Paris Centre' },
            { day: 2, activity: 'Eiffel Tower morning visit. Louvre Museum guided tour. Tuileries Garden.', location: 'Central Paris' },
            { day: 3, activity: 'Montmartre walking tour. Sacré-Cœur. Seine dinner cruise.', location: 'Montmartre' },
            { day: 4, activity: 'Versailles Palace half-day trip. Departure.', location: 'Versailles' },
        ],
        overview: {
            about: 'Fall in love with the City of Light on this 4-day romantic escape. Enjoy skip-the-line access to iconic landmarks, a magical dinner cruise on the Seine, and the charm of Parisian neighborhoods. Perfect for couples and first-time visitors alike.',
            gallery: [{ imageURL: TOUR_IMAGES.paris, altText: 'Eiffel Tower at sunset' }],
        },
        reviews: { rating: 4.7, basedOn: 203, individualReviews: [] },
    },
    {
        title: 'Dubai Luxury Experience',
        location: 'Dubai, UAE',
        price: 2500,
        currency: '$',
        duration: { days: 5, nights: 4 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.dubai,
        images: [TOUR_IMAGES.dubai, ...EXTRA_IMAGES.dubai],
        categories: ['Luxury', 'City', 'Adventure'],
        inclusions: [
            { title: '5-star hotel accommodation', included: true },
            { title: 'Desert safari with BBQ dinner', included: true },
            { title: 'Burj Khalifa observation deck', included: true },
            { title: 'Dhow cruise dinner', included: true },
            { title: 'Abu Dhabi day trip', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Dubai. Check in to 5-star hotel. Evening at Dubai Marina.', location: 'Dubai Marina' },
            { day: 2, activity: 'Burj Khalifa. Dubai Mall. Dubai Fountain show. Souk Madinat.', location: 'Downtown Dubai' },
            { day: 3, activity: 'Desert safari. Dune bashing. Camel ride. BBQ dinner under stars.', location: 'Arabian Desert' },
            { day: 4, activity: 'Abu Dhabi day trip. Sheikh Zayed Mosque. Louvre Abu Dhabi.', location: 'Abu Dhabi' },
            { day: 5, activity: 'Gold Souk shopping. Dhow cruise dinner. Departure.', location: 'Old Dubai' },
        ],
        overview: {
            about: 'Experience the opulence of Dubai on this 5-day luxury tour. From the world\'s tallest building to the vast Arabian Desert, from traditional souks to ultra-modern malls, discover why Dubai is the ultimate luxury destination.',
            gallery: [{ imageURL: TOUR_IMAGES.dubai, altText: 'Dubai skyline' }],
        },
        reviews: { rating: 4.6, basedOn: 156, individualReviews: [] },
    },
    {
        title: 'Maldives Island Retreat',
        location: 'Maldives',
        price: 3200,
        currency: '$',
        duration: { days: 6, nights: 5 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.maldives,
        images: [TOUR_IMAGES.maldives, ...EXTRA_IMAGES.maldives],
        categories: ['Beach', 'Luxury', 'Honeymoon'],
        inclusions: [
            { title: 'Overwater villa accommodation', included: true },
            { title: 'All-inclusive meals', included: true },
            { title: 'Snorkeling equipment', included: true },
            { title: 'Sunset dolphin cruise', included: true },
            { title: 'Spa session for two', included: true },
            { title: 'Seaplane transfers', included: true },
            { title: 'International flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Malé. Seaplane transfer to resort. Welcome cocktail.', location: 'Resort Island' },
            { day: 2, activity: 'Morning snorkeling at house reef. Afternoon spa. Sunset cruise.', location: 'Resort Island' },
            { day: 3, activity: 'Dolphin watching excursion. Underwater restaurant dinner.', location: 'Open Ocean' },
            { day: 4, activity: 'Island hopping. Local village visit. Night fishing.', location: 'Nearby Islands' },
            { day: 5, activity: 'Free day. Water sports. Couples spa. Beach dinner.', location: 'Resort Island' },
            { day: 6, activity: 'Sunrise yoga. Departure transfer.', location: 'Malé' },
        ],
        overview: {
            about: 'Escape to paradise in the Maldives. Stay in a stunning overwater villa surrounded by crystal-clear turquoise waters. This all-inclusive retreat features world-class dining, spa treatments, and marine adventures. The ultimate honeymoon or anniversary getaway.',
            gallery: [{ imageURL: TOUR_IMAGES.maldives, altText: 'Maldives overwater villa' }],
        },
        reviews: { rating: 4.9, basedOn: 67, individualReviews: [] },
    },
    {
        title: 'Discover Tokyo',
        location: 'Tokyo, Japan',
        price: 1500,
        currency: '$',
        duration: { days: 6, nights: 5 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.tokyo,
        images: [TOUR_IMAGES.tokyo],
        categories: ['City', 'Culture', 'Food'],
        inclusions: [
            { title: 'Hotel in Shinjuku', included: true },
            { title: '7-day Japan Rail Pass', included: true },
            { title: 'Guided city tour', included: true },
            { title: 'Sushi-making class', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Tokyo. Check in. Explore Shinjuku nightlife.', location: 'Shinjuku' },
            { day: 2, activity: 'Tsukiji Outer Market. Meiji Shrine. Harajuku. Shibuya Crossing.', location: 'Central Tokyo' },
            { day: 3, activity: 'Day trip to Mt. Fuji and Hakone. Hot spring experience.', location: 'Hakone' },
            { day: 4, activity: 'Akihabara. TeamLab Borderless. Odaiba. Ramen street.', location: 'East Tokyo' },
            { day: 5, activity: 'Asakusa. Senso-ji Temple. Sushi-making class. Sumida River cruise.', location: 'Asakusa' },
            { day: 6, activity: 'Free morning for shopping. Departure.', location: 'Tokyo' },
        ],
        overview: {
            about: 'Immerse yourself in the electrifying energy of Tokyo. This 6-day tour blends ancient traditions with cutting-edge modernity. From serene temples to neon-lit streets, traditional tea ceremonies to robot restaurants, discover why Tokyo is one of the world\'s most fascinating cities.',
            gallery: [{ imageURL: TOUR_IMAGES.tokyo, altText: 'Tokyo at night' }],
        },
        reviews: { rating: 4.8, basedOn: 178, individualReviews: [] },
    },
    {
        title: 'African Safari Adventure',
        location: 'Masai Mara, Kenya',
        price: 2800,
        currency: '$',
        duration: { days: 7, nights: 6 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.safari,
        images: [TOUR_IMAGES.safari],
        categories: ['Adventure', 'Wildlife', 'Nature'],
        inclusions: [
            { title: 'Safari lodge accommodation', included: true },
            { title: 'All game drives with 4x4', included: true },
            { title: 'Park entry fees', included: true },
            { title: 'All meals', included: true },
            { title: 'Domestic flights', included: true },
            { title: 'International flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Nairobi. Transfer to lodge. Evening game drive.', location: 'Nairobi' },
            { day: 2, activity: 'Full-day Masai Mara game drive. Big Five spotting.', location: 'Masai Mara' },
            { day: 3, activity: 'Hot air balloon safari at dawn. Maasai village visit.', location: 'Masai Mara' },
            { day: 4, activity: 'Transfer to Lake Nakuru. Flamingo and rhino spotting.', location: 'Lake Nakuru' },
            { day: 5, activity: 'Amboseli National Park. Views of Kilimanjaro.', location: 'Amboseli' },
            { day: 6, activity: 'Full-day game drive. Sunset photography session.', location: 'Amboseli' },
            { day: 7, activity: 'Morning game drive. Return to Nairobi. Departure.', location: 'Nairobi' },
        ],
        overview: {
            about: 'Witness the raw beauty of African wildlife on this 7-day safari through Kenya\'s most iconic national parks. See the Big Five in their natural habitat, float over the Masai Mara in a hot air balloon, and experience authentic Maasai culture.',
            gallery: [{ imageURL: TOUR_IMAGES.safari, altText: 'Safari sunset' }],
        },
        reviews: { rating: 4.9, basedOn: 92, individualReviews: [] },
    },
    {
        title: 'Swiss Alps Explorer',
        location: 'Switzerland',
        price: 2200,
        currency: '$',
        duration: { days: 6, nights: 5 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.switzerland,
        images: [TOUR_IMAGES.switzerland, ...EXTRA_IMAGES.switzerland],
        categories: ['Adventure', 'Nature', 'Scenic'],
        inclusions: [
            { title: 'Mountain hotel accommodation', included: true },
            { title: 'Swiss Travel Pass (6 days)', included: true },
            { title: 'Guided mountain hike', included: true },
            { title: 'Chocolate factory tour', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Zurich. Train to Interlaken. Evening lake walk.', location: 'Interlaken' },
            { day: 2, activity: 'Jungfraujoch — Top of Europe. Aletsch Glacier viewpoint.', location: 'Jungfrau Region' },
            { day: 3, activity: 'Grindelwald First cliff walk. Paragliding optional. Fondue dinner.', location: 'Grindelwald' },
            { day: 4, activity: 'Scenic train to Lucerne. Chapel Bridge. Lion Monument. Lake cruise.', location: 'Lucerne' },
            { day: 5, activity: 'Mt. Pilatus cable car. Chocolate factory tour. Farewell dinner.', location: 'Lucerne' },
            { day: 6, activity: 'Transfer to Zurich airport. Departure.', location: 'Zurich' },
        ],
        overview: {
            about: 'Experience the breathtaking beauty of the Swiss Alps on this 6-day explorer tour. Ride scenic trains through stunning mountain passes, visit the Top of Europe at Jungfraujoch, cruise pristine lakes, and indulge in Swiss chocolate and cheese.',
            gallery: [{ imageURL: TOUR_IMAGES.switzerland, altText: 'Swiss Alps panorama' }],
        },
        reviews: { rating: 4.7, basedOn: 134, individualReviews: [] },
    },
    {
        title: 'Ancient Rome & Amalfi Coast',
        location: 'Rome, Italy',
        price: 1900,
        currency: '$',
        duration: { days: 7, nights: 6 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.rome,
        images: [TOUR_IMAGES.rome],
        categories: ['Culture', 'History', 'Food'],
        inclusions: [
            { title: 'Boutique hotel accommodation', included: true },
            { title: 'Skip-the-line Colosseum & Vatican', included: true },
            { title: 'Cooking class in Rome', included: true },
            { title: 'Amalfi Coast boat tour', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Rome. Walking tour of Trastevere. Welcome dinner.', location: 'Rome' },
            { day: 2, activity: 'Colosseum. Roman Forum. Palatine Hill. Pasta-making class.', location: 'Rome' },
            { day: 3, activity: 'Vatican Museums. Sistine Chapel. St. Peter\'s Basilica.', location: 'Vatican City' },
            { day: 4, activity: 'Train to Naples. Pompeii ruins guided tour. Transfer to Amalfi.', location: 'Pompeii' },
            { day: 5, activity: 'Amalfi Coast boat tour. Positano. Ravello. Limoncello tasting.', location: 'Amalfi Coast' },
            { day: 6, activity: 'Free day in Amalfi. Beach time. Local market.', location: 'Amalfi' },
            { day: 7, activity: 'Return to Rome. Trevi Fountain. Spanish Steps. Departure.', location: 'Rome' },
        ],
        overview: {
            about: 'Journey through Italy\'s most iconic destinations. Explore ancient Roman ruins, marvel at Renaissance masterpieces in the Vatican, and cruise the stunning Amalfi Coast. This tour combines history, art, cuisine, and coastal beauty for the ultimate Italian experience.',
            gallery: [{ imageURL: TOUR_IMAGES.rome, altText: 'Roman Colosseum' }],
        },
        reviews: { rating: 4.8, basedOn: 167, individualReviews: [] },
    },
    {
        title: 'New York City Break',
        location: 'New York, USA',
        price: 1400,
        currency: '$',
        duration: { days: 4, nights: 3 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.newYork,
        images: [TOUR_IMAGES.newYork],
        categories: ['City', 'Culture', 'Food'],
        inclusions: [
            { title: 'Manhattan hotel', included: true },
            { title: 'Statue of Liberty ferry', included: true },
            { title: 'Broadway show ticket', included: true },
            { title: 'Central Park bike rental', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in NYC. Times Square. Broadway show evening.', location: 'Midtown Manhattan' },
            { day: 2, activity: 'Statue of Liberty. Ellis Island. Wall Street. Brooklyn Bridge sunset.', location: 'Lower Manhattan' },
            { day: 3, activity: 'Central Park bike tour. MET Museum. Fifth Avenue. Top of the Rock.', location: 'Upper Manhattan' },
            { day: 4, activity: 'Chelsea Market. High Line. SoHo shopping. Departure.', location: 'Downtown' },
        ],
        overview: {
            about: 'Experience the energy of the Big Apple on this action-packed 4-day city break. From iconic landmarks to world-class museums, Broadway shows to incredible food, New York City never disappoints.',
            gallery: [{ imageURL: TOUR_IMAGES.newYork, altText: 'NYC skyline' }],
        },
        reviews: { rating: 4.6, basedOn: 245, individualReviews: [] },
    },
    {
        title: 'Iceland Northern Lights',
        location: 'Reykjavik, Iceland',
        price: 2600,
        currency: '$',
        duration: { days: 5, nights: 4 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.iceland,
        images: [TOUR_IMAGES.iceland],
        categories: ['Adventure', 'Nature', 'Scenic'],
        inclusions: [
            { title: 'Guesthouse accommodation', included: true },
            { title: 'Northern Lights tour', included: true },
            { title: 'Golden Circle day trip', included: true },
            { title: 'Blue Lagoon entry', included: true },
            { title: 'Glacier hiking gear', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Reykjavik. City walk. Northern Lights hunt.', location: 'Reykjavik' },
            { day: 2, activity: 'Golden Circle: Thingvellir, Geysir, Gullfoss waterfall.', location: 'Golden Circle' },
            { day: 3, activity: 'South Coast. Seljalandsfoss & Skógafoss waterfalls. Black sand beach.', location: 'South Coast' },
            { day: 4, activity: 'Glacier hike on Sólheimajökull. Ice cave exploration.', location: 'Mýrdalsjökull' },
            { day: 5, activity: 'Blue Lagoon geothermal spa. Departure.', location: 'Reykjavik' },
        ],
        overview: {
            about: 'Chase the Aurora Borealis across Iceland\'s dramatic landscapes. This 5-day winter adventure takes you from thundering waterfalls to ancient glaciers, volcanic black sand beaches to geothermal hot springs. A bucket-list experience.',
            gallery: [{ imageURL: TOUR_IMAGES.iceland, altText: 'Northern Lights over Iceland' }],
        },
        reviews: { rating: 4.8, basedOn: 98, individualReviews: [] },
    },
    {
        title: 'Thailand Island Hopping',
        location: 'Phuket, Thailand',
        price: 950,
        currency: '$',
        duration: { days: 7, nights: 6 },
        validity: new Date('2027-12-31'),
        imageURL: TOUR_IMAGES.thailand,
        images: [TOUR_IMAGES.thailand, ...EXTRA_IMAGES.thailand],
        categories: ['Beach', 'Adventure', 'Budget'],
        inclusions: [
            { title: 'Beach resort accommodation', included: true },
            { title: 'Island hopping boat tours', included: true },
            { title: 'Thai cooking class', included: true },
            { title: 'Snorkeling equipment', included: true },
            { title: 'Flights', included: false },
        ],
        itinerary: [
            { day: 1, activity: 'Arrive in Phuket. Beach resort check-in. Night market.', location: 'Phuket' },
            { day: 2, activity: 'Phi Phi Islands day trip. Maya Bay. Snorkeling.', location: 'Phi Phi Islands' },
            { day: 3, activity: 'James Bond Island. Sea canoeing through limestone caves.', location: 'Phang Nga Bay' },
            { day: 4, activity: 'Ferry to Krabi. Railay Beach. Rock climbing intro.', location: 'Krabi' },
            { day: 5, activity: 'Four Islands tour. Thai cooking class evening.', location: 'Krabi' },
            { day: 6, activity: 'Koh Lanta day trip. Pristine beaches. Sunset bar.', location: 'Koh Lanta' },
            { day: 7, activity: 'Free morning. Transfer to Phuket for departure.', location: 'Phuket' },
        ],
        overview: {
            about: 'Hop between Thailand\'s most stunning islands on this affordable 7-day adventure. From the famous Maya Bay to hidden lagoons, limestone cliffs to coral reefs, this trip offers the best of Thailand\'s Andaman coast at an incredible price.',
            gallery: [{ imageURL: TOUR_IMAGES.thailand, altText: 'Thai beach' }],
        },
        reviews: { rating: 4.7, basedOn: 312, individualReviews: [] },
    },
];

// ─── DESTINATIONS ─────────────────────────────────────
const destinations = [
    { name: 'India', slug: 'india', country: 'India', continent: 'Asia', description: 'A land of vibrant colors, ancient temples, and diverse landscapes from the Himalayas to tropical beaches.', coverImage: DEST_IMAGES.india, tourCount: 25, rating: 4.6, isActive: true },
    { name: 'Indonesia', slug: 'indonesia', country: 'Indonesia', continent: 'Asia', description: 'Over 17,000 islands of paradise, from Bali\'s temples to Komodo\'s dragons and Raja Ampat\'s coral reefs.', coverImage: DEST_IMAGES.indonesia, tourCount: 18, rating: 4.8, isActive: true },
    { name: 'France', slug: 'france', country: 'France', continent: 'Europe', description: 'The epitome of romance, art, and gastronomy. From Paris to Provence, every corner tells a story.', coverImage: DEST_IMAGES.france, tourCount: 15, rating: 4.7, isActive: true },
    { name: 'UAE', slug: 'uae', country: 'United Arab Emirates', continent: 'Asia', description: 'Where futuristic skyscrapers meet ancient desert traditions. Luxury, adventure, and culture combined.', coverImage: DEST_IMAGES.uae, tourCount: 12, rating: 4.5, isActive: true },
    { name: 'Maldives', slug: 'maldives', country: 'Maldives', continent: 'Asia', description: 'Crystal-clear waters, overwater villas, and marine life that will take your breath away.', coverImage: DEST_IMAGES.maldives, tourCount: 8, rating: 4.9, isActive: true },
    { name: 'Japan', slug: 'japan', country: 'Japan', continent: 'Asia', description: 'Ancient traditions meet cutting-edge technology. Cherry blossoms, temples, sushi, and neon lights.', coverImage: DEST_IMAGES.japan, tourCount: 14, rating: 4.8, isActive: true },
    { name: 'Kenya', slug: 'kenya', country: 'Kenya', continent: 'Africa', description: 'Home to the Great Migration, the Big Five, and some of the most dramatic landscapes on Earth.', coverImage: DEST_IMAGES.kenya, tourCount: 10, rating: 4.7, isActive: true },
    { name: 'Switzerland', slug: 'switzerland', country: 'Switzerland', continent: 'Europe', description: 'Snow-capped Alps, pristine lakes, chocolate, cheese, and the most scenic train rides in the world.', coverImage: DEST_IMAGES.switzerland, tourCount: 11, rating: 4.8, isActive: true },
    { name: 'Italy', slug: 'italy', country: 'Italy', continent: 'Europe', description: 'A feast for all senses — Roman ruins, Renaissance art, Mediterranean coast, and incredible cuisine.', coverImage: DEST_IMAGES.italy, tourCount: 16, rating: 4.7, isActive: true },
    { name: 'Iceland', slug: 'iceland', country: 'Iceland', continent: 'Europe', description: 'Land of fire and ice. Northern Lights, geysers, glaciers, volcanoes, and otherworldly landscapes.', coverImage: DEST_IMAGES.iceland, tourCount: 7, rating: 4.8, isActive: true },
];

// ─── BLOG POSTS ──────────────────────────────────────
function createBlogPosts(authorId) {
    return [
        {
            title: 'The Ultimate Packing Guide for Any Trip',
            slug: 'ultimate-packing-guide',
            content: '<p>Packing smart is the secret to stress-free travel. After years of globe-trotting, here are my tried-and-tested tips...</p><h2>The Capsule Wardrobe Approach</h2><p>Choose 3-4 base colors that mix and match. Pack versatile pieces that can be dressed up or down. Roll, don\'t fold — it saves space and reduces wrinkles.</p><h2>Tech Essentials</h2><p>Universal adapter, portable charger, noise-cancelling headphones, and a good camera. That\'s all you really need.</p><h2>The One-Bag Challenge</h2><p>Try traveling with just a carry-on for your next short trip. You\'ll be amazed at how freeing it feels to skip baggage claim.</p>',
            excerpt: 'Pack smart, travel light. Our comprehensive packing guide covers everything from capsule wardrobes to tech essentials for any type of trip.',
            author: authorId,
            coverImage: BLOG_IMAGES.packing,
            tags: ['Travel Tips', 'Packing', 'Guide'],
            status: 'published',
            publishedAt: new Date('2025-01-15'),
        },
        {
            title: 'How to Travel the World on a Budget',
            slug: 'travel-world-on-budget',
            content: '<p>You don\'t need to be rich to see the world. With the right strategies, incredible travel is accessible to almost anyone...</p><h2>Timing is Everything</h2><p>Travel during shoulder season — the sweet spot between peak and off-peak. You get good weather, fewer crowds, and much lower prices.</p><h2>Accommodation Hacks</h2><p>Mix hostels with guesthouses. Use loyalty programs. Consider house-sitting or work exchanges for free accommodation.</p><h2>Eat Like a Local</h2><p>Street food and local markets are not just cheaper — they\'re often the most authentic and delicious options.</p>',
            excerpt: 'Discover proven strategies to see the world without breaking the bank. From timing your trips right to eating like a local.',
            author: authorId,
            coverImage: BLOG_IMAGES.budget,
            tags: ['Budget Travel', 'Tips', 'Guide'],
            status: 'published',
            publishedAt: new Date('2025-02-10'),
        },
        {
            title: 'Solo Travel: A Complete Guide for First-Timers',
            slug: 'solo-travel-guide',
            content: '<p>Solo travel might be the most transformative thing you\'ll ever do. Here\'s how to do it right...</p><h2>Choosing Your First Destination</h2><p>Start with a country that\'s known for being safe and welcoming to solo travelers. Japan, Portugal, New Zealand, and Thailand are excellent choices.</p><h2>Safety First</h2><p>Share your itinerary with someone you trust. Keep digital copies of important documents. Trust your instincts — if something feels off, move on.</p><h2>Embracing Solitude</h2><p>The magic of solo travel is in the unexpected conversations, spontaneous detours, and the deep self-discovery that comes from navigating the world on your own terms.</p>',
            excerpt: 'Everything you need to know about traveling solo for the first time. From choosing destinations to staying safe and making the most of it.',
            author: authorId,
            coverImage: BLOG_IMAGES.solo,
            tags: ['Solo Travel', 'Guide', 'Safety'],
            status: 'published',
            publishedAt: new Date('2025-03-05'),
        },
        {
            title: '10 Foods You Must Try Around the World',
            slug: 'must-try-foods-around-world',
            content: '<p>Food is the universal language of travel. These are the dishes worth flying across the world for...</p><h2>1. Ramen in Tokyo</h2><p>Nothing compares to a steaming bowl of authentic ramen from a tiny shop in a Tokyo alleyway.</p><h2>2. Tacos al Pastor in Mexico City</h2><p>The perfect combination of marinated pork, pineapple, and fresh cilantro on a handmade tortilla.</p><h2>3. Pad Thai in Bangkok</h2><p>When made by a street vendor who\'s been perfecting their recipe for decades, it\'s transcendent.</p><h2>4. Croissant in Paris</h2><p>Flaky, buttery, warm from the oven. A simple Parisian croissant is one of life\'s great pleasures.</p><h2>5. Pizza in Naples</h2><p>The birthplace of pizza. Margherita from a wood-fired oven will ruin all other pizza for you forever.</p>',
            excerpt: 'From Tokyo ramen to Neapolitan pizza, these are the must-try dishes that are worth the plane ticket alone.',
            author: authorId,
            coverImage: BLOG_IMAGES.food,
            tags: ['Food', 'Culture', 'World Travel'],
            status: 'published',
            publishedAt: new Date('2025-04-20'),
        },
    ];
}

// ─── SEED FUNCTION ────────────────────────────────────
async function seed() {
    try {
        await mongoose.connect(process.env.DB_URI);
        console.log('Connected to MongoDB');

        // Get the admin user (or first user) for blog author
        let user = await User.findOne({ role: 'admin' });
        if (!user) user = await User.findOne();
        if (!user) {
            console.log('No users found. Please log in at least once first to create a user, then run the seed again.');
            process.exit(1);
        }
        console.log(`Using user: ${user.displayName} (${user.email}) as author`);

        // Clear existing data
        console.log('Clearing existing data...');
        await Promise.all([
            TravelDestination.deleteMany({}),
            Destination.deleteMany({}),
            Collection.deleteMany({}),
            BlogPost.deleteMany({}),
            Review.deleteMany({}),
            SiteSettings.deleteMany({}),
        ]);

        // Seed tours
        console.log('Seeding tours...');
        const createdTours = await TravelDestination.insertMany(tours);
        console.log(`  ✓ ${createdTours.length} tours created`);

        // Seed destinations
        console.log('Seeding destinations...');
        const createdDests = await Destination.insertMany(destinations);
        console.log(`  ✓ ${createdDests.length} destinations created`);

        // Seed collections (using created tour IDs)
        console.log('Seeding collections...');
        const collections = [
            {
                name: 'Beach Getaways',
                slug: 'beach-getaways',
                description: 'Sun, sand, and crystal-clear waters. Discover our hand-picked beach destinations around the world.',
                coverImage: TOUR_IMAGES.maldives,
                tours: createdTours.filter(t => t.categories.includes('Beach')).map(t => t._id),
                isActive: true,
                displayOrder: 1,
            },
            {
                name: 'Adventure & Trekking',
                slug: 'adventure-trekking',
                description: 'For those who seek thrills. From mountain treks to safari expeditions, push your boundaries.',
                coverImage: TOUR_IMAGES.himalaya,
                tours: createdTours.filter(t => t.categories.includes('Adventure')).map(t => t._id),
                isActive: true,
                displayOrder: 2,
            },
            {
                name: 'Cultural Experiences',
                slug: 'cultural-experiences',
                description: 'Immerse yourself in local traditions, history, and art across the globe.',
                coverImage: TOUR_IMAGES.rome,
                tours: createdTours.filter(t => t.categories.includes('Culture')).map(t => t._id),
                isActive: true,
                displayOrder: 3,
            },
            {
                name: 'Luxury Escapes',
                slug: 'luxury-escapes',
                description: 'First-class experiences for the discerning traveler. 5-star stays, private tours, and exclusive access.',
                coverImage: TOUR_IMAGES.dubai,
                tours: createdTours.filter(t => t.categories.includes('Luxury')).map(t => t._id),
                isActive: true,
                displayOrder: 4,
            },
            {
                name: 'Romantic Honeymoons',
                slug: 'romantic-honeymoons',
                description: 'Celebrate love in the most beautiful corners of the world.',
                coverImage: TOUR_IMAGES.paris,
                tours: createdTours.filter(t => t.categories.some(c => ['Romance', 'Honeymoon', 'Luxury'].includes(c))).map(t => t._id),
                isActive: true,
                displayOrder: 5,
            },
        ];
        const createdCollections = await Collection.insertMany(collections);
        console.log(`  ✓ ${createdCollections.length} collections created`);

        // Seed blog posts
        console.log('Seeding blog posts...');
        const blogPosts = createBlogPosts(user._id);
        const createdPosts = await BlogPost.insertMany(blogPosts);
        console.log(`  ✓ ${createdPosts.length} blog posts created`);

        // Seed reviews
        console.log('Seeding reviews...');
        const reviewData = [];
        for (const tour of createdTours.slice(0, 6)) {
            reviewData.push({
                tour: tour._id,
                user: user._id,
                rating: 5,
                title: 'Absolutely amazing experience!',
                content: `The ${tour.title} exceeded all my expectations. The guides were professional, the accommodations were comfortable, and every detail was taken care of. Would highly recommend to anyone looking for an unforgettable trip.`,
                isVerifiedBooking: true,
            });
        }
        const createdReviews = await Review.insertMany(reviewData);
        console.log(`  ✓ ${createdReviews.length} reviews created`);

        // Seed site settings
        console.log('Seeding site settings...');
        await SiteSettings.create({
            companyName: 'Wandeazy Travels',
            contactEmail: 'hello@wandeazy.com',
            // Phone, address and social links stay empty until the real ones are entered in Admin → Settings
            footer: {
                showQuickLinks: true,
                showNewsletter: true,
            },
            contentSections: [
                { sectionId: 'hero', name: 'Hero Banner', description: 'Main banner section on the homepage with call-to-action.', isVisible: true },
                { sectionId: 'featured', name: 'Featured Tours', description: 'Showcase hand-picked tours on the homepage.', isVisible: true },
                { sectionId: 'offers', name: 'Promotional Offers', description: 'Special deals and discount banners.', isVisible: true },
                { sectionId: 'testimonials', name: 'Testimonials', description: 'Customer reviews and testimonials section.', isVisible: true },
                { sectionId: 'gallery', name: 'Photo Gallery', description: 'Travel photo gallery showcasing destinations.', isVisible: false },
            ],
        });
        console.log('  ✓ Site settings created');

        // Ratings shown on the site come from real reviews, not the sample numbers above
        await recomputeAllTourRatings();
        console.log('  ✓ Tour ratings recomputed from reviews');

        console.log('\n✅ Database seeded successfully!');
        console.log(`   Tours: ${createdTours.length}`);
        console.log(`   Destinations: ${createdDests.length}`);
        console.log(`   Collections: ${createdCollections.length}`);
        console.log(`   Blog Posts: ${createdPosts.length}`);
        console.log(`   Reviews: ${createdReviews.length}`);
        console.log(`   Site Settings: 1`);

    } catch (err) {
        console.error('Seed failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seed();
