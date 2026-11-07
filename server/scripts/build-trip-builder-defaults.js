#!/usr/bin/env node
'use strict';
/**
 * Adds regions, seasons and season prices to the trip builder's starting price list
 * (src/models/trip-builder-defaults.json).
 *
 * - Season months and off/peak prices come from scripts/data/place-research.json
 *   (public package listings on the big travel sites; the regular price is the middle of the two).
 * - Regions (travel circuits) and their travel costs are set below.
 * - Photos come from scripts/data/trip-images.json when it exists.
 *
 * Usage: node scripts/build-trip-builder-defaults.js
 * The admin "Builder prices" editor can change all of this afterwards.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../src/models/trip-builder-defaults.json');
const RESEARCH = require('./data/place-research.json');
const IMAGES_FILE = path.join(__dirname, 'data/trip-images.json');

// hop: one way, per person, to travel from another region into this one (flight or long train).
// fare: a return economy flight per person from a major Indian city.
const ZONES = [
    { id: 'north', label: 'North India & the Himalayas', hop: [3500, 8000], fare: [6000, 14000] },
    { id: 'rajasthan', label: 'Rajasthan', hop: [2500, 6000], fare: [5000, 12000] },
    { id: 'gujarat', label: 'Gujarat', hop: [3500, 8000], fare: [7000, 15000] },
    { id: 'ganga', label: 'Varanasi & Ayodhya', hop: [3500, 7500], fare: [7000, 14000] },
    { id: 'west', label: 'Mumbai, Maharashtra & Goa', hop: [3500, 8000], fare: [6000, 15000] },
    { id: 'south', label: 'South India', hop: [5000, 11000], fare: [9000, 20000] },
    { id: 'east', label: 'Northeast & Darjeeling', hop: [5000, 10000], fare: [10000, 18000] },
    { id: 'andaman', label: 'Andaman Islands', hop: [8000, 16000], fare: [14000, 30000] },
    { id: 'nepal', label: 'Nepal', hop: [8000, 15000], fare: [10000, 22000] },
    { id: 'bhutan', label: 'Bhutan', hop: [8000, 20000], fare: [15000, 45000] },
    { id: 'thailand', label: 'Thailand', hop: [10000, 18000], fare: [18000, 35000] },
    { id: 'malaysia-singapore', label: 'Singapore & Malaysia', hop: [10000, 18000], fare: [18000, 35000] },
    { id: 'bali', label: 'Bali', hop: [16000, 26000], fare: [30000, 50000] },
    { id: 'srilanka', label: 'Sri Lanka', hop: [10000, 17000], fare: [20000, 32000] },
    { id: 'uae', label: 'Dubai & Abu Dhabi', hop: [9000, 17000], fare: [18000, 32000] },
];

// Places in one region combine freely. Gateway cities sit in more than one,
// e.g. Delhi joins the Himalayas, Rajasthan (Golden Triangle) and the Ganga circuit.
const PLACE_ZONES = {
    shimla: ['north'], manali: ['north'], chandigarh: ['north'], dharamshala: ['north'], dalhousie: ['north'],
    amritsar: ['north'], spiti: ['north'], leh: ['north'], srinagar: ['north'], gulmarg: ['north'], pahalgam: ['north'],
    katra: ['north'], rishikesh: ['north'], haridwar: ['north'], nainital: ['north'], almora: ['north'], corbett: ['north'],
    delhi: ['north', 'rajasthan', 'ganga'], agra: ['north', 'rajasthan', 'ganga'], mathura: ['north', 'rajasthan', 'ganga'],
    varanasi: ['ganga'], ayodhya: ['ganga'],
    jaipur: ['rajasthan'], pushkar: ['rajasthan'], jodhpur: ['rajasthan'], jaisalmer: ['rajasthan'],
    udaipur: ['rajasthan', 'gujarat'], mountabu: ['rajasthan', 'gujarat'],
    kutch: ['gujarat'], dwarka: ['gujarat'], somnath: ['gujarat'],
    mumbai: ['west'], lonavala: ['west'], mahabaleshwar: ['west'], shirdi: ['west'],
    goa: ['west', 'south'], gokarna: ['west', 'south'],
    kochi: ['south'], munnar: ['south'], thekkady: ['south'], alleppey: ['south'], kovalam: ['south'], madurai: ['south'],
    rameswaram: ['south'], kanyakumari: ['south'], ooty: ['south'], coorg: ['south'], mysore: ['south'], hampi: ['south'],
    andaman: ['andaman'],
    shillong: ['east'], kaziranga: ['east'], darjeeling: ['east'], gangtok: ['east'],
    kathmandu: ['nepal'], pokhara: ['nepal'],
    // Bhutan is reached by road from Bagdogra, so it pairs with Darjeeling and Sikkim
    bhutan: ['bhutan', 'east'],
    bangkok: ['thailand'], phuket: ['thailand'],
    singapore: ['malaysia-singapore'], kualalumpur: ['malaysia-singapore'], langkawi: ['malaysia-singapore'],
    bali: ['bali'], srilanka: ['srilanka'], dubai: ['uae'], abudhabi: ['uae'],
};

// Why a place is shut in its closed months
const CLOSED_NOTES = {
    spiti: 'roads are snowbound',
    leh: 'deep winter, most hotels shut',
    kutch: 'the white desert floods in the monsoon',
    kaziranga: 'the park shuts for the monsoon',
};

const r100 = (n) => Math.round(n / 100) * 100;

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const images = fs.existsSync(IMAGES_FILE) ? JSON.parse(fs.readFileSync(IMAGES_FILE, 'utf8')).places || {} : {};

data.multiRegionMinNights = 10;
data.maxRegions = 2;
data.zones = ZONES.map(({ id, label, hop, fare }) => ({ id, label, hopFrom: hop[0], hopTo: hop[1], fareFrom: fare[0], fareTo: fare[1] }));

const missing = [];
data.places = data.places.map((p) => {
    const r = RESEARCH.places[p.id];
    const zones = PLACE_ZONES[p.id];
    if (!r || !zones) missing.push(p.id);
    const next = { ...p, zones: zones || [] };
    if (r) {
        next.offFrom = r100(r.offPrice[0]);
        next.offTo = r100(r.offPrice[1]);
        next.peakFrom = r100(r.peakPrice[0]);
        next.peakTo = r100(r.peakPrice[1]);
        next.nightlyFrom = r100((r.offPrice[0] + r.peakPrice[0]) / 2);
        next.nightlyTo = r100((r.offPrice[1] + r.peakPrice[1]) / 2);
        next.peakMonths = [...r.peak].sort((a, b) => a - b);
        next.offMonths = [...r.off].sort((a, b) => a - b);
        next.closedMonths = [...r.closed].sort((a, b) => a - b);
        next.seasonNote = CLOSED_NOTES[p.id] || '';
        if (r.visaINR?.[1] > 0) { next.visaFrom = r.visaINR[0]; next.visaTo = r.visaINR[1]; }
    }
    const pics = images[p.id];
    if (pics?.length) {
        next.image = pics[0];
        next.images = pics.slice(1);
    }
    return next;
});

// Flights depend on where the trip goes, so they are priced from the regions
const flights = data.extras.find((x) => x.id === 'flights');
if (flights) Object.assign(flights, {
    label: 'Return flights',
    description: 'Economy flights from a major Indian city and back, priced for where you are going.',
    per: 'flight',
    priceFrom: 3000,
    priceTo: 6000,
});

fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Updated ${data.places.length} places, ${data.zones.length} regions.`);
if (missing.length) console.log(`No research or region for: ${missing.join(', ')}`);
