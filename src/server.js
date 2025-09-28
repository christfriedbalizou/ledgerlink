import "dotenv/config";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import express from "express";
import { auth } from "express-openid-connect";
import session from "express-session";

import prisma from "./db/prisma.js";
import { isLoggedIn } from "./middleware/auth.js";
import User from "./models/User.js";
import authRoutes from "./routes/auth.js";
import plaidRouter from "./routes/plaid.js";
import { logger } from "./utils/logger.js";
import buildOidcConfig from "./config/oidc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.set("view engine", "ejs");
app.set("views", join(__dirname, "../views"));
app.use(express.static(join(__dirname, "../public")));

app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`[HTTP] --> ${req.method} ${req.url}`);
  res.once("finish", () => {
    const ms = Date.now() - start;
    logger.info(`[HTTP] <-- ${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
    const slowMs = parseInt(process.env.SLOW_MS || "500", 10);
    if (ms > slowMs) {
      logger.warn(
        `[HTTP] Slow request detected: ${req.method} ${req.url} ${ms}ms (threshold ${slowMs}ms)`,
      );
      logger.warn(new Error("Slow request stack").stack);
    }
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (NODE_ENV === "production") app.set("trust proxy", 1);

app.use(
  session({
    name: process.env.SESSION_NAME || "ledgerlink.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

async function startServer() {
  try {
    app.use(auth(buildOidcConfig({ port: PORT, nodeEnv: NODE_ENV })));

    app.use(async (req, res, next) => {
      try {
        if (!req.oidc?.isAuthenticated()) {
          req.user = null;
          res.locals.user = null;
          return next();
        }

        // Try to obtain email from common sources without forcing network calls.
        let email = req.oidc?.user?.email || req.session?.user?.email || null;

        // If we don't have an email yet, try fetching userinfo once as a fallback.
        if (!email) {
          try {
            if (req.oidc && typeof req.oidc.fetchUserInfo === "function") {
              const profile = await req.oidc.fetchUserInfo();
              email = profile?.email || null;
            } else if (req.oidc?.client && req.session?.access_token) {
              const profile = await req.oidc.client.userinfo(req.session.access_token);
              email = profile?.email || null;
            }
          } catch (e) {
            logger.debug("[Auth] fallback fetchUserInfo failed:", e.message || e);
          }
        }

        if (email) {
          // Ensure a local user exists; findOrCreate handles race conditions.
          const user = await User.findOrCreateByEmail(email);
          req.user = user || null;
          res.locals.user = user || null;
        } else {
          req.user = null;
          res.locals.user = null;
        }
      } catch (err) {
        logger.error("[Auth] Error loading/provisioning local user:", err.message || err);
        req.user = null;
        res.locals.user = null;
      }
      return next();
    });

    try {
      await prisma.$connect();
      logger.info("[Server] Database connection established");
    } catch (dbErr) {
      logger.error(
        "[Server] Failed to connect to the database:",
        dbErr.message || dbErr,
      );
      process.exit(1);
    }
  } catch (err) {
    logger.error("[Server] OIDC configuration failed:", err.message || err);
    process.exit(1);
  }

  app.use("/auth", authRoutes);
  app.use("/api/plaid", isLoggedIn, plaidRouter);

  app.get("/", (req, res) => {
    if (req.oidc?.isAuthenticated()) return res.redirect("/dashboard");
    res.render("login", { title: "Login - LedgerLink", user: null });
  });

  app.get("/dashboard", isLoggedIn, async (req, res) => {
    try {
      const accounts = [];
      res.render("dashboard", {
        title: "Dashboard - LedgerLink",
        user: req.user,
        accounts,
      });
    } catch (error) {
      logger.error("Dashboard error:", error);
      res.status(500).render("error", {
        title: "Error - LedgerLink",
        user: req.user,
        status: 500,
        message: "Internal Server Error",
        details: "Unable to load dashboard data",
      });
    }
  });

  app.get("/settings", isLoggedIn, (req, res) => {
    res.render("settings", { title: "Settings - LedgerLink", user: req.user });
  });

  app.get("/admin", isLoggedIn, (req, res) => {
    if (!req.user?.is_admin) {
      return res.status(403).render("error", {
        title: "Access Denied - LedgerLink",
        user: req.user,
        status: 403,
        message: "Access Denied",
        details: "You must be an administrator to access this page.",
      });
    }
    res.render("admin/global-settings", {
      title: "Admin Settings - LedgerLink",
      user: req.user,
      totalUsers: 0,
      totalInstitutions: 0,
      totalAccounts: 0,
      maxInstitutionsPerUser: process.env.MAX_INSTITUTIONS_PER_USER || 2,
      maxAccountsPerInstitution: process.env.MAX_ACCOUNTS_PER_INSTITUTION || 1,
    });
  });

  app.use((req, res) => {
    res.status(404).render("error", {
      title: "Page Not Found - LedgerLink",
      user: req.user || null,
      status: 404,
      message: "Page Not Found",
      details: "The page you requested could not be found.",
    });
  });

  app.use((err, req, res, _next) => {
    logger.error("Unhandled error:", err);
    res.status(500).render("error", {
      title: "Error - LedgerLink",
      user: req.user || null,
      status: 500,
      message: "Internal Server Error",
      details:
        NODE_ENV === "development" ? err.message : "Something went wrong on our end.",
    });
  });

  app.listen(PORT, () => {
    logger.info(`[Server] App is running in ${NODE_ENV} mode on port ${PORT}`);
    logger.info(`[Server] Access it at http://localhost:${PORT}`);
  });
}

startServer();
