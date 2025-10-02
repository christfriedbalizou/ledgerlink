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
    const requested = req.body?.product;
    const products = requested
      ? Array.isArray(requested)
        ? requested
        : [requested]
      : envProducts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const validProducts = products.filter((p) => VALID_LINK_FLOW_PRODUCTS.includes(p));
    const invalidProducts = products.filter(
      (p) => !VALID_LINK_FLOW_PRODUCTS.includes(p),
    );
    if (validProducts.length === 0) {
      logger.error(
        `No valid Plaid link flow products requested: ${products.join(", ")}`,
      );
      return res.status(400).json({
        error: `No valid Plaid link flow products requested. Supported: ${VALID_LINK_FLOW_PRODUCTS.join(", ")}`,
      });
    }
    if (invalidProducts.length > 0) {
      logger.warn(
        `Ignoring unsupported Plaid products for link flow: ${invalidProducts.join(", ")}`,
      );
    }
    // Create a single link token that covers all requested valid products.
    // This simplifies the client flow: one token can be used to link an item that supports multiple products.
    try {
      logger.debug(
        `Creating Plaid link token for products: ${validProducts.join(", ")}`,
        user.id,
      );
      const response = await plaid.linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: clientName,
        products: validProducts,
        country_codes: countryCodes.split(",").map((s) => s.trim()),
        language,
      });
      logger.debug(`Plaid linkTokenCreate response`, response.data);
      return res.json({ link_token: response.data.link_token });
    } catch (err) {
      logger.error("Plaid linkTokenCreate failed for products", validProducts, err);
      return res.status(502).json({ error: "link_token_creation_failed" });
    }
  } catch (err) {
    logger.error("Plaid link-token error", err);
    res.status(500).json({ error: err.message });
  }
});

// Plaid Link event tracking endpoint (moved from server for testability & cohesion)
router.post("/event", (req, res) => {
  try {
    const { eventName, metadata } = req.body || {};
    if (!eventName) return res.status(400).json({ error: "Missing eventName" });
    const user = req.user || { id: "unknown" };
    logger.info(
      `[PlaidEvent] user=${user.id} event=${eventName} meta=${JSON.stringify(
        metadata || {},
      )}`,
    );
    res.json({ ok: true });
  } catch (e) {
    logger.warn("Plaid event logging failed", e);
    res.json({ ok: false });
  }
});

