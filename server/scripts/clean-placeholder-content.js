/**
 * Replaces the old sample content (made-up phone/address, fake testimonials,
 * "3M+ explorers", a sale banner with no sale behind it…) with the current
 * honest defaults.
 *
 * A value is only touched while it still equals the old seed default exactly,
 * so anything an admin has written themselves is left alone.
 *
 * Run: npm run content:clean
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const SiteSettings = require('../src/models/SiteSettings');
const TravelDestination = require('../src/models/TravelDestination');
const legacy = require('./data/legacy-settings-defaults.json');

const plain = (v) => JSON.parse(JSON.stringify(v ?? null, (k, x) => (k === '_id' ? undefined : x)));
// True when every field of the legacy item is unchanged in the stored item
const sameAs = (item, old) => Object.keys(old).every((k) => JSON.stringify(plain(item?.[k])) === JSON.stringify(old[k]));

function cleanList(current, oldList, newList) {
    const out = [];
    let changed = false;
    (current || []).forEach((item, i) => {
        const oldIndex = oldList.findIndex((old) => sameAs(item, old));
        const replacement = newList[oldIndex];
        if (oldIndex === -1 || (replacement && sameAs(item, replacement))) return out.push(item);
        changed = true;
        if (replacement) out.push(replacement);
    });
    return { list: out, changed };
}

async function cleanPlaceholderContent() {
    const doc = await SiteSettings.findOne();
    if (!doc) return [];
    const defaults = plain(new SiteSettings().toObject());
    const changes = [];

    for (const field of ['contactPhone', 'address']) {
        if (doc[field] === legacy[field]) { doc[field] = defaults[field]; changes.push(field); }
    }
    for (const [network, url] of Object.entries(legacy.socialLinks)) {
        if (doc.socialLinks?.[network] === url) { doc.socialLinks[network] = ''; changes.push(`socialLinks.${network}`); }
    }
    if (legacy.footer.copyrightText.includes(doc.footer?.copyrightText)) {
        doc.footer.copyrightText = ''; changes.push('footer.copyrightText');
    }
    if (doc.offerBar?.text === legacy.offerBar.text) {
        doc.offerBar = defaults.offerBar; changes.push('offerBar');
    }
    if (doc.supportSection?.paragraph === legacy.supportSection.paragraph) {
        doc.supportSection.paragraph = defaults.supportSection.paragraph; changes.push('supportSection.paragraph');
    }

    const lists = [
        ['footerExploreLinks'],
        ['heroSlides'],
        ['promoSlides'],
        ['testimonials'],
        ['faqs'],
        ['planTrip', 'steps'],
        ['supportSection', 'features'],
        ['supportSection', 'chatMessages'],
        ['aboutPage', 'stats'],
        ['aboutPage', 'values'],
    ];
    for (const path of lists) {
        const get = (o) => path.reduce((acc, k) => acc?.[k], o);
        const { list, changed } = cleanList(plain(get(doc)), get(legacy), get(defaults));
        if (changed) { doc.set(path.join('.'), list); changes.push(path.join('.')); }
    }

    if (changes.length) await doc.save();

    // Sample tours said "EMI from $142/mo", but checkout has no instalments
    const emi = await TravelDestination.updateMany({ emi: /^EMI from \$\d+\/mo$/ }, { $unset: { emi: '' } });
    if (emi.modifiedCount) changes.push(`tour EMI labels (${emi.modifiedCount})`);

    return changes;
}

module.exports = { cleanPlaceholderContent };

if (require.main === module) {
    (async () => {
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/wandeazy');
        const changes = await cleanPlaceholderContent();
        console.log(changes.length ? `Replaced sample content in: ${changes.join(', ')}` : 'No sample content left to replace.');
        await mongoose.disconnect();
    })().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
