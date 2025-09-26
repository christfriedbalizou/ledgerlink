import express from "express";
import { getPlaidClient } from "../config/plaid.js";
import { encryptToken } from "../utils/encryption.js";
import User from "../models/User.js";
import Account from "../models/Account.js";
import PlaidItem from "../models/PlaidItem.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
const MAX_ACCOUNTS_PER_USER =
  parseInt(process.env.MAX_ACCOUNTS_PER_USER, 10) || 2;

router.post("/link-token", async (req, res) => {
  logger.info("Plaid link-token route accessed");
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
    // Accept product as query or body param, or all if not provided
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
    // Create a link token for each product
    const tokens = {};
    for (const product of products) {
      const response = await plaid.linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: clientName,
        products: [product],
        country_codes: countryCodes.split(",").map((s) => s.trim()),
        language,
      });
      logger.debug(
        `Plaid linkTokenCreate response for ${product}`,
        response.data,
      );
      tokens[product] = response.data.link_token;
    }
    // If only one product, return {link_token}, else return {tokens: {product: link_token, ...}}
    if (products.length === 1) {
      res.json({ link_token: tokens[products[0]] });
    } else {
      res.json({ tokens });
    }
  } catch (err) {
    logger.error("Plaid link-token error", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/set-token", async (req, res) => {
  logger.info("Plaid set-token route accessed");
  const { public_token, institutionName, institutionId, product } = req.body;
  const user = req.user;
  try {
    if (!(await User.canAddAccount(user.id, MAX_ACCOUNTS_PER_USER))) {
      logger.warn(`User ${user.id} reached account limit`);
      return res
        .status(403)
        .json({ error: `Account limit (${MAX_ACCOUNTS_PER_USER}) reached.` });
    }
    if (!product) {
      logger.error("Missing product param in set-token");
      return res.status(400).json({ error: "Missing product param" });
    }
    const plaid = getPlaidClient();
    const response = await plaid.itemPublicTokenExchange({ public_token });
    logger.debug("Plaid itemPublicTokenExchange response", response.data);
    const encryptedAccessToken = encryptToken(response.data.access_token);
    // Store PlaidItem
    await PlaidItem.createForUser(user.id, {
      plaidItemId: response.data.item_id,
      plaidAccessToken: encryptedAccessToken,
      products: product,
      institutionName,
      institutionId,
    });
    // Optionally, create Account linked to PlaidItem
    await Account.createForUser(
      user.id,
      {
        plaidItemId: response.data.item_id,
        institutionName,
        institutionId,
      },
      MAX_ACCOUNTS_PER_USER,
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
  logger.info(
    `Plaid account delete route accessed for accountId: ${req.params.accountId}`,
  );
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

export default router;
