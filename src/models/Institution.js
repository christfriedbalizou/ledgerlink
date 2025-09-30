import prisma from "../db/prisma.js";

class Institution {
  static async findById(id) {
    return prisma.institution.findUnique({ where: { id } });
  }

  static async findByUserAndPlaidInstitutionId(userId, plaidInstitutionId) {
    return prisma.institution.findUnique({
      where: { userId_plaidInstitutionId: { userId, plaidInstitutionId } },
    });
  }

  static async countForUser(userId) {
    return prisma.institution.count({ where: { userId } });
  }

  static async canAdd(userId, maxInstitutions = 2) {
    const count = await this.countForUser(userId);
    return count < maxInstitutions;
  }

  static async findOrCreate(
    userId,
    plaidInstitutionId,
    name,
    { maxInstitutionsPerUser = 2, logo, primaryColor, url } = {},
  ) {
    let inst = await this.findByUserAndPlaidInstitutionId(userId, plaidInstitutionId);
    if (inst) {
      // If this record was previously soft-deleted (legacy data), hard purge & recreate to honor hard-delete semantics
      if (inst.deletedAt) {
        await prisma.$transaction(async (tx) => {
          await tx.account.deleteMany({ where: { institutionId: inst.id } });
          await tx.plaidItem.deleteMany({ where: { institutionId: inst.id } });
          await tx.institution.delete({ where: { id: inst.id } });
        });
      } else {
        return inst; // existing active institution
      }
    }
    // Re-check if we still have an active institution after potential purge
    inst = await this.findByUserAndPlaidInstitutionId(userId, plaidInstitutionId);
    if (inst) return inst;
    if (!(await this.canAdd(userId, maxInstitutionsPerUser))) {
      throw new Error(`Institution limit (${maxInstitutionsPerUser}) reached for user`);
    }
    return prisma.institution.create({
      data: { userId, plaidInstitutionId, name, logo, primaryColor, url },
    });
  }

  static async deleteForUser(userId, institutionId) {
    const inst = await this.findById(institutionId);
    if (!inst || inst.userId !== userId) return null;
    return prisma.institution.delete({ where: { id: institutionId } });
  }
}

export default Institution;
