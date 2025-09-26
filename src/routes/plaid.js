import express from "express";
import { getPlaidClient } from "../config/plaid.js";
import { encryptToken } from "../utils/encryption.js";
import User from "../models/User.js";
import Account from "../models/Account.js";
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
    const products = process.env.PLAID_PRODUCTS;
    const countryCodes = process.env.PLAID_COUNTRY_CODES;
    const language = process.env.PLAID_LANGUAGE;
    if (!clientName || !products || !countryCodes || !language) {
      logger.error("Missing required Plaid environment variables");
      return res.status(500).json({
        error:
          "Missing required Plaid environment variables: PLAID_CLIENT_NAME, PLAID_PRODUCTS, PLAID_COUNTRY_CODES, PLAID_LANGUAGE",
      });
    }
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: clientName,
      products: products.split(",").map((s) => s.trim()),
      country_codes: countryCodes.split(",").map((s) => s.trim()),
      language,
    });
    logger.debug("Plaid linkTokenCreate response", response.data);
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    logger.error("Plaid link-token error", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/set-token", async (req, res) => {
  logger.info("Plaid set-token route accessed");
  const { public_token, institutionName, institutionId } = req.body;
  const user = req.user;
  try {
    if (!(await User.canAddAccount(user.id, MAX_ACCOUNTS_PER_USER))) {
      logger.warn(`User ${user.id} reached account limit`);
      return res
        .status(403)
        .json({ error: `Account limit (${MAX_ACCOUNTS_PER_USER}) reached.` });
    }
    const plaid = getPlaidClient();
    const response = await plaid.itemPublicTokenExchange({ public_token });
    logger.debug("Plaid itemPublicTokenExchange response", response.data);
    const encryptedAccessToken = encryptToken(response.data.access_token);
    await Account.createForUser(
      user.id,
      {
        plaidItemId: response.data.item_id,
        plaidAccessToken: encryptedAccessToken,
        institutionName,
        institutionId,
      },
      MAX_ACCOUNTS_PER_USER,
    );
    logger.info(
      `Account linked for user ${user.id}, item_id: ${response.data.item_id}`,
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
