// test/auth.test.js

const request = require("supertest");
const express = require("express");

// Mock authentication middleware
const isLoggedIn = (req, res, next) => {
  if (req.headers["x-mock-authenticated"]) {
    req.user = { email: "mock@example.com", is_admin: false };
    return next();
  }
  res.redirect("/auth/login");
};

const app = express();
app.use(express.json());

// Mock routes
app.get("/auth/login", (req, res) => {
  res.status(302).redirect("http://mock-oauth-provider");
});
app.get("/auth/profile", isLoggedIn, (req, res) => {
  res.status(200).json({ email: req.user.email, is_admin: req.user.is_admin });
});

describe("Authentication Routes (Mocked)", () => {
  it("should redirect to login provider on /auth/login", async () => {
    const res = await request(app).get("/auth/login");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("http://mock-oauth-provider");
  });

  it("should redirect to login if not authenticated on /auth/profile", async () => {
    const res = await request(app).get("/auth/profile");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
  });

  it("should return profile if authenticated", async () => {
    const res = await request(app)
      .get("/auth/profile")
      .set("x-mock-authenticated", "1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ email: "mock@example.com", is_admin: false });
  });
});
