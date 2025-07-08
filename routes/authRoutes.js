const express = require('express');
const passport = require('passport'); // Import passport
const { googleCallbackHandler } = require('../controllers/authController'); // Import the handler

const router = express.Router();

// @desc    Auth with Google
// @route   GET /api/auth/google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @desc    Google auth callback
// @route   GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/`, // Redirect to frontend login on failure
    session: false // We are using JWTs, not sessions for subsequent requests
  }),
  googleCallbackHandler // Use your custom handler on success
);

// You can add other auth routes here, e.g., for FCM tokens or password-based auth
// router.post('/fcm/register', async (req, res) => { ... });
// router.delete('/fcm/delete', async (req, res) => { ... });

module.exports = router;