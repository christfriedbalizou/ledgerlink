// src/middleware/auth.js

/**
 * Middleware to check if a user is authenticated (logged in).
 * If authenticated, proceeds to the next middleware. Otherwise, redirects to login.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    // User is authenticated, proceed to the next handler
    return next();
  }
  // User is not authenticated, redirect to the login page
  res.redirect('/auth/login');
}

/**
 * Middleware to check if the authenticated user is an administrator.
 * If true, proceeds. Otherwise, sends a 403 Forbidden status.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
function isAdmin(req, res, next) {
  // First, check if the user is authenticated at all
  if (req.isAuthenticated() && req.user && req.user.is_admin) {
    return next();
  }
  // Forbidden access
  res.status(403).send('Access Denied: You must be an administrator.');
}

module.exports = { isLoggedIn, isAdmin };