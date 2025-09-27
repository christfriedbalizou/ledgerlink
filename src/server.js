import "dotenv/config";
import express from "express";
import session from "express-session";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// passport/configurePassport is imported dynamically in startServer to avoid import-time errors
let passport;
let configurePassport;
import { isLoggedIn } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import plaidRouter from "./routes/plaid.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// View engine setup
app.set('view engine', 'ejs');
app.set('views', join(__dirname, '../views'));

// Static files
app.use(express.static(join(__dirname, '../public')));

// Simple HTTP request logger to diagnose request handling and hangs
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`[HTTP] --> ${req.method} ${req.url}`);
  res.once('finish', () => {
    const ms = Date.now() - start;
    logger.info(`[HTTP] <-- ${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
    // If the request was slow, also log a stack trace to help investigate where it blocked
    const slowMs = parseInt(process.env.SLOW_MS || '500', 10);
    if (ms > slowMs) {
      logger.warn(`[HTTP] Slow request detected: ${req.method} ${req.url} ${ms}ms (threshold ${slowMs}ms)`);
      // capture a stack (helps locate middleware/route causing delay)
      logger.warn(new Error('Slow request stack').stack);
    }
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure proxy trust when running behind a reverse proxy (e.g., production)
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Improve session cookie settings so OIDC redirect callbacks will send the cookie
// (state/nonce are stored in session). sameSite='lax' allows top-level GET redirects
// from the identity provider to include the cookie. secure should be true in prod.
// Use a named cookie to avoid collisions.
app.use(
  session({
    name: process.env.SESSION_NAME || 'ledgerlink.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }),
);

// Lightweight fallback when passport hasn't been initialized yet.
// When REQUIRE_OIDC=true we want strict behavior: fail fast when OIDC env is missing
const REQUIRE_OIDC = process.env.REQUIRE_OIDC === 'true';
if (!REQUIRE_OIDC) {
  // provide a safe fallback for local dev so the app doesn't throw when Passport isn't configured
  app.use((req, res, next) => {
    if (typeof req.isAuthenticated !== 'function') {
      req.isAuthenticated = () => false;
      // stub login/logout to avoid failures if called before passport is ready
      req.login = req.login || function () {};
      req.logout = req.logout || function () {};
    }
    next();
  });
} else {
  logger.info('[Server] REQUIRE_OIDC=true — strict OIDC mode enabled; no auth fallbacks will be applied');
}

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    title: 'Login - LedgerLink',
    user: null 
  });
});

app.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    // TODO: Fetch user's accounts from database
    const accounts = []; // await Account.findByUserId(req.user.id);
    
    res.render('dashboard', {
      title: 'Dashboard - LedgerLink',
      user: req.user,
      accounts
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error - LedgerLink',
      user: req.user,
      status: 500,
      message: 'Internal Server Error',
      details: 'Unable to load dashboard data'
    });
  }
});

app.get("/settings", isLoggedIn, (req, res) => {
  res.render('settings', {
    title: 'Settings - LedgerLink',
    user: req.user
  });
});

app.get("/admin", isLoggedIn, (req, res) => {
  if (!req.user?.is_admin) {
    return res.status(403).render('error', {
      title: 'Access Denied - LedgerLink',
      user: req.user,
      status: 403,
      message: 'Access Denied',
      details: 'You must be an administrator to access this page.'
    });
  }
  
  res.render('admin/global-settings', {
    title: 'Admin Settings - LedgerLink',
    user: req.user,
    totalUsers: 0, // TODO: Get from database
    totalInstitutions: 0, // TODO: Get from database  
    totalAccounts: 0, // TODO: Get from database
    maxInstitutionsPerUser: process.env.MAX_INSTITUTIONS_PER_USER || 2,
    maxAccountsPerInstitution: process.env.MAX_ACCOUNTS_PER_INSTITUTION || 1
  });
});

// Note: auth routes are mounted after passport is initialized inside startServer()
// to ensure passport.initialize() and passport.session() run before route handlers.
// app.use("/auth", authRoutes); // mounted in startServer()
// app.use("/api/plaid", isLoggedIn, plaidRouter); // mounted in startServer() after passport

// Error handling middleware
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found - LedgerLink',
    user: req.user || null,
    status: 404,
    message: 'Page Not Found',
    details: 'The page you requested could not be found.'
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).render('error', {
    title: 'Error - LedgerLink',
    user: req.user || null,
    status: 500,
    message: 'Internal Server Error',
    details: NODE_ENV === 'development' ? err.message : 'Something went wrong on our end.'
  });
});

async function startServer() {
  try {
    const mod = await import('./config/passport.js');
    configurePassport = mod.configurePassport;
    passport = mod.passport;
    // initialize passport middleware now that we have the instance
    app.use(passport.initialize());
    app.use(passport.session());
    await configurePassport();
    // Mount auth and plaid routes after passport is initialized so session/state is available
    app.use('/auth', (await import('./routes/auth.js')).default);
    app.use('/api/plaid', isLoggedIn, (await import('./routes/plaid.js')).default);
  } catch (err) {
    logger.warn('[Server] passport configuration skipped or failed at import time:', err.message || err);
    // proceed without passport configured (useful for local dev without OIDC env)
  }
  app.listen(PORT, () => {
    logger.info(`[Server] App is running in ${NODE_ENV} mode on port ${PORT}`);
    logger.info(`[Server] Access it at http://localhost:${PORT}`);
  });
}

startServer();
