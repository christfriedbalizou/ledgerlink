import prisma from "../db/prisma.js";

import Institution from "./Institution.js";

class PlaidItem {
  static async createForUser(userId, itemData) {
    let { institutionId, institutionName, plaidInstitutionId } = itemData;

    const isUuid = (val) => typeof val === "string" && /^[0-9a-fA-F-]{36}$/.test(val);

    if (institutionId && !isUuid(institutionId) && !plaidInstitutionId) {
      plaidInstitutionId = institutionId;
      institutionId = null;
    }

    if (!institutionId && plaidInstitutionId) {
      const inst = await Institution.findOrCreate(
        userId,
        plaidInstitutionId,
        institutionName || "Unknown Institution",
      );
      institutionId = inst.id;
    }

    if (!institutionId) {
      throw new Error("institutionId or plaidInstitutionId required");
    }

    if (institutionId && isUuid(institutionId)) {
      const exists = await Institution.findById(institutionId);
      if (!exists) {
        throw new Error(
          `Provided institutionId ${institutionId} does not exist for user`,
        );
      }
    }

    const {
      institutionName: _n,
      plaidInstitutionId: _pi,
      institutionId: _inputInstitutionId,
      ...rest
    } = itemData;
    return prisma.plaidItem.create({
      data: { ...rest, userId, institutionId },
    });
  }

  static async findByUserIdAndProduct(userId, product) {
    return prisma.plaidItem.findFirst({
      where: {
        userId,
        products: { contains: product },
      },
    });
  }

  static async findByPlaidItemId(plaidItemId) {
    return prisma.plaidItem.findUnique({ where: { plaidItemId } });
  }

  static async allForUser(userId) {
    return prisma.plaidItem.findMany({ where: { userId } });
  }
}

export default PlaidItem;
