import express from "express";

import { getPlaidClient } from "../config/plaid.js";
import { VALID_LINK_FLOW_PRODUCTS } from "../constants/plaid.js";
import prisma from "../db/prisma.js";
import Account from "../models/Account.js";
import Institution from "../models/Institution.js";
import PlaidItem from "../models/PlaidItem.js";
import User from "../models/User.js";
import { encryptToken } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
const MAX_INSTITUTIONS_PER_USER =
  parseInt(process.env.MAX_INSTITUTIONS_PER_USER, 10) || 2;
const MAX_ACCOUNTS_PER_INSTITUTION =
  parseInt(process.env.MAX_ACCOUNTS_PER_INSTITUTION, 10) || 1;

// Uses VALID_LINK_FLOW_PRODUCTS from constants

router.post("/link-token", async (req, res) => {
  logger.info("/plaid/link-token");
  try {
    const plaid = getPlaidClient();
    const user = req.user;
    const clientName = process.env.PLAID_CLIENT_NAME;
    const countryCodes = process.env.PLAID_COUNTRY_CODES;
    const language = process.env.PLAID_LANGUAGE;
    const envProducts = process.env.PLAID_PRODUCTS;
    if (!clientName || !countryCodes || !language || !envProducts) {
      logger.error("Missing required Plaid environment variables");
      return res.status(500).json({
        error:
          "Missing required Plaid environment variables: PLAID_CLIENT_NAME, PLAID_COUNTRY_CODES, PLAID_LANGUAGE, PLAID_PRODUCTS",
      });
    }
    let products = [];
    const bodyProduct = req.body && req.body.product;
    const queryProduct = req.query && req.query.product;
    if (bodyProduct || queryProduct) {
      products = [(bodyProduct || queryProduct).trim()];
    } else {
      products = envProducts
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const validProducts = products.filter((p) => VALID_LINK_FLOW_PRODUCTS.includes(p));
    const invalidProducts = products.filter(
      (p) => !VALID_LINK_FLOW_PRODUCTS.includes(p),
    );
    if (validProducts.length === 0) {
      logger.error(
        `No valid Plaid link flow products requested: ${products.join(", ")}`,
      );
      return res
        .status(400)
        .json({
          error: `No valid Plaid link flow products requested. Supported: ${VALID_LINK_FLOW_PRODUCTS.join(", ")}`,
        });
    }
    if (invalidProducts.length > 0) {
      logger.warn(
        `Ignoring unsupported Plaid products for link flow: ${invalidProducts.join(", ")}`,
      );
    }
    const tokens = {};
    for (const product of validProducts) {
      try {
        const response = await plaid.linkTokenCreate({
          user: { client_user_id: user.id },
          client_name: clientName,
          products: [product],
          country_codes: countryCodes.split(",").map((s) => s.trim()),
          language,
        });
        logger.debug(`Plaid linkTokenCreate response for ${product}`, response.data);
        tokens[product] = response.data.link_token;
      } catch (err) {
        logger.error(`Plaid linkTokenCreate failed for product ${product}:`, err);
        tokens[product] = null;
      }
    }
    if (validProducts.length === 1) {
      res.json({ link_token: tokens[validProducts[0]] });
    } else {
      res.json({ tokens });
    }
  } catch (err) {
    logger.error("Plaid link-token error", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/set-token", async (req, res) => {
  logger.info("/plaid/set-token");
  const { public_token, institutionName, institutionId, plaidInstitutionId, product } =
    req.body;
  const user = req.user;
  try {
    let effectiveInstitutionId = institutionId;
    if (!effectiveInstitutionId && plaidInstitutionId) {
      try {
        const inst = await Institution.findOrCreate(
          user.id,
          plaidInstitutionId,
          institutionName || "Unknown Institution",
          { maxInstitutionsPerUser: MAX_INSTITUTIONS_PER_USER },
        );
        effectiveInstitutionId = inst.id;
      } catch (e) {
        logger.warn(`Institution creation failed: ${e.message}`);
        return res.status(403).json({ error: e.message });
      }
    }
    if (
      !effectiveInstitutionId &&
      !(await User.canAddInstitution(user.id, MAX_INSTITUTIONS_PER_USER))
    ) {
      logger.warn(`User ${user.id} reached institution limit`);
      return res.status(403).json({
        error: `Institution limit (${MAX_INSTITUTIONS_PER_USER}) reached.`,
      });
    }
    const targetInstitutionForLimit = effectiveInstitutionId || institutionId;
    if (
      !(await User.canAddAccountToInstitution(
        user.id,
        targetInstitutionForLimit,
        MAX_ACCOUNTS_PER_INSTITUTION,
      ))
    ) {
      logger.warn(
        `User ${user.id} reached account-per-institution limit for institution ${targetInstitutionForLimit}`,
      );
      return res.status(403).json({
        error: `Account per institution limit (${MAX_ACCOUNTS_PER_INSTITUTION}) reached for institution ${targetInstitutionForLimit}.`,
      });
    }
    if (!product) {
      logger.error("Missing product param in set-token");
      return res.status(400).json({ error: "Missing product param" });
    }
    const plaid = getPlaidClient();
    const response = await plaid.itemPublicTokenExchange({ public_token });
    logger.debug("Plaid itemPublicTokenExchange response", response.data);
    const encryptedAccessToken = encryptToken(response.data.access_token);
    await PlaidItem.createForUser(user.id, {
      plaidItemId: response.data.item_id,
      plaidAccessToken: encryptedAccessToken,
      products: product,
      institutionName,
      institutionId: effectiveInstitutionId || institutionId,
      plaidInstitutionId,
    });
    await Account.createForUser(
      user.id,
      {
        plaidItemId: response.data.item_id,
        institutionName,
        institutionId: effectiveInstitutionId || institutionId,
        plaidInstitutionId,
      },
      {
        maxInstitutionsPerUser: MAX_INSTITUTIONS_PER_USER,
        maxAccountsPerInstitution: MAX_ACCOUNTS_PER_INSTITUTION,
      },
    );
    logger.info(
      `PlaidItem and Account linked for user ${user.id}, item_id: ${response.data.item_id}, product: ${product}`,
    );
    res.json({ item_id: response.data.item_id });
  } catch (err) {
    logger.error("Plaid set-token error", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/account/:accountId", async (req, res) => {
  logger.info(`/plaid/account/${req.params.accountId} DELETE`);
  const { accountId } = req.params;
  const user = req.user;
  try {
    await Account.removeById(user.id, accountId);
    logger.info(`Account ${accountId} removed for user ${user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error("Plaid account delete error", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/institution/:institutionId", async (req, res) => {
  const { institutionId } = req.params;
  const user = req.user;
  logger.info(`/plaid/institution/${institutionId} DELETE by user ${user.id}`);
  try {
    const inst = await Institution.findById(institutionId);
    if (!inst || inst.userId !== user.id) {
      return res.status(404).json({ error: "Institution not found" });
    }
    const [accountCount, itemCount] = await Promise.all([
      prisma.account.count({ where: { institutionId } }),
      prisma.plaidItem.count({ where: { institutionId } }),
    ]);
    if (accountCount > 0 || itemCount > 0) {
      return res.status(409).json({
        error: "Cannot delete institution with linked accounts or Plaid items",
        accountCount,
        itemCount,
      });
    }
    await Institution.deleteForUser(user.id, institutionId);
    logger.info(`Institution ${institutionId} deleted for user ${user.id}`);
    return res.json({ success: true });
  } catch (err) {
    logger.error("Plaid institution delete error", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
