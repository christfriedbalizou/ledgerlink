import express from "express";
import request from "supertest";
import prisma from "../src/db/prisma.js";

// Build a minimal app that mimics the production routes for user settings
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(async (req, _res, next) => {
    if (!req.user) {
      // Attach user (created in individual tests) via header-provided email
      const email = req.headers["x-test-user-email"];
      if (email) {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({ data: { email } });
        }
        req.user = user;
      }
    }
    next();
  });

  const DEFAULT_ENABLE_ACTUAL = () =>
    /^true$/i.test(process.env.ENABLE_ACTUAL || "false");

  app.get("/api/user/settings", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    try {
      const setting = await prisma.userSetting.findUnique({
        where: { userId: req.user.id },
      });
      return res.json({
        enableActual: setting?.enableActual ?? DEFAULT_ENABLE_ACTUAL(),
        enableEmailExport: setting?.enableEmailExport || false,
      });
    } catch (e) {
      return res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.post("/api/user/settings", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    try {
      const { enableActual, enableEmailExport } = req.body || {};
      const cleaned = {};
      if (enableActual !== undefined) cleaned.enableActual = !!enableActual;
      if (enableEmailExport !== undefined)
        cleaned.enableEmailExport = !!enableEmailExport;
      const existing = await prisma.userSetting.findUnique({
        where: { userId: req.user.id },
      });
      const saved = existing
        ? await prisma.userSetting.update({
            where: { userId: req.user.id },
            data: cleaned,
          })
        : await prisma.userSetting.create({
            data: { userId: req.user.id, ...cleaned },
          });
      return res.json({ ok: true, settings: saved });
    } catch (e) {
      return res.status(500).json({ error: "Failed to save settings" });
    }
  });

  return app;
}

describe("/api/user/settings", () => {
  let app;
  const testEmail = () =>
    `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.userSetting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("returns fallback values when no setting row exists (ENABLE_ACTUAL=true)", async () => {
    process.env.ENABLE_ACTUAL = "true";
    const email = testEmail();
    const res = await request(app)
      .get("/api/user/settings")
      .set("x-test-user-email", email);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enableActual: true, enableEmailExport: false });
  });

  it("returns fallback false when ENABLE_ACTUAL=false and no row exists", async () => {
    process.env.ENABLE_ACTUAL = "false";
    const email = testEmail();
    const res = await request(app)
      .get("/api/user/settings")
      .set("x-test-user-email", email);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enableActual: false, enableEmailExport: false });
  });

  it("persists and returns overridden values after POST", async () => {
    process.env.ENABLE_ACTUAL = "true"; // fallback would be true
    const email = testEmail();
    // Set custom values (turn off actual, enable email export)
    const post = await request(app)
      .post("/api/user/settings")
      .set("x-test-user-email", email)
      .send({ enableActual: false, enableEmailExport: true });
    expect(post.status).toBe(200);
    expect(post.body.ok).toBe(true);
    expect(post.body.settings.enableActual).toBe(false);
    expect(post.body.settings.enableEmailExport).toBe(true);
    // Subsequent GET should reflect stored values, not fallback
    const getAfter = await request(app)
      .get("/api/user/settings")
      .set("x-test-user-email", email);
    expect(getAfter.status).toBe(200);
    expect(getAfter.body).toEqual({ enableActual: false, enableEmailExport: true });
  });
});
