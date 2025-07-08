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
        const newUser = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          // Role will be determined upon first login if not explicitly set
          // For simplicity, default to 'student' or handle based on admin emails
          role: 'student', // Default role for new users
          batch: 'Unassigned', // Default batch for new students
        };

        try {
          let user = await User.findOne({ email: newUser.email });

          if (user) {
            // If user exists, update their name if it changed, or just return them
            user.googleId = newUser.googleId; // Update googleId in case it changed or wasn't there
            if (user.name !== newUser.name) {
                user.name = newUser.name;
            }
            await user.save();
            done(null, user);
          } else {
            // If new user, check if they are an admin based on email (optional)
            const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
            if (adminEmails.includes(newUser.email)) {
                newUser.role = 'admin';
                newUser.batch = undefined; // Admins don't have a batch
            }
            user = await User.create(newUser);
            done(null, user);
          }
        } catch (err) {
          console.error(err);
          done(err, null);
        }
      }
    )
  );

  // Passport session management (optional, but good practice if you use sessions)
  // Not strictly needed if you're using JWTs for stateless auth after initial login.
  // passport.serializeUser((user, done) => {
  //   done(null, user.id);
  // });

  // passport.deserializeUser((id, done) => {
  //   User.findById(id, (err, user) => done(err, user));
  // });
};