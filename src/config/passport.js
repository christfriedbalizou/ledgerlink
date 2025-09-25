const passport = require('passport');
const { Issuer, Strategy } = require('openid-client');
const User = require('../models/User'); // Your User model from a previous step

/**
 * This function configures Passport.js with the OpenID Connect strategy.
 */
async function configurePassport() {
  const client_id = process.env.OIDC_CLIENT_ID;
  const client_secret = process.env.OIDC_CLIENT_SECRET;
  const issuer_url = process.env.OIDC_ISSUER_URL;
  const redirect_uri = process.env.OIDC_CALLBACK_URL;

  if (!issuer_url || !client_id || !client_secret || !redirect_uri) {
    console.warn('[Passport] Missing one or more OIDC configuration environment variables. Authentication will not work correctly.');
    return;
  }

  try {
    // 1. Discover the OpenID Provider's configuration
    const issuer = await Issuer.discover(issuer_url);

    // 2. Create the OpenID Connect client
    const client = new issuer.Client({
      client_id,
      client_secret,
      redirect_uris: [redirect_uri],
      response_types: ['code'],
    });

    // 3. Define the Passport Strategy
    const oidcStrategy = new Strategy(
      { client, passReqToCallback: true },
      async (req, tokenSet, userinfo, done) => {
        try {
          // Find or create the user in your database
          const email = userinfo.email;
          let user = await User.findByEmail(email);

          // Check if this is the very first user to log in.
          if (!user) {
            const adminExists = await User.adminExists();
            const isAdmin = !adminExists;

            // Create the new user
            user = await User.create({
              email,
              is_admin: isAdmin,
            });
            console.log(`[Passport] New user created: ${user.email}. Is Admin: ${isAdmin}`);
          }

          // Return the user object to Passport
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    );

    // 4. Register the Strategy with Passport
    passport.use('oidc', oidcStrategy);

    // 5. Serialize and Deserialize Users (required for session management)
    // Serialize: Save a minimal user ID to the session
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Deserialize: Retrieve the full user object from the database using the ID
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });

    console.log('[Passport] OpenID Connect strategy configured successfully.');
  } catch (error) {
    console.error('[Passport] Failed to discover OpenID Issuer:', error);
    process.exit(1);
  }
}

module.exports = { configurePassport, passport };