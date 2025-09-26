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
    // Remove plaidAccessToken if present in accountData
    const { plaidAccessToken, ...rest } = accountData;
    return prisma.account.create({ data: { ...rest, userId } });
  }

  static async removeById(userId, accountId) {
    return prisma.account.delete({ where: { id: accountId, userId } });
  }

  static async findByPlaidItemId(plaidItemId) {
    return prisma.account.findFirst({ where: { plaidItemId } });
  }
}

export default Account;
