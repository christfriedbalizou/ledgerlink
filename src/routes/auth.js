import express from "express";

import { passport } from "../config/passport.js";
import { isLoggedIn } from "../middleware/auth.js";

const router = express.Router();

router.get("/login", (req, res, next) => passport.authenticate("oidc")(req, res, next));

router.get("/callback", (req, res, next) =>
  passport.authenticate("oidc", {
    failureRedirect: "/login",
    successRedirect: "/profile",
  })(req, res, next),
);

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

router.get("/profile", isLoggedIn, (req, res) => {
  res.send(`<h1>Profile Page</h1>
    <p>Welcome, ${req.user.email}!</p>
    <p>Admin Status: ${req.user.is_admin ? "Yes" : "No"}</p>
    <a href="/auth/logout">Logout</a>`);
});

export default router;
