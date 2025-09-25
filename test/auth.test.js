// test/auth.test.js

const request = require("supertest");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const authRoutes = require("../src/routes/auth");

const app = express();
app.use(express.json());
app.use(session({ secret: "test", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use("/auth", authRoutes);

describe("Authentication Routes", () => {
  it("should redirect to login provider on /auth/login", async () => {
    const res = await request(app).get("/auth/login");
    // Passport will redirect, so expect 302
    expect([302, 401]).toContain(res.statusCode);
  });

  it("should redirect to login if not authenticated on /auth/profile", async () => {
    const res = await request(app).get("/auth/profile");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
  });
});
