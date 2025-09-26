import prisma from "../db/prisma.js";

class PlaidItem {
  static async createForUser(userId, itemData) {
    return prisma.plaidItem.create({ data: { ...itemData, userId } });
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
