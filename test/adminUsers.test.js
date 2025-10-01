import express from "express";
import request from "supertest";
import prisma from "../src/db/prisma.js";
import adminRouter from "../src/routes/admin.js";

// Helper middleware to inject an authenticated user
function mockIsLoggedIn(user) {
  return (req, _res, next) => {
    req.user = user; // what adminRouter guard relies on
    next();
  };
}

describe("Admin Users API", () => {
  let adminUser;
  let regularUser;
  let inactiveUser;

  function buildApp(user) {
    const app = express();
    app.use(express.json());
    // mimic server mounting: /admin, with preceding isLoggedIn middleware
    app.use("/admin", mockIsLoggedIn(user), adminRouter);
    return app;
  }

  beforeEach(async () => {
    // Clean slate
    await prisma.account.deleteMany();
    await prisma.plaidItem.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.user.deleteMany();

    adminUser = await prisma.user.create({
      data: { email: "admin-test@example.com", is_admin: true, active: true },
    });
    regularUser = await prisma.user.create({
      data: { email: "regular@example.com", is_admin: false, active: true },
    });
    inactiveUser = await prisma.user.create({
      data: { email: "inactive@example.com", is_admin: false, active: false },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists users (admin)", async () => {
    const app = buildApp(adminUser);
    const res = await request(app).get("/admin/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    const emails = res.body.users.map((u) => u.email).sort();
    expect(emails).toEqual([
      "admin-test@example.com",
      "inactive@example.com",
      "regular@example.com",
    ]);
    // Ensure required shape
    const sample = res.body.users[0];
    expect(sample).toHaveProperty("id");
    expect(sample).toHaveProperty("email");
    expect(sample).toHaveProperty("is_admin");
    expect(sample).toHaveProperty("active");
    expect(sample).toHaveProperty("createdAt");
  });

  it("toggles active when no body provided", async () => {
    const app = buildApp(adminUser);
    expect(regularUser.active).toBe(true);
    const res = await request(app).patch(`/admin/api/users/${regularUser.id}/active`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.active).toBe(false);
    // Confirm persisted
    const refreshed = await prisma.user.findUnique({
      where: { id: regularUser.id },
      select: { active: true },
    });
    expect(refreshed.active).toBe(false);
  });

  it("sets active explicitly via body", async () => {
    const app = buildApp(adminUser);
    // inactiveUser starts false -> set true
    const res = await request(app)
      .patch(`/admin/api/users/${inactiveUser.id}/active`)
      .send({ active: true });
    expect(res.status).toBe(200);
    expect(res.body.user.active).toBe(true);
    const refreshed = await prisma.user.findUnique({
      where: { id: inactiveUser.id },
      select: { active: true },
    });
    expect(refreshed.active).toBe(true);
  });

  it("returns 404 for unknown user id", async () => {
    const app = buildApp(adminUser);
    const res = await request(app).patch(
      "/admin/api/users/00000000-0000-0000-0000-000000000000/active",
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("denies non-admin access", async () => {
    const app = buildApp(regularUser); // not admin
    const res = await request(app).get("/admin/api/users");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("admin_required");
  });
});
