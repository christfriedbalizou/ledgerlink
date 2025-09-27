import express from "express";

// Defer importing passport until the route is mounted by server.js to avoid import-time side effects
const router = express.Router();

router.get("/login", async (req, res, next) => {
  const mod = await import("../config/passport.js");
  const passport = mod.passport;
  return passport.authenticate("oidc")(req, res, next);
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
  // req.logout may be a stub if passport isn't configured; accept both signatures
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
