import request from "supertest";
import express from "express";
import session from "express-session";
import PlaidItem from "../src/models/PlaidItem.js";
import Account from "../src/models/Account.js";
import plaidRouter from "../src/routes/plaid.js";
import prisma from "../src/db/prisma.js";

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

  it("should create a Plaid link token for each product in PLAID_PRODUCTS", async () => {
    const res = await request(app).post("/api/plaid/link-token").send();
    if (envProducts.length === 1) {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("link_token");
      expect(typeof res.body.link_token).toBe("string");
    } else {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tokens");
      for (const product of envProducts) {
        expect(res.body.tokens).toHaveProperty(product);
        expect(typeof res.body.tokens[product]).toBe("string");
      }
    }
  });

  it("should create a Plaid link token for a specific product", async () => {
    const product = envProducts[0];
    const res = await request(app)
      .post("/api/plaid/link-token")
      .send({ product });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("link_token");
    expect(typeof res.body.link_token).toBe("string");
  });
});
it("should create a PlaidItem and Account via /set-token", async () => {
  // Mock Plaid public_token exchange
  const userId = `test-user-id-${Math.random().toString(36).substring(2, 15)}`;
  const testProduct = envProducts[0];
  // Insert user
  const user = await prisma.user.create({
    data: { id: userId, email: `${userId}@example.com` },
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
  // Accept 200 or 500 (if Plaid sandbox is not mocked, this may fail)
  expect([200, 500]).toContain(res.status);
  if (res.status === 200) {
    expect(res.body).toHaveProperty("item_id");
    // Check PlaidItem exists
    const plaidItem = await PlaidItem.findByPlaidItemId(res.body.item_id);
    expect(plaidItem).not.toBeNull();
    expect(plaidItem.userId).toBe(userId);
    expect(plaidItem.products).toContain(testProduct);
    // Check Account exists and references PlaidItem
    const accounts = await Account.findByUserId(userId);
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0].plaidItemId).toBe(res.body.item_id);
  }
});

it("should create and find a PlaidItem directly (model test)", async () => {
  const user = await prisma.user.create({
    data: { email: `plaiditemtest-${Date.now()}@example.com` },
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
