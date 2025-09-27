import "dotenv/config";
import express from "express";
import session from "express-session";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let passport;
let configurePassport;
import { isLoggedIn } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import plaidRouter from "./routes/plaid.js";
import { logger } from "./utils/logger.js";
import prisma from './db/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.set('view engine', 'ejs');
app.set('views', join(__dirname, '../views'));

app.use(express.static(join(__dirname, '../public')));

app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`[HTTP] --> ${req.method} ${req.url}`);
  res.once('finish', () => {
    const ms = Date.now() - start;
    logger.info(`[HTTP] <-- ${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
    const slowMs = parseInt(process.env.SLOW_MS || '500', 10);
    if (ms > slowMs) {
      logger.warn(`[HTTP] Slow request detected: ${req.method} ${req.url} ${ms}ms (threshold ${slowMs}ms)`);
      logger.warn(new Error('Slow request stack').stack);
    }
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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

async function startServer() {
  try {
    const mod = await import('./config/passport.js');
    configurePassport = mod.configurePassport;
    passport = mod.passport;

    app.use(passport.initialize());
    app.use(passport.session());
    await configurePassport();

    try {
      await prisma.$connect();
      logger.info('[Server] Database connection established');
    } catch (dbErr) {
      logger.error('[Server] Failed to connect to the database:', dbErr.message || dbErr);
      process.exit(1);
    }
  } catch (err) {
    logger.error('[Server] passport configuration failed:', err.message || err);
    logger.error('[Server] OIDC is required in this deployment — exiting.');
    process.exit(1);
  }

  app.use('/auth', authRoutes);
  app.use('/api/plaid', isLoggedIn, plaidRouter);

  app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('login', { title: 'Login - LedgerLink', user: null });
  });

  app.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
      // TODO: Fetch user's accounts from database
      const accounts = [];
      res.render('dashboard', { title: 'Dashboard - LedgerLink', user: req.user, accounts });
    } catch (error) {
      logger.error('Dashboard error:', error);
      res.status(500).render('error', {
        title: 'Error - LedgerLink',
        user: req.user,
        status: 500,
        message: 'Internal Server Error',
        details: 'Unable to load dashboard data',
      });
    }
  });

  app.get('/settings', isLoggedIn, (req, res) => {
    res.render('settings', { title: 'Settings - LedgerLink', user: req.user });
  });

  app.get('/admin', isLoggedIn, (req, res) => {
    if (!req.user?.is_admin) {
      return res.status(403).render('error', {
        title: 'Access Denied - LedgerLink',
        user: req.user,
        status: 403,
        message: 'Access Denied',
        details: 'You must be an administrator to access this page.',
      });
    }
    res.render('admin/global-settings', {
      title: 'Admin Settings - LedgerLink',
      user: req.user,
      totalUsers: 0,
      totalInstitutions: 0,
      totalAccounts: 0,
      maxInstitutionsPerUser: process.env.MAX_INSTITUTIONS_PER_USER || 2,
      maxAccountsPerInstitution: process.env.MAX_ACCOUNTS_PER_INSTITUTION || 1,
    });
  });

  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'Page Not Found - LedgerLink',
      user: req.user || null,
      status: 404,
      message: 'Page Not Found',
      details: 'The page you requested could not be found.',
    });
  });

  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).render('error', {
      title: 'Error - LedgerLink',
      user: req.user || null,
      status: 500,
      message: 'Internal Server Error',
      details: NODE_ENV === 'development' ? err.message : 'Something went wrong on our end.',
    });
  });

  app.listen(PORT, () => {
    logger.info(`[Server] App is running in ${NODE_ENV} mode on port ${PORT}`);
    logger.info(`[Server] Access it at http://localhost:${PORT}`);
  });
}

startServer();
