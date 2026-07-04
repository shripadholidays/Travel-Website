const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');
const logger = require('../utils/logger');

const initializePassport = (passportInstance) => {

    passportInstance.serializeUser((user, done) => {
        done(null, user.id);
    });

    passportInstance.deserializeUser((id, done) => {
        User.findById(id).then(user => done(null, user)).catch(err => done(err, null));
    });

    passportInstance.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
    },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                let currentUser = await User.findOne({ googleId: profile.id });
                if (!currentUser) {
                    currentUser = await new User({
                        googleId: profile.id,
                        displayName: profile.displayName,
                        email: profile.emails[0].value,
                        profilePicture: profile.photos[0].value,
                        authProvider: 'google',
                    }).save();
                    logger.info('New user registered via Google', { user: currentUser.displayName });
                }

                req.authInfo = { accessToken };
                done(null, currentUser, req.authInfo);

            } catch (err) {
                logger.error('Error during Google OAuth', { error: err.message });
                done(err, null);
            }
        }));

};


module.exports = { initializePassport };
