import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { configurePassport, passport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import { isLoggedIn } from './middleware/auth.js';

const app = express();
const PORT = process.env.APP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send(`<h1>Application Running!</h1>
            <p>Environment: <strong>${NODE_ENV}</strong></p>
            <p>Go to <a href="/auth/login">/auth/login</a> to begin the authentication flow.</p>
            <a href="/profile">View Your Profile (Protected)</a>`);
});
app.use('/auth', authRoutes);
app.get('/dashboard', isLoggedIn, (req, res) => {
  res.send(`<h1>Dashboard</h1>
            <p>Welcome to the protected dashboard, ${req.user.email}!</p>`);
});

async function startServer() {
  await configurePassport();
  app.listen(PORT, () => {
    console.log(`[Server] App is running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`[Server] Access it at http://localhost:${PORT}`);
  });
}

startServer();
