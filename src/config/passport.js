import "dotenv/config";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import crypto from 'crypto';
import fs from 'fs';

import User from "../models/User.js";
import { logger } from "../utils/logger.js";

let oidcClient = null;

async function configurePassport() {
  const client_id = process.env.OIDC_CLIENT_ID;
  const client_secret = process.env.OIDC_CLIENT_SECRET;
  const issuer_url = process.env.OIDC_ISSUER_URL;
  const redirect_uri = process.env.OIDC_CALLBACK_URL;

  if (!issuer_url || !client_id || !client_secret || !redirect_uri) return;

  try {
    const config = await client.discovery(new URL(issuer_url), client_id, client_secret);
    // keep the discovered client so helpers can build auth urls
    oidcClient = config;
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

function appendDebug(obj) {
  try {
    fs.appendFileSync('/tmp/oidc_debug.log', JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n');
  } catch (e) {
    logger.debug('[Passport] appendDebug failed', e.message || e);
  }
}

function buildAuthUrl(req) {
  if (!oidcClient) throw new Error('OIDC client not configured');
  const { generators } = client;
  let state = generators.state();
  // ensure state meets Authelia's minimum entropy (>=8 chars)
  if (!state || String(state).length < 8) {
    state = crypto.randomBytes(16).toString('hex');
  }
  const nonce = generators.nonce();
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  if (!req.session) throw new Error('Session is required for OIDC flow');
  req.session.oidc_state = state;
  req.session.oidc_nonce = nonce;
  req.session.oidc_code_verifier = code_verifier;
  const url = oidcClient.authorizationUrl({
    scope: 'openid email profile',
    code_challenge: code_challenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });
  appendDebug({ event: 'build-auth-url', sessionID: req.sessionID, state_length: String(state).length });
  return url;
}

export { configurePassport, passport };
