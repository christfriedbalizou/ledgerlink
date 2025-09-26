import prisma from "../db/prisma.js";

class Account {
  static async findByUserId(userId) {
    return prisma.account.findMany({ where: { userId } });
  }

  static async createForUser(userId, accountData, maxAccounts = 2) {
    const count = await prisma.account.count({ where: { userId } });
    if (count >= maxAccounts) {
      throw new Error(`Account limit (${maxAccounts}) reached.`);
    }
    return prisma.account.create({ data: { ...accountData, userId } });
  }

  static async removeById(userId, accountId) {
    return prisma.account.deleteMany({ where: { id: accountId, userId } });
  }

  static async findByPlaidItemId(plaidItemId) {
    return prisma.account.findUnique({ where: { plaidItemId } });
  }
}

export default Account;
