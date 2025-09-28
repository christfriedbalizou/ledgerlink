import express from "express";
import { isLoggedIn } from "../middleware/auth.js";

const router = express.Router();

router.get("/login", (req, res) => res.oidc.login({ returnTo: "/dashboard" }));
router.get("/logout", (req, res) => res.oidc.logout({ postLogoutRedirect: "/" }));

router.get("/profile", isLoggedIn, (req, res) => {
  const user = req.oidc.user || {};
  res.send(`<h1>Profile Page</h1>
    <p>Welcome, ${user.email || "unknown"}!</p>
    <p>Admin Status: ${user.is_admin ? "Yes" : "No"}</p>
    <a href="/auth/logout">Logout</a>`);
});

export default router;
