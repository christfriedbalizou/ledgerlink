# 🔗 LedgerLink: The Self-Hosted Financial Data Router

[![LedgerLink Status](https://img.shields.io/badge/Status-In%20Development-blue.svg)](https://github.com/your-repo-link)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Powered by Plaid](https://img.shields.io/badge/Powered%20by-Plaid-A8B9D9.svg)](https://plaid.com/)

**LedgerLink** is a self-hosted, open-source application designed to bridge the gap between your live bank accounts and your preferred financial tools. It acts as a secure data synchronization and routing service, giving you full control over where your financial data lands.

---

## ✨ Key Features

LedgerLink is built around flexibility, security, and automation:

### 🔄 Multi-Destination Synchronization
LedgerLink allows you to choose exactly where your scheduled financial data goes, **per user**:

* **Actual Budget:** Seamlessly push transactions and balances directly into your self-hosted Actual Budget instance.
* **Email CSV Exports:** Receive a detailed CSV file of your transactions and balances directly to your configured email inbox, perfect for auditing or using with other software.
* **Both:** Configure simultaneous delivery to Actual Budget **and** your email.

### 🔒 Secure Access & Control
* **Flexible Authentication:** Uses any standard **OAuth2 or OpenID Connect (OIDC)** provider (e.g., Authelia, Keycloak) for secure login.
* **Self-Hosted:** You maintain full ownership and control, running LedgerLink entirely on your own infrastructure (via Docker).
* **Data Security:** Securely encrypts and stores sensitive API tokens (Plaid Access Tokens, Actual Budget Passwords) in your chosen database (PostgreSQL or SQLite).

### 📈 Real-Time Sync Status
* Users can view the **last synchronization status (Success/Failure)** for both transactions and balances, for every linked account, ensuring full visibility.
* **Rate Limit Protection:** Features logic to detect and avoid exceeding Plaid's API usage limits, preventing service disruption.
---