router.post("/set-token", async (req, res) => {
  logger.info("/plaid/set-token");
  const {
    public_token,
    institutionName,
    institutionId,
    plaidInstitutionId,
    product,
    account,
    accounts,
  } = req.body || {};
  const user = req.user;
  try {
    let effectiveInstitutionId = institutionId;
    let fetchedInstitutionMeta = null;
    let sanitizedLogo = null;
    if (plaidInstitutionId) {
      try {
        const plaid = getPlaidClient();
        const instResp = await plaid.institutionsGetById({
          institution_id: plaidInstitutionId,
          country_codes: (process.env.PLAID_COUNTRY_CODES || "US")
            .split(",")
            .map((s) => s.trim()),
          options: { include_optional_metadata: true },
        });
        fetchedInstitutionMeta = instResp.data.institution || null;
        if (fetchedInstitutionMeta?.logo) {
          sanitizedLogo = fetchedInstitutionMeta.logo
            .replace(/^data:image\/[^;]+;base64,/, "")
            .trim();
        }
      } catch (metaErr) {
        logger.debug(
          "Plaid institution metadata fetch failed",
          metaErr.message || metaErr,
        );
      }
    }
    if (!effectiveInstitutionId && plaidInstitutionId) {
      try {
        const inst = await Institution.findOrCreate(
          user.id,
          plaidInstitutionId,
          institutionName || fetchedInstitutionMeta?.name || "Unknown Institution",
          {
            maxInstitutionsPerUser: MAX_INSTITUTIONS_PER_USER,
            logo: sanitizedLogo,
            primaryColor: fetchedInstitutionMeta?.primary_color || null,
            url: fetchedInstitutionMeta?.url || null,
          },
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
    // Normalize product(s) - Plaid metadata may include an array of products
    let productsStr = null;
    if (Array.isArray(product)) {
      productsStr = product.filter(Boolean).join(",");
    } else if (typeof product === "string") {
      productsStr = product;
    }
    // Fallback to default env configured products if none provided
    if (!productsStr) {
      const envProducts = process.env.PLAID_PRODUCTS || "";
      productsStr =
        envProducts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(",") || null;
    }
    const plaid = getPlaidClient();
    const response = await plaid.itemPublicTokenExchange({ public_token });
    logger.debug("Plaid itemPublicTokenExchange response", response.data);
    const encryptedAccessToken = encryptToken(response.data.access_token);
    await PlaidItem.createForUser(user.id, {
      plaidItemId: response.data.item_id,
      plaidAccessToken: encryptedAccessToken,
      products: productsStr,
      institutionName,
      institutionId: effectiveInstitutionId || institutionId,
      plaidInstitutionId,
    });
    // Hard delete semantics: no restore of soft-deleted rows needed.
    // Update institution branding if we fetched metadata and institution exists
    if (fetchedInstitutionMeta && effectiveInstitutionId) {
      try {
        await prisma.institution.update({
          where: { id: effectiveInstitutionId },
          data: {
            logo: sanitizedLogo || undefined,
            primaryColor: fetchedInstitutionMeta.primary_color || undefined,
            url: fetchedInstitutionMeta.url || undefined,
          },
        });
      } catch (e) {
        logger.debug("Institution branding update skipped", e.message || e);
      }
    }
    const accountPayloads =
      Array.isArray(accounts) && accounts.length > 0
        ? accounts
        : account
          ? [account]
          : [];

    for (const acct of accountPayloads) {
      try {
        await Account.createForUser(
          user.id,
          {
            plaidItemId: response.data.item_id,
            institutionName,
            institutionId: effectiveInstitutionId || institutionId,
            plaidInstitutionId,
            name: acct?.name,
            officialName: acct?.officialName,
            mask: acct?.mask,
            type: acct?.type,
            subtype: acct?.subtype,
            plaidAccountId: acct?.id || null,
            balanceAvailable: acct?.balances?.available ?? null,
            balanceCurrent: acct?.balances?.current ?? null,
            balanceIsoCurrency:
              acct?.balances?.iso_currency_code ||
              acct?.balances?.unofficial_currency_code ||
              null,
          },
          {
            maxInstitutionsPerUser: MAX_INSTITUTIONS_PER_USER,
            maxAccountsPerInstitution: MAX_ACCOUNTS_PER_INSTITUTION,
          },
        );
      } catch (e) {
        logger.warn(`Account create skipped: ${e.message}`);
      }
    }
    logger.info(
      `PlaidItem and Account linked for user ${user.id}, item_id: ${response.data.item_id}, products: ${productsStr}`,
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
    // Hard delete
    await prisma.account.delete({ where: { id: accountId } });
    logger.info(`Account ${accountId} deleted for user ${user.id}`);
    res.json({ success: true, deleted: true, accountId });
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
    // Hard delete cascading via explicit deletes in a transaction.
    const [accountCount, itemCount] = await prisma.$transaction(async (tx) => {
      const aCount = await tx.account.count({ where: { institutionId } });
      const iCount = await tx.plaidItem.count({ where: { institutionId } });
      await tx.account.deleteMany({ where: { institutionId } });
      await tx.plaidItem.deleteMany({ where: { institutionId } });
      await tx.institution.delete({ where: { id: institutionId } });
      return [aCount, iCount];
    });
    logger.info(
      `Institution ${institutionId} hard-deleted along with ${accountCount} accounts and ${itemCount} items for user ${user.id}`,
    );
    return res.json({ success: true, deleted: true, accountCount, itemCount });
  } catch (err) {
    logger.error("Plaid institution delete error", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
