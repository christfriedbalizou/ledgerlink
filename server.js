// Oct 7 (Mon): Configuration Management
const dotenv = require('dotenv');
// Load environment variables from .env file
dotenv.config(); 

// Oct 1 (Tue): Project Scaffolding, init Node.js/Express
const express = require('express');
const app = express();

// Use the PORT from environment variables, or default to 3000
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ----------------------------------------------------
// Middleware Setup (Will be expanded in later phases)
// ----------------------------------------------------

// Basic body parser for JSON payloads
app.use(express.json()); 
// Basic URL-encoded body parser
app.use(express.urlencoded({ extended: true }));


// ----------------------------------------------------
// Routes
// ----------------------------------------------------

// Simple health check/base route
app.get('/', (req, res) => {
  res.send(`<h1>Application Running!</h1>
            <p>Environment: <strong>${NODE_ENV}</strong></p>
            <p>Time: ${new Date().toISOString()}</p>
            <p>Next Step: Implement Passport.js for OIDC/OAuth2 login (Oct 3)</p>`);
});

// Start the server
app.listen(PORT, () => {
  console.log(`[Server] App is running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`[Server] Access it at http://localhost:${PORT}`);
});