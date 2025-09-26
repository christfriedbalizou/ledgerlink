import prisma from "../src/db/prisma.js";
import Account from "../src/models/Account.js";

describe("Account Model (Institution + Per-Institution Limits)", () => {
  let user;

  beforeEach(async () => {
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    user = await prisma.user.create({
      data: { email: "testuser@example.com", is_admin: false },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should link an account for a user", async () => {
    const account = await Account.createForUser(user.id, {
      plaidItemId: "item-abc",
      institutionName: "Test Bank",
      institutionId: "ins_abc",
    });
    expect(account).toHaveProperty("id");
    expect(account.userId).toBe(user.id);
  });

  it("should enforce per-institution account limit (default 1)", async () => {
    await Account.createForUser(
      user.id,
      {
        plaidItemId: "item-1",
        institutionName: "Bank 1",
        institutionId: "ins_1",
      },
      { maxAccountsPerInstitution: 1 },
    );
    await expect(
      Account.createForUser(
        user.id,
        {
          plaidItemId: "item-1-second",
          institutionName: "Bank 1 Second",
          institutionId: "ins_1",
        },
        { maxAccountsPerInstitution: 1 },
      ),
    ).rejects.toThrow(/Account per institution limit/);
  });

  it("should enforce institution limit (default 2)", async () => {
    await Account.createForUser(
      user.id,
      {
        plaidItemId: "item-1",
        institutionName: "Bank 1",
        institutionId: "ins_1",
      },
      { maxInstitutionsPerUser: 2 },
    );
    await Account.createForUser(
      user.id,
      {
        plaidItemId: "item-2",
        institutionName: "Bank 2",
        institutionId: "ins_2",
      },
      { maxInstitutionsPerUser: 2 },
    );
    await expect(
      Account.createForUser(
        user.id,
        {
          plaidItemId: "item-3",
          institutionName: "Bank 3",
          institutionId: "ins_3",
        },
        { maxInstitutionsPerUser: 2 },
      ),
    ).rejects.toThrow(/Institution limit/);
  });

  it("should remove an account by id", async () => {
    const account = await Account.createForUser(user.id, {
      plaidItemId: "item-x",
      institutionName: "Bank X",
      institutionId: "ins_x",
    });
    await Account.removeById(user.id, account.id);
    const found = await prisma.account.findUnique({
      where: { id: account.id },
    });
    expect(found).toBeNull();
  });
});
