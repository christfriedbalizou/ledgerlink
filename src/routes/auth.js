import express from "express";
import { passport } from "../config/passport.js";
import { isLoggedIn } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.get("/login", (req, res, next) => {
  logger.info("Login route accessed");
  passport.authenticate("oidc")(req, res, next);
});

router.get("/callback", (req, res, next) => {
  logger.info("OIDC callback route accessed");
  passport.authenticate("oidc", {
    failureRedirect: "/login",
    successRedirect: "/profile",
  })(req, res, next);
});

router.get("/logout", (req, res, next) => {
  logger.info("Logout route accessed");
  req.logout((err) => {
    if (err) {
      logger.error("Logout error", err);
      return next(err);
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        logger.error("Error destroying session:", destroyErr);
      }
      res.redirect("/");
    });
  });
});

router.get("/profile", isLoggedIn, (req, res) => {
  logger.info(`Profile route accessed by user: ${req.user?.email}`);
  res.send(`
    <h1>Profile Page</h1>
    <p>Welcome, ${req.user.email}!</p>
    <p>Admin Status: ${req.user.is_admin ? "Yes" : "No"}</p>
    <a href="/auth/logout">Logout</a>
  `);
});

export default router;
<a href="/auth/logout">Logout</a>;
