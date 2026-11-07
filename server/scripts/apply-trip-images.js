#!/usr/bin/env node
'use strict';
/**
 * Puts the real destination photos (scripts/data/trip-images.json) on the live tours:
 * the first photo becomes the cover, the rest the tour's gallery. Tours are matched by title.
 * Photos live in the website at /images/trips/ and are credited on /photo-credits.
 *
 *   node scripts/apply-trip-images.js          show what would change
 *   node scripts/apply-trip-images.js --apply  write it
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const TravelDestination = require('../src/models/TravelDestination');

const APPLY = process.argv.includes('--apply');
const { tours } = require(path.join(__dirname, 'data', 'trip-images.json'));

(async () => {
    const all = await TravelDestination.find({});
    let changed = 0;
    const missing = [];
    for (const tour of all) {
        const photos = tours[tour.title];
        if (!photos?.length) { missing.push(tour.title); continue; }
        const [cover, ...rest] = photos;
        const same = tour.imageURL === cover && JSON.stringify(tour.images || []) === JSON.stringify(rest);
        if (same) continue;
        changed++;
        console.log(`${tour.title}: ${photos.length} photos`);
        if (APPLY) {
            tour.imageURL = cover;
            tour.images = rest;
            await TravelDestination.save(tour);
        }
    }
    console.log(`${changed} tour(s) ${APPLY ? 'updated' : 'would change (dry run)'}.`);
    if (missing.length) console.log(`No photos picked for: ${missing.join(', ')}`);
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
