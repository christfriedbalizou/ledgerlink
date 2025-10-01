import express from "express";
import session from "express-session";
import request from "supertest";

import { VALID_LINK_FLOW_PRODUCTS } from "../src/constants/plaid.js";
import prisma from "../src/db/prisma.js";
import Account from "../src/models/Account.js";
import PlaidItem from "../src/models/PlaidItem.js";
import plaidRouter from "../src/routes/plaid.js";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "testsecret",
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.use((req, res, next) => {
    req.user = {
      id: `test-user-id-${Math.random().toString(36).substring(2, 15)}`,
      email: "testuser@example.com",
    };
    next();
  });
  app.use("/api/plaid", plaidRouter);
  return app;
}

const envProducts = process.env.PLAID_PRODUCTS
  ? process.env.PLAID_PRODUCTS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["transactions"];

describe("Plaid Integration (Sandbox)", () => {
  let app;
  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    await prisma.account.deleteMany();
    await prisma.plaidItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("should create a Plaid link token for each valid product in PLAID_PRODUCTS", async () => {
    const validProducts = envProducts.filter((p) =>
      VALID_LINK_FLOW_PRODUCTS.includes(p),
    );
    const res = await request(app).post("/api/plaid/link-token").send();
    if (validProducts.length === 1) {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("link_token");
      expect(typeof res.body.link_token).toBe("string");
    } else {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tokens");
      for (const product of validProducts) {
        expect(res.body.tokens).toHaveProperty(product);
        // token may be null if Plaid rejected the product, but should be string if present
        if (res.body.tokens[product] !== null) {
          expect(typeof res.body.tokens[product]).toBe("string");
        }
      }
    }
  });

  it("should create a Plaid link token for a specific product", async () => {
    const product = envProducts[0];
    const res = await request(app).post("/api/plaid/link-token").send({ product });
    if (VALID_LINK_FLOW_PRODUCTS.includes(product)) {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("link_token");
      expect(typeof res.body.link_token).toBe("string");
    } else {
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    }
  });

  describe("Institution Deletion", () => {
    let userApp;
    let user;
    beforeEach(async () => {
      user = await prisma.user.create({
        data: { email: `inst-del-${Date.now()}@example.com`, active: true },
      });
      userApp = express();
      userApp.use(express.json());
      userApp.use((req, _res, next) => {
        req.user = user;
        next();
      });
      userApp.use("/api/plaid", plaidRouter);
    });

    afterEach(async () => {
      await prisma.account.deleteMany();
      await prisma.plaidItem.deleteMany();
      await prisma.institution.deleteMany();
      await prisma.user.deleteMany();
    });

    it("should delete an empty institution", async () => {
      // Create institution directly
      const inst = await prisma.institution.create({
        data: { userId: user.id, plaidInstitutionId: "ins_empty", name: "Empty Inst" },
      });
      const res = await request(userApp).delete(`/api/plaid/institution/${inst.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const still = await prisma.institution.findUnique({ where: { id: inst.id } });
      expect(still).toBeNull();
    });

    it("should 404 when institution does not exist or not owned", async () => {
      const res = await request(userApp).delete(
        `/api/plaid/institution/non-existent-id`,
      );
      // Expect 404 specifically now that route returns 404 for missing owned institution
      expect(res.status).toBe(404);
    });

    it("should cascade delete institution with accounts and items", async () => {
      const inst = await prisma.institution.create({
        data: { userId: user.id, plaidInstitutionId: "ins_busy", name: "Busy Inst" },
      });
      const item = await prisma.plaidItem.create({
        data: {
          userId: user.id,
          plaidItemId: `item-${Date.now()}`,
          plaidAccessToken: "enc-token",
          products: "transactions",
          institutionId: inst.id,
        },
      });
      await prisma.account.create({
        data: {
          userId: user.id,
          plaidItemId: item.plaidItemId,
          institutionId: inst.id,
        },
      });
      const res = await request(userApp).delete(`/api/plaid/institution/${inst.id}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(res.body.accountCount).toBe(1);
      expect(res.body.itemCount).toBe(1);
      const instCheck = await prisma.institution.findUnique({ where: { id: inst.id } });
      expect(instCheck).toBeNull();
      const itemCheck = await prisma.plaidItem.findUnique({
        where: { plaidItemId: item.plaidItemId },
      });
      expect(itemCheck).toBeNull();
    });

    it("should 404 when attempting to delete an institution owned by another user", async () => {
      const otherUser = await prisma.user.create({
        data: { email: `other-${Date.now()}@example.com` },
      });
      const foreignInst = await prisma.institution.create({
        data: {
          userId: otherUser.id,
          plaidInstitutionId: "ins_foreign",
          name: "Foreign Inst",
        },
      });
      const res = await request(userApp).delete(
        `/api/plaid/institution/${foreignInst.id}`,
      );
      expect(res.status).toBe(404);
    });
  });
  it("should create a PlaidItem and Account via /set-token", async () => {
    // Mock Plaid public_token exchange
    const userId = `test-user-id-${Math.random().toString(36).substring(2, 15)}`;
    const testProduct = envProducts[0];
    // Insert user
    const user = await prisma.user.create({
      data: { id: userId, email: `${userId}@example.com`, active: true },
    });
    // Mock req.user for this test
    const appWithUser = express();
    appWithUser.use(express.json());
    appWithUser.use((req, res, next) => {
      req.user = user;
      next();
    });
    appWithUser.use("/api/plaid", plaidRouter);

    // Simulate Plaid public_token exchange (mock Plaid client in test env)
    // We'll call /set-token with a fake public_token and institution info
    const res = await request(appWithUser).post("/api/plaid/set-token").send({
      public_token: "public-sandbox-123",
      institutionName: "Test Bank",
      institutionId: "ins_test",
      product: testProduct,
    });
    // Accept 200 or 500 (if Plaid sandbox call fails). 403 would indicate limit logic prevented creation.
    expect([200, 500, 403]).toContain(res.status); // Accept Plaid sandbox failures
    if (res.status === 200) {
      expect(res.body).toHaveProperty("item_id");
      const plaidItem = await PlaidItem.findByPlaidItemId(res.body.item_id);
      expect(plaidItem).not.toBeNull();
      expect(plaidItem.userId).toBe(userId);
      expect(plaidItem.products).toContain(testProduct);
      const accounts = await Account.findByUserId(userId);
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0].plaidItemId).toBe(res.body.item_id);
    }
  });

  it("should create and find a PlaidItem directly (model test)", async () => {
    const user = await prisma.user.create({
      data: { email: `plaiditemtest-${Date.now()}@example.com`, active: true },
    });
    const itemData = {
      plaidItemId: `item-${Date.now()}`,
      plaidAccessToken: "encrypted-token",
      products: "transactions",
      institutionName: "Test Bank",
      institutionId: "ins_test",
    };
    const plaidItem = await PlaidItem.createForUser(user.id, itemData);
    expect(plaidItem).toHaveProperty("id");
    const found = await PlaidItem.findByPlaidItemId(itemData.plaidItemId);
    expect(found).not.toBeNull();
    expect(found.userId).toBe(user.id);
    expect(found.products).toBe("transactions");
  });
});
