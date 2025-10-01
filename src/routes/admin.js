import express from "express";
import prisma from "../db/prisma.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.use((req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    if (req.path.startsWith("/api")) {
      return res.status(403).json({ error: "admin_required" });
    }
    return res.status(403).render("error", {
      title: "Access Denied - LedgerLink",
      user: req.user,
      status: 403,
      message: "Access Denied",
      details: "You must be an administrator to access this page.",
    });
  }
  return next();
});

router.get("/", async (req, res) => {
  try {
    const [totalUsers, totalInstitutions, totalAccounts] = await Promise.all([
      prisma.user.count(),
      prisma.institution.count(),
      prisma.account.count(),
    ]);
    const syncStatus = "Operational"; // placeholder
    const generalSettings = {
      NODE_ENV: process.env.NODE_ENV || null,
      BASE_URL: process.env.BASE_URL || null,
      DATABASE_PROVIDER: process.env.DATABASE_PROVIDER || null,
      MAX_INSTITUTIONS_PER_USER: process.env.MAX_INSTITUTIONS_PER_USER || null,
      MAX_ACCOUNTS_PER_INSTITUTION: process.env.MAX_ACCOUNTS_PER_INSTITUTION || null,
      ENABLE_ACTUAL: process.env.ENABLE_ACTUAL || null,
    };
    const plaidSettings = {
      PLAID_PRODUCTS: process.env.PLAID_PRODUCTS || null,
      PLAID_COUNTRY_CODES: process.env.PLAID_COUNTRY_CODES || null,
      PLAID_LANGUAGE: process.env.PLAID_LANGUAGE || null,
      PLAID_ENV: process.env.PLAID_ENV || null,
    };
    res.render("admin/stats", {
      title: "Admin Statistics - LedgerLink",
      user: req.user,
      currentPage: "admin",
      totalUsers,
      totalInstitutions,
      totalAccounts,
      syncStatus,
      generalSettings,
      plaidSettings,
    });
  } catch (e) {
    logger.error("Admin stats error:", e);
    res.status(500).render("error", {
      title: "Error - LedgerLink",
      user: req.user,
      status: 500,
      message: "Internal Server Error",
      details: "Unable to load admin statistics",
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(
      100,
      Math.max(parseInt(req.query.pageSize || "25", 10), 1),
    );
    const search = (req.query.search || "").trim();
    const activeFilter = req.query.active || "all";
    const roleFilter = req.query.role || "all";

    const where = {};
    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }
    if (activeFilter === "active") where.active = true;
    else if (activeFilter === "inactive") where.active = false;
    if (roleFilter === "admin") where.is_admin = true;
    else if (roleFilter === "user") where.is_admin = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.render("admin/users", {
      title: "User Management - LedgerLink",
      user: req.user,
      currentPage: "admin-users",
      users,
      meta: { page, pageSize, total, totalPages, search, activeFilter, roleFilter },
    });
  } catch (e) {
    logger.error("Admin users page error:", e);
    res.status(500).render("error", {
      title: "Error - LedgerLink",
      user: req.user,
      status: 500,
      message: "Internal Server Error",
      details: "Unable to load users list",
    });
  }
});

// API: list users JSON with search / filtering / pagination
router.get("/api/users", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(
      100,
      Math.max(parseInt(req.query.pageSize || "25", 10), 1),
    );
    const search = (req.query.search || "").trim();
    const activeFilter = req.query.active || "all"; // all|active|inactive
    const roleFilter = req.query.role || "all"; // all|admin|user

    const where = {};
    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }
    if (activeFilter === "active") where.active = true;
    else if (activeFilter === "inactive") where.active = false;
    if (roleFilter === "admin") where.is_admin = true;
    else if (roleFilter === "user") where.is_admin = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          is_admin: true,
          active: true,
          createdAt: true,
        },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({
      users,
      meta: { page, pageSize, total, totalPages, search, activeFilter, roleFilter },
    });
  } catch (e) {
    logger.error("Admin users API list error:", e);
    res.status(500).json({ error: "list_failed" });
  }
});

// API: toggle or set active flag
router.patch("/api/users/:id/active", async (req, res) => {
  const { id } = req.params;
  let { active } = req.body || {};
  if (active === undefined) {
    // If not provided, toggle current
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "not_found" });
    active = !existing.active;
  }
  if (typeof active !== "boolean") {
    if (active === "true") active = true;
    else if (active === "false") active = false;
  }
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { active: !!active },
      select: { id: true, email: true, is_admin: true, active: true, createdAt: true },
    });
    return res.json({ ok: true, user: updated });
  } catch (e) {
    logger.error("Toggle active error:", e);
    return res.status(500).json({ error: "update_failed" });
  }
});

export default router;
