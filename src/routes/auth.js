import express from "express";

const router = express.Router();

import crypto from 'crypto';

router.get("/login", async (req, res, next) => {
  const mod = await import("../config/passport.js");
  const passport = mod.passport;
  // generate a strong random state and store it in session so the provider can echo it back
  const state = crypto.randomBytes(16).toString('hex');
  if (req.session) req.session.oidc_state = state;
  return passport.authenticate("oidc", { state })(req, res, next);
});

router.get("/callback", async (req, res, next) => {
  const mod = await import("../config/passport.js");
  const passport = mod.passport;
  return passport.authenticate("oidc", {
    failureRedirect: "/auth/login",
    successRedirect: "/dashboard",
  })(req, res, next);
});

router.get("/logout", (req, res, next) => {
  try {
    if (req.logout.length === 1) {
      // older signature: req.logout()
      req.logout();
      req.session?.destroy(() => res.redirect("/"));
    } else {
      req.logout((err) => {
        if (err) return next(err);
        req.session?.destroy(() => res.redirect("/"));
      });
    }
  } catch (err) {
    // fallback
    req.session?.destroy(() => res.redirect("/"));
  }
});

import { isLoggedIn } from "../middleware/auth.js";
router.get("/profile", isLoggedIn, (req, res) => {
  res.send(`<h1>Profile Page</h1>
    <p>Welcome, ${req.user.email}!</p>
    <p>Admin Status: ${req.user.is_admin ? "Yes" : "No"}</p>
    <a href="/auth/logout">Logout</a>`);
});

export default router;
