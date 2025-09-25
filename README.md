# 🔗 LedgerLink: The Self-Hosted Financial Data Router

[![Test Status](https://img.shields.io/github/actions/workflow/status/christfriedbalizou/ledgerlink/ci.yml?branch=main&label=Tests&logo=github&style=for-the-badge)](https://github.com/christfriedbalizou/ledgerlink/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/christfriedbalizou/ledgerlink?include_prereleases&label=Release&logo=github&style=for-the-badge)](https://github.com/christfriedbalizou/ledgerlink/releases)
[![LedgerLink Status](https://img.shields.io/badge/Status-In%20Development-blue.svg)](https://github.com/your-repo-link)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Powered by Plaid](https://img.shields.io/badge/Powered%20by-Plaid-A8B9D9.svg)](https://plaid.com/)

LedgerLink is a self-hosted, open-source application designed to bridge the gap between your live bank accounts and your preferred financial management tools or personal data archives. Securely connect to your financial institutions via Plaid, and let LedgerLink automatically deliver your transaction and balance data exactly where you need it – whether that's your self-hosted Actual Budget instance or directly to your inbox as a CSV.

## ✨ Key Features

* **Flexible Bank Connectivity:** Securely link to thousands of financial institutions using Plaid, bringing all your accounts into one place.
* **Self-Hosted & Secure:** You control your data. LedgerLink runs on your infrastructure, protected by your existing OIDC/OAuth2 provider (like Authelia).

**Customizable Data Destination:**

* **Actual Budget Integration:** Seamlessly push transactions and balances directly into your self-hosted Actual Budget instance.
* **Email CSV Exports:** Receive a detailed CSV file of your transactions and balances directly to your email inbox, ideal for archiving or use with other tools.
Choose Both! Configure LedgerLink to send data to Actual Budget AND email you a CSV.
* **Automated Synchronization:** Set it and forget it! LedgerLink's powerful scheduler will automatically fetch and push your latest financial data based on your preferences.
* **User-Friendly Dashboard:** A clear overview of your linked accounts, their last synchronization status, and easy management options.
* **Admin Controls:** Global settings for the application, including synchronization schedules, email server configuration, and per-user account limits.
* **Database Flexibility:** Choose between PostgreSQL (for robust deployments) or SQLite (for simpler setups) during installation.

### 🚀 How it Works

* **Secure Login:** Access LedgerLink through your familiar OIDC/OAuth2 authentication provider.
* **Link Banks (via Plaid):** Use the intuitive interface to securely connect your bank accounts. Your data remains private and encrypted.
* **Configure Output:** Decide if you want your data sent to Actual Budget, emailed as a CSV, or both.
* **Automated Sync:** LedgerLink handles the rest, fetching new data and delivering it according to your schedule.
* **Stay Informed:** Your dashboard provides real-time updates on your last sync operations.

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
