const generateToken = require('../utils/generateToken');

// Handler for Google OAuth callback success
exports.googleCallbackHandler = (req, res) => {
  // Passport provides the user object on req.user after successful authentication
  const user = req.user;

  if (!user) {
    // This should ideally not happen if Passport authentication succeeded
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }

  // Generate your application's JWT
  const token = generateToken(user._id);

  // Redirect to your frontend success page with token and user details
  // Note: For sensitive data, prefer direct cookie setting or post-message if possible,
  // but for quick setup, URL params are common for initial token transfer.
  res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(user.role)}&batch=${encodeURIComponent(user.batch || '')}`);
};

// You can keep other auth-related functions here if needed, like verifyGoogleUser
// For the context of this specific correction, we only need the callback handler.
// exports.verifyGoogleUser = (req, res) => { /* ... */ };