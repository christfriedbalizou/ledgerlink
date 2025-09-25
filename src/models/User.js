const prisma = require("../db/prisma");

/**
 * A module to handle all database operations related to the User model.
 * This provides a clean separation of concerns from the main application logic.
 */
class User {
  /**
   * Finds a user by their unique ID.
   * @param {string} id The user's unique ID.
   * @returns {Promise<object | null>} The user object or null if not found.
   */
  static async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  /**
   * Finds a user by their email address.
   * @param {string} email The user's email address.
   * @returns {Promise<object | null>} The user object or null if not found.
   */
  static async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  /**
   * Creates a new user in the database.
   * @param {object} userData The data for the new user.
   * @returns {Promise<object>} The newly created user object.
   */
  static async create(userData) {
    return prisma.user.create({ data: userData });
  }

  /**
   * Checks if an admin user already exists in the database.
   * @returns {Promise<boolean>} True if an admin exists, false otherwise.
   */
  static async adminExists() {
    const adminCount = await prisma.user.count({ where: { is_admin: true } });
    return adminCount > 0;
  }
}

module.exports = User;
