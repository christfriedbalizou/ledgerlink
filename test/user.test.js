import request from "supertest";
import express from "express";
import User from "../src/models/User.js";
import prisma from "../src/db/prisma.js";

// Mock Express app for authentication route testing
const app = express();
app.use(express.json());

// Helper to clear users before each test
beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("User Model", () => {
  it("should create a new user", async () => {
    const userData = { email: "test@example.com", is_admin: false };
    const user = await User.create(userData);
    expect(user).toHaveProperty("id");
    expect(user.email).toBe(userData.email);
  });

  it("should find a user by email", async () => {
    const userData = { email: "findme@example.com", is_admin: false };
    await User.create(userData);
    const user = await User.findByEmail(userData.email);
    expect(user).not.toBeNull();
    expect(user.email).toBe(userData.email);
  });

  it("should check if admin exists", async () => {
    expect(await User.adminExists()).toBe(false);
    await User.create({ email: "admin@example.com", is_admin: true });
    expect(await User.adminExists()).toBe(true);
  });
});
