import prisma from "../db/prisma.js";

async function isLoggedIn(req, res, next) {
  if (!req.oidc?.isAuthenticated()) return res.redirect("/auth/login");
  try {
    const email = req.oidc.user?.email;
    if (!email) return res.redirect("/auth/login");
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser || !dbUser.active) {
      // Optionally could call req.oidc.logout but we just redirect to login
      return res.redirect("/auth/login");
    }
    // augment oidc user object with db fields (active, is_admin) if missing
    req.oidc.user.is_admin = dbUser.is_admin;
    req.oidc.user.active = dbUser.active;
    req.user = dbUser; // convenience for downstream
    return next();
  } catch (e) {
    return res.status(500).send("Authentication check failed");
  }
}

async function isAdmin(req, res, next) {
  if (!req.oidc?.isAuthenticated()) return res.redirect("/auth/login");
  try {
    const email = req.oidc.user?.email;
    if (!email) return res.redirect("/auth/login");
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser || !dbUser.active) return res.redirect("/auth/login");
    if (!dbUser.is_admin) {
      return res.status(403).send("Access Denied: You must be an administrator.");
    }
    req.oidc.user.is_admin = dbUser.is_admin;
    req.oidc.user.active = dbUser.active;
    req.user = dbUser;
    return next();
  } catch (e) {
    return res.status(500).send("Authentication check failed");
  }
}

export { isLoggedIn, isAdmin };
