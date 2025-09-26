function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/login");
}

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user?.is_admin) return next();
  res.status(403).send("Access Denied: You must be an administrator.");
}

export { isLoggedIn, isAdmin };
