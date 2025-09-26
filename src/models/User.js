import prisma from "../db/prisma.js";

class User {
  static async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: { accounts: true },
    });
  }

  static async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });
  }

  static async create(userData) {
    return prisma.user.create({ data: userData });
  }

  static async adminExists() {
    const adminCount = await prisma.user.count({ where: { is_admin: true } });
    return adminCount > 0;
  }

  static async accountCount(userId) {
    return prisma.account.count({ where: { userId } });
  }

  static async canAddAccount(userId, maxAccounts = 2) {
    const count = await this.accountCount(userId);
    return count < maxAccounts;
  }
}

export default User;
