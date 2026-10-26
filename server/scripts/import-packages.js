/**
 * Adds the company's package catalogue (scripts/data/packages.json, taken from the client's
 * package page) as live tours, each with its trip lengths and hotel classes.
 * Running it again updates the same tours (matched by title) instead of adding copies.
 *
 *   node scripts/import-packages.js                  show what would change
 *   node scripts/import-packages.js --apply          write it
 *   node scripts/import-packages.js --apply --remove-samples
 *        also deletes the 12 placeholder tours the site was seeded with (and their reviews);
 *        any that have bookings are hidden instead, since bookings must keep their tour
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const db = require('../src/db');
const { migrate } = require('../src/db/migrate');
const TravelDestination = require('../src/models/TravelDestination');
const { normalizePackageOptions } = require('../src/services/package-options');

const APPLY = process.argv.includes('--apply');
const REMOVE_SAMPLES = process.argv.includes('--remove-samples');
const catalogue = require(path.join(__dirname, 'data', 'packages.json'));

// The catalogue has no place field; these are the regions each package covers
const LOCATIONS = {
    shimla_manali: 'Shimla & Manali, Himachal Pradesh, India',
    chandigarh_shimla_manali: 'Chandigarh, Shimla & Manali, India',
    leh_ladakh: 'Leh, Ladakh, India',
    kashmir: 'Srinagar, Kashmir, India',
    kashmir_vaishno: 'Kashmir & Katra, Jammu and Kashmir, India',
    dharamshala_dalhousie: 'Dharamshala & Dalhousie, Himachal Pradesh, India',
    amritsar_dharamshala: 'Amritsar & Dharamshala, India',
    delhi_agra_mathura: 'Delhi, Agra & Mathura, India',
    rishikesh_haridwar: 'Rishikesh & Haridwar, Uttarakhand, India',
    char_dham: 'Char Dham, Uttarakhand, India',
    nainital_almora: 'Nainital, Uttarakhand, India',
    nainital_corbett: 'Nainital & Jim Corbett, Uttarakhand, India',
    rajasthan_jaipur: 'Jaipur, Rajasthan, India',
    rajasthan_salasar: 'Jaipur & Shekhawati, Rajasthan, India',
    rajasthan_mehandipur: 'Jaipur & Shekhawati, Rajasthan, India',
    jodhpur_jaisalmer: 'Jodhpur & Jaisalmer, Rajasthan, India',
    udaipur_mountabu: 'Udaipur & Mount Abu, Rajasthan, India',
    udaipur_pilgrimage: 'Udaipur & Chittorgarh, Rajasthan, India',
    kutch: 'Kutch, Gujarat, India',
    dwarka_somnath: 'Dwarka & Somnath, Gujarat, India',
    mumbai_lonavala: 'Mumbai & Lonavala, Maharashtra, India',
    mahabaleshwar: 'Mahabaleshwar, Maharashtra, India',
    maharashtra_pilgrimage: 'Shirdi, Nashik & Aurangabad, Maharashtra, India',
    goa: 'Goa, India',
    kerala_complete: 'Kerala, India',
    kerala_extended: 'Kerala, India',
    rameswaram_kanyakumari: 'Rameswaram & Kanyakumari, Tamil Nadu, India',
    varanasi_ayodhya: 'Varanasi & Ayodhya, Uttar Pradesh, India',
    andaman: 'Port Blair & Havelock, Andaman Islands, India',
    spiti_valley: 'Spiti Valley, Himachal Pradesh, India',
    northeast_meghalaya: 'Shillong & Kaziranga, Meghalaya and Assam, India',
    darjeeling_sikkim: 'Darjeeling & Gangtok, India',
    ooty_coorg: 'Ooty, Coorg & Mysore, India',
    hampi_badami: 'Hampi & Gokarna, Karnataka, India',
    bali: 'Bali, Indonesia',
    thailand: 'Bangkok & Phuket, Thailand',
    sri_lanka: 'Sri Lanka',
    nepal: 'Kathmandu & Pokhara, Nepal',
    bhutan: 'Thimphu & Paro, Bhutan',
    singapore: 'Singapore',
    malaysia: 'Kuala Lumpur & Langkawi, Malaysia',
    uae: 'Dubai & Abu Dhabi, UAE',
};

// The placeholder tours the site was first seeded with (not the company's packages)
const SAMPLE_TITLES = [
    'Majestic Himalayan Trek', 'Bali Paradise Escape', 'Discover Tokyo', 'Romantic Paris Getaway',
    'Dubai Luxury Experience', 'Maldives Island Retreat', 'Thailand Island Hopping', 'New York City Break',
    'Ancient Rome & Amalfi Coast', 'Swiss Alps Explorer', 'Iceland Northern Lights', 'African Safari Adventure',
];

// Shown on the home page's featured row
const FEATURED_BADGES = new Set(['Popular', 'Bestseller', 'Trending Now', 'Bucket List', 'Paradise', 'Summer Hit']);

// "5 Nights / 6 Days" → { days: 6, nights: 5 }
function parseLength(label) {
    const nights = Number((label.match(/(\d+)\s*Night/i) || [])[1]);
    const days = Number((label.match(/(\d+)\s*Day/i) || [])[1]);
    if (!days) throw new Error(`Can't read the length "${label}"`);
    return { days, nights: Number.isFinite(nights) ? nights : days - 1 };
}

function toTour(pkg) {
    const location = LOCATIONS[pkg.id];
    if (!location) throw new Error(`No location for package "${pkg.id}"`);
    const durations = pkg.durs.map((label, i) => ({
        label,
        ...parseLength(label),
        price: pkg.base[i],
        itinerary: (pkg.it[label] || []).map((d) => ({ location: d.t, activity: d.p })),
    }));
    const hotelClasses = catalogue.hotelClasses
        .filter(({ key }) => pkg.hotels?.[key])
        .map(({ key, label }) => ({ key, label, hotel: pkg.hotels[key].name, features: pkg.hotels[key].feat, extraPerPerson: pkg.hotels[key].addPP || 0 }));
    return {
        title: pkg.t,
        location,
        currency: 'INR',
        categories: pkg.cats.map((c) => catalogue.categories[c] || c),
        emi: pkg.badge || '',
        bestTime: pkg.bestTime || '',
        imageURL: pkg.img,
        images: [],
        overview: { about: pkg.ov, gallery: [] },
        inclusions: [
            ...pkg.inc.map((title) => ({ title, included: true })),
            ...pkg.exc.map((title) => ({ title, included: false })),
        ],
        packageOptions: normalizePackageOptions({ durations, hotelClasses }, { location }),
        isFeatured: FEATURED_BADGES.has(pkg.badge),
        status: 'active',
        validity: new Date(Date.now() + 365 * 864e5),
    };
}

async function removeSamples() {
    const found = await TravelDestination.find({ where: `title IN (${SAMPLE_TITLES.map(() => '?').join(',')})`, args: SAMPLE_TITLES });
    const deleted = [];
    const hidden = [];
    for (const tour of found) {
        const booked = await db.get('SELECT COUNT(*) AS n FROM bookings WHERE tour_id = ?', [tour._id]);
        if (booked.n > 0) {
            hidden.push(`${tour.title} (${booked.n} booking${booked.n === 1 ? '' : 's'})`);
            if (APPLY) { tour.status = 'inactive'; tour.isFeatured = false; await TravelDestination.save(tour); }
            continue;
        }
        deleted.push(tour.title);
        if (APPLY) {
            await db.run('DELETE FROM reviews WHERE tour_id = ?', [tour._id]);
            await db.run('DELETE FROM tours WHERE id = ?', [tour._id]);
            // Collections and wishlists should not keep pointing at tours that no longer exist
            for (const table of ['collections', 'wishlists']) {
                await db.run(
                    `UPDATE ${table} SET tours = (SELECT json_group_array(value) FROM json_each(${table}.tours) WHERE value <> ?)
                     WHERE EXISTS (SELECT 1 FROM json_each(${table}.tours) WHERE value = ?)`,
                    [tour._id, tour._id],
                );
            }
        }
    }
    return { deleted, hidden };
}

(async () => {
    db.connect();
    if (APPLY) await migrate();
    const added = [];
    const updated = [];
    for (const pkg of catalogue.packages) {
        const data = toTour(pkg);
        const existing = await TravelDestination.findOne('title = ?', [data.title]);
        if (existing) {
            updated.push(data.title);
            if (APPLY) await TravelDestination.save(Object.assign(existing, data));
        } else {
            added.push(data.title);
            if (APPLY) await TravelDestination.insert(data);
        }
    }
    const samples = REMOVE_SAMPLES ? await removeSamples() : null;

    const verb = APPLY ? '' : ' (dry run, nothing written)';
    console.log(`Packages: ${added.length} added, ${updated.length} updated${verb}`);
    if (samples) {
        console.log(`Sample tours deleted: ${samples.deleted.length}${samples.deleted.length ? ` (${samples.deleted.join(', ')})` : ''}`);
        if (samples.hidden.length) console.log(`Sample tours hidden because they have bookings: ${samples.hidden.join(', ')}`);
    }
    if (!APPLY) console.log('Run again with --apply to write.');
    await db.close();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
