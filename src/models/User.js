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

  static async findOrCreateByEmail(email) {
    if (!email) return null;
    const existing = await this.findByEmail(email);
    if (existing) return existing;
    const adminExists = await this.adminExists();
    const isAdmin = !adminExists;
    try {
      return await prisma.user.create({ data: { email, is_admin: isAdmin } });
    } catch (err) {
      if (err?.code === "P2002") {
        return await this.findByEmail(email);
      }
      throw err;
    }
  }

  static async institutionCount(userId) {
    return prisma.institution.count({ where: { userId } });
  }

  static async accountCountForInstitution(userId, institutionId) {
    return prisma.account.count({ where: { userId, institutionId } });
  }

  static async canAddInstitution(userId, maxInstitutions = 2) {
    const count = await this.institutionCount(userId);
    return count < maxInstitutions;
  }

  static async canAddAccountToInstitution(
    userId,
    institutionId,
    maxAccountsPerInstitution = 1,
  ) {
    const count = await this.accountCountForInstitution(userId, institutionId);
    return count < maxAccountsPerInstitution;
  }
}

export default User;
