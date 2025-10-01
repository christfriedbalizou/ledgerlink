import express from "express";
import request from "supertest";
import prisma from "../src/db/prisma.js";
import { logger } from "../src/utils/logger.js";
import plaidRouter from "../src/routes/plaid.js";

// Basic test to ensure /api/plaid/event endpoint logs and responds.

describe("Plaid Event Logging Endpoint", () => {
  let app;
  let user;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: { email: `events-${Date.now()}@example.com`, active: true },
    });
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use("/api/plaid", plaidRouter);
  });

  afterAll(async () => {
    await prisma.account.deleteMany();
    await prisma.plaidItem.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("returns 400 when eventName missing", async () => {
    const res = await request(app)
      .post("/api/plaid/event")
      .send({ metadata: { foo: "bar" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing eventName/);
  });

  it("accepts a valid event", async () => {
    const res = await request(app)
      .post("/api/plaid/event")
      .send({ eventName: "OPEN", metadata: { step: "init" } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
