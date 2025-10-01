import prisma from "../src/db/prisma.js";
import Institution from "../src/models/Institution.js";

/**
 * Branding tests validate that logo (base64 sans data URI prefix), primaryColor and url
 * are persisted when creating institutions through the model directly.
 */

describe("Institution Branding", () => {
  let user;

  beforeEach(async () => {
    await prisma.account.deleteMany();
    await prisma.plaidItem.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.user.deleteMany();
    user = await prisma.user.create({
      data: { email: `branding-${Date.now()}@example.com`, active: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores branding fields when provided", async () => {
    const base64Logo = Buffer.from("fakeimage").toString("base64");
    const inst = await Institution.findOrCreate(
      user.id,
      "ins_brand_1",
      "Branded Bank",
      {
        logo: base64Logo,
        primaryColor: "112233",
        url: "https://bank.example.com",
      },
    );
    expect(inst.logo).toBe(base64Logo);
    expect(inst.primaryColor).toBe("112233");
    expect(inst.url).toBe("https://bank.example.com");
  });

  it("reuses same institution without duplicating when branding changes", async () => {
    const inst1 = await Institution.findOrCreate(
      user.id,
      "ins_brand_reuse",
      "Branded Bank",
      { logo: null, primaryColor: null, url: null },
    );
    const inst2 = await Institution.findOrCreate(
      user.id,
      "ins_brand_reuse",
      "Branded Bank Updated",
      { logo: null, primaryColor: null, url: null },
    );
    expect(inst1.id).toBe(inst2.id);
    // Name is not auto-updated if record already exists (current semantics)
    const stored = await prisma.institution.findUnique({ where: { id: inst1.id } });
    expect(stored.name).toBe(inst1.name);
  });
});
