// Creates (or resets) one local test account per staff role, for trying the admin area as each role.
// Passwords are generated and written to scripts/data/test-staff.local.json, which git ignores.
// Usage: node scripts/create-test-staff.js   (never run against production)
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ROLES = ['manager', 'editor', 'support', 'moderator'];

(async () => {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to create test accounts in production');
    await mongoose.connect(process.env.DB_URI);
    const accounts = {};
    for (const role of ROLES) {
        const email = `test-${role}@wandeazy.test`;
        const password = crypto.randomBytes(9).toString('base64url');
        let user = await User.findOne({ email }).select('+password');
        if (!user) user = new User({ email, displayName: `Test ${role[0].toUpperCase()}${role.slice(1)}`, authProvider: 'local', isEmailVerified: true });
        user.role = role;
        user.isSuspended = false;
        user.password = password;
        await user.save();
        accounts[role] = { email, password };
    }
    const out = path.join(__dirname, 'data', 'test-staff.local.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(accounts, null, 2));
    console.log(`Created ${ROLES.length} test staff accounts. Sign-in details: ${path.relative(process.cwd(), out)}`);
    await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
