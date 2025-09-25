const dotenv = require("dotenv");
// Load environment variables from .env file
dotenv.config();

const express = require("express");
const app = express();
const session = require("express-session");

const { configurePassport, passport } = require("./src/config/passport");
const authRoutes = require("./src/routes/auth");
const { isLoggedIn } = require("./src/middleware/auth");

// Use the PORT from environment variables, or default to 3000
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ----------------------------------------------------
// Middleware Setup
// ----------------------------------------------------

// Basic body parser for JSON payloads
app.use(express.json());
// Basic URL-encoded body parser
app.use(express.urlencoded({ extended: true }));

// Express Session Middleware
// The session secret must be a long, random string.
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Add other session options as needed for production, e.g., cookie settings
  }),
);

// Initialize Passport.js
// It must be used after the session middleware.
app.use(passport.initialize());
app.use(passport.session());

// ----------------------------------------------------
// Routes
// ----------------------------------------------------

// Simple health check/base route
app.get("/", (req, res) => {
  res.send(`<h1>Application Running!</h1>
            <p>Environment: <strong>${NODE_ENV}</strong></p>
            <p>Go to <a href="/auth/login">/auth/login</a> to begin the authentication flow.</p>
            <a href="/profile">View Your Profile (Protected)</a>`);
});

// Mount the authentication routes
app.use("/auth", authRoutes);

// A simple protected route to demonstrate middleware
app.get("/dashboard", isLoggedIn, (req, res) => {
  res.send(`<h1>Dashboard</h1>
            <p>Welcome to the protected dashboard, ${req.user.email}!</p>`);
});

// Asynchronously configure and start the server
async function startServer() {
  await configurePassport();
  app.listen(PORT, () => {
    console.log(`[Server] App is running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`[Server] Access it at http://localhost:${PORT}`);
  });
}

// Start the server
startServer();
