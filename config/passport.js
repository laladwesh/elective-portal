const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Ensure User model is correctly imported

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL, // This must be your backend callback URL
      },
      async (accessToken, refreshToken, profile, done) => {
        const newUserInfo = { // Renamed to avoid confusion with potential new user creation
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          // We no longer set role/batch here for *new* users, as new users are not created.
        };

        try {
          // Attempt to find an existing user by email
          let user = await User.findOne({ email: newUserInfo.email });

          if (user) {
            // If user exists, update their Google ID and name if changed, then proceed with login
            user.googleId = newUserInfo.googleId; // Update googleId in case it changed or wasn't there
            if (user.name !== newUserInfo.name) {
                user.name = newUserInfo.name;
            }
            await user.save(); // Save any updates
            done(null, user); // User found and updated, proceed with authentication
          } else {
            // If user DOES NOT exist in the database, deny login.
            // Calling done(null, false) indicates authentication failure.
            // The message can be accessed by Passport's failureFlash option if configured,
            // or simply signals failure to the redirect logic in your route.
            console.log(`Login attempt for unregistered email: ${newUserInfo.email}`);
            return done(null, false, { message: 'User not registered. Please contact the administrator.' });
          }
        } catch (err) {
          console.error('Error during Google authentication:', err);
          done(err, null); // Pass error to Passport
        }
      }
    )
  );

  // Passport serialization/deserialization (typically remains the same)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};