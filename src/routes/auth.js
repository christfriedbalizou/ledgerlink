// src/routes/auth.js

const router = require("express").Router();
const { passport } = require("../config/passport");
const { isLoggedIn } = require("../middleware/auth");

// Route to initiate the login process. Passport will redirect to the OAuth provider.
router.get("/login", passport.authenticate("oidc"));

// Route for the callback from the OAuth provider.
// Passport handles the token exchange and profile fetching.
router.get(
  "/callback",
  passport.authenticate("oidc", {
    failureRedirect: "/login", // Redirect on failure
    successRedirect: "/profile", // Redirect on success
  }),
);

// Route to log out a user.
router.get("/logout", (req, res, next) => {
  // Destroy the user session
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // Clear the session from the database
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Error destroying session:", destroyErr);
      }
      res.redirect("/");
    });
  });
});

// A protected profile route to test the isLoggedIn middleware.
router.get("/profile", isLoggedIn, (req, res) => {
  res.send(`
    <h1>Profile Page</h1>
    <p>Welcome, ${req.user.email}!</p>
    <p>Admin Status: ${req.user.is_admin ? "Yes" : "No"}</p>
    <a href="/auth/logout">Logout</a>
  `);
});

module.exports = router;
