import "dotenv/config";
import passport from "passport";
import { Issuer, Strategy } from "openid-client";
import User from "../models/User.js";

async function configurePassport() {
  const client_id = process.env.OIDC_CLIENT_ID;
  const client_secret = process.env.OIDC_CLIENT_SECRET;
  const issuer_url = process.env.OIDC_ISSUER_URL;
  const redirect_uri = process.env.OIDC_CALLBACK_URL;

  if (!issuer_url || !client_id || !client_secret || !redirect_uri) {
    console.warn(
      "[Passport] Missing one or more OIDC configuration environment variables. Authentication will not work correctly.",
    );
    return;
  }

  try {
    const issuer = await Issuer.discover(issuer_url);
    const client = new issuer.Client({
      client_id,
      client_secret,
      redirect_uris: [redirect_uri],
      response_types: ["code"],
    });
    const oidcStrategy = new Strategy(
      { client, passReqToCallback: true },
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
            console.log(
              `[Passport] New user created: ${user.email}. Is Admin: ${isAdmin}`,
            );
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
    console.log("[Passport] OpenID Connect strategy configured successfully.");
  } catch (error) {
    console.error("[Passport] Failed to discover OpenID Issuer:", error);
    process.exit(1);
  }
}

export { configurePassport, passport };
