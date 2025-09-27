import "dotenv/config";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";

import User from "../models/User.js";
import { logger } from "../utils/logger.js";

async function configurePassport() {
  const client_id = process.env.OIDC_CLIENT_ID;
  const client_secret = process.env.OIDC_CLIENT_SECRET;
  const issuer_url = process.env.OIDC_ISSUER_URL;
  const redirect_uri = process.env.OIDC_CALLBACK_URL;

  if (!issuer_url || !client_id || !client_secret || !redirect_uri) return;

  try {
    // Use openid-client discovery to obtain a Configuration and instantiate the passport Strategy
    const config = await client.discovery(new URL(issuer_url), client_id, client_secret);
    const oidcStrategy = new Strategy(
      { config, passReqToCallback: true, callbackURL: redirect_uri },
      async (req, tokenSet, userinfo, done) => {
        try {
          const email = userinfo.email;
          let user = await User.findByEmail(email);
          if (!user) {
            const adminExists = await User.adminExists();
            const isAdmin = !adminExists;
            user = await User.create({
              email,
              is_admin: isAdmin,
            });
            logger.info(`[Passport] New user: ${user.email} (admin=${isAdmin})`);
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    );
    passport.use("oidc", oidcStrategy);
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
    logger.info("[Passport] OIDC strategy configured");
  } catch (error) {
    logger.error("[Passport] Failed to discover OpenID Issuer:", error);
    process.exit(1);
  }
}

export { configurePassport, passport };
