import Account from "../src/models/Account.js";
import prisma from "../src/db/prisma.js";

describe("Account Model", () => {
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

  it("should enforce account limit (default 2)", async () => {
    await Account.createForUser(user.id, {
      plaidItemId: "item-1",
      institutionName: "Bank 1",
      institutionId: "ins_1",
    });
    await Account.createForUser(user.id, {
      plaidItemId: "item-2",
      institutionName: "Bank 2",
      institutionId: "ins_2",
    });
    await expect(
      Account.createForUser(user.id, {
        plaidItemId: "item-3",
        institutionName: "Bank 3",
        institutionId: "ins_3",
      }),
    ).rejects.toThrow(/Account limit/);
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
