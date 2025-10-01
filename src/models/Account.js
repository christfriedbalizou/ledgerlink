import prisma from "../db/prisma.js";

import Institution from "./Institution.js";

class Account {
  static async findByUserId(userId) {
    return prisma.account.findMany({ where: { userId } });
  }

  static async findByUserAndInstitution(userId, institutionId) {
    return prisma.account.findMany({ where: { userId, institutionId } });
  }

  static async createForUser(
    userId,
    accountData,
    { maxInstitutionsPerUser = 2, maxAccountsPerInstitution = 1 } = {},
  ) {
    let { institutionId, institutionName, plaidInstitutionId } = accountData;

    const isUuid = (val) => typeof val === "string" && /^[0-9a-fA-F-]{36}$/.test(val);

    if (institutionId && !isUuid(institutionId) && !plaidInstitutionId) {
      plaidInstitutionId = institutionId;
      institutionId = null; // we'll resolve below
    }

    if (!institutionId && plaidInstitutionId) {
      const inst = await Institution.findOrCreate(
        userId,
        plaidInstitutionId,
        institutionName || "Unknown Institution",
        { maxInstitutionsPerUser },
      );
      institutionId = inst.id;
    }

    if (institutionId && isUuid(institutionId)) {
      const exists = await Institution.findById(institutionId);
      if (!exists) {
        throw new Error(
          `Provided institutionId ${institutionId} does not exist for user`,
        );
      }
    }

    if (!institutionId) {
      throw new Error(
        "institutionId or plaidInstitutionId is required to create an account",
      );
    }

    const existingInstitutions = await prisma.account.findMany({
      where: { userId },
      select: { institutionId: true },
      distinct: ["institutionId"],
    });
    const isNewInstitution = !existingInstitutions.some(
      (i) => i.institutionId === institutionId,
    );
    if (isNewInstitution && existingInstitutions.length >= maxInstitutionsPerUser) {
      throw new Error(`Institution limit (${maxInstitutionsPerUser}) reached for user`);
    }

    const accountsForInstitution = await prisma.account.count({
      where: { userId, institutionId },
    });
    if (accountsForInstitution >= maxAccountsPerInstitution) {
      throw new Error(
        `Account per institution limit (${maxAccountsPerInstitution}) reached for institution ${institutionId}`,
      );
    }

    const {
      plaidAccessToken: _plaidAccessToken, // ignored for Account persistence
      institutionName: _n,
      plaidInstitutionId: _pi,
      institutionId: _inputInstitutionId, // we already resolved to institutionId variable
      name,
      officialName,
      mask,
      type,
      subtype,
      ...rest
    } = accountData; // strip extraneous / unused
    return prisma.account.create({
      data: {
        ...rest,
        userId,
        institutionId,
        name: name || null,
        officialName: officialName || null,
        mask: mask || null,
        type: type || null,
        subtype: subtype || null,
      },
    });
  }

  static async removeById(userId, accountId) {
    return prisma.account.delete({ where: { id: accountId, userId } });
  }

  static async findByPlaidItemId(plaidItemId) {
    return prisma.account.findMany({ where: { plaidItemId } });
  }

  static async findByPlaidAccountId(plaidAccountId) {
    return prisma.account.findUnique({ where: { plaidAccountId } });
  }
}

export default Account;
