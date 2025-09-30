# 🔗 LedgerLink: The Self-Hosted Financial Data Router

[![Test Status](https://img.shields.io/github/actions/workflow/status/christfriedbalizou/ledgerlink/ci.yml?branch=main&label=Tests&logo=github&style=for-the-badge)](https://github.com/christfriedbalizou/ledgerlink/actions/workflows/ci.yml)
[![Dependencies](https://img.shields.io/github/actions/workflow/status/christfriedbalizou/ledgerlink/ci.yml?label=Security%20Audit&logo=npm&style=for-the-badge)](https://github.com/christfriedbalizou/ledgerlink/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/christfriedbalizou/ledgerlink?include_prereleases&label=Release&logo=github&style=for-the-badge)](https://github.com/christfriedbalizou/ledgerlink/releases)

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

### Institution & Account Limits

LedgerLink enforces two layers of limits for Plaid-linked data sources:

1. `MAX_INSTITUTIONS_PER_USER` – Maximum distinct financial institutions a user can connect (default: 2)
2. `MAX_ACCOUNTS_PER_INSTITUTION` – Maximum accounts allowed per institution for a user (default: 1)

These are configurable via environment variables. The legacy `MAX_ACCOUNTS_PER_USER` has been deprecated in favor of more granular control.

The underlying data model now includes an `Institution` table which normalizes institutions separate from accounts and Plaid items. A migration (`add_institution_table`) introduces this table.

When a Plaid public token is exchanged, LedgerLink:
* Ensures the institution exists or creates it (respecting the institution limit)
* Ensures the per‑institution account limit is not exceeded
* Links the new account and Plaid item to the `Institution`

Environment example:
```
MAX_INSTITUTIONS_PER_USER=2
MAX_ACCOUNTS_PER_INSTITUTION=1
```

If these variables are unset, defaults are applied.

## Database & Prisma

LedgerLink uses Prisma with a template-driven schema approach. The committed `schema.template.prisma` is transformed into `schema.prisma` at runtime (injecting provider, URLs, etc.) by `scripts/generate-schema.js`.

### Static Migrations Path (Default)

If you are fine using the pre-generated, committed migrations (e.g. with SQLite dev setups) just run:

```
npm run db:migrate
```

This regenerates `schema.prisma`, applies any pending migrations via `prisma migrate deploy`, then runs `prisma generate`.

### Multi-Provider Strategy (SQLite & PostgreSQL)

The project now maintains **two explicit Prisma schema files**:

```
prisma/sqlite/schema.prisma
prisma/postgres/schema.prisma
```

Each lives in its own folder so Prisma keeps separate `migrations/` alongside each schema (created on demand). This avoids mixing provider-specific SQL.

#### Choosing a Provider

Set `DATABASE_PROVIDER` and (optionally) `DATABASE_URL` before running any command that touches the database.

Examples:

```
export DATABASE_PROVIDER=sqlite
# optional override:
export DATABASE_URL="file:./dev.db"

export DATABASE_PROVIDER=postgresql
export DATABASE_URL="postgresql://user:pass@localhost:5432/ledgerlink"
```

#### Creating / Applying Migrations

Run:

```
npm run db:migrate
```

The helper script `scripts/db-migrate.js` will:
* Detect the provider.
* If no migrations exist for that provider, run `prisma migrate dev --name init` to create the baseline.
* Otherwise run `prisma migrate deploy`.
* Generate a provider-specific Prisma Client.

Provider-specific shortcuts:

```
npm run db:migrate:sqlite
npm run db:migrate:postgres
```

#### Generating New Migrations During Development

For iterative schema work (e.g. adding a field) with the selected provider:

```
export DATABASE_PROVIDER=postgresql
npx prisma migrate dev --schema prisma/postgres/schema.prisma --name add_new_field
```

Repeat similarly for SQLite if you need that provider's migration set.

#### Divergent Schemas?

Currently both schemas are identical. If a provider requires a different type (e.g. `Json` vs `String` fallback), you can apply the change only in one schema file. Make sure application logic stays portable or guards provider-specific behavior.

#### Removed: Dynamic Baseline Script

Earlier versions supported an experimental `db:dynamic` flow that generated a one-off baseline migration at runtime. This added complexity and ambiguity, so the script and related wrapper commands have been removed. All migrations now live explicitly under:

```
prisma/sqlite/migrations
prisma/postgres/migrations
```

If you still have old instructions referencing `db:dynamic`, replace them with the appropriate provider-specific `npm run db:migrate:sqlite` or `npm run db:migrate:postgres` commands.

#### Switching Providers After Data Exists

Treat as a data migration exercise: export data, provision the new DB, run the other provider's migrations, then import transformed data.

#### Troubleshooting

* `Error: P1000` when switching to Postgres: ensure the Postgres server is reachable and credentials match `DATABASE_URL`.
* Migrations appear missing: confirm you are editing the schema in the correct provider folder.
* Client not updating: delete `node_modules/.prisma` and rerun `npm run db:migrate` with the desired provider.

### Formatting & Linting

All SQL migrations are auto-formatted on commit via `sql-formatter`. Run manually:

```
npm run format:sql
```

CI enforces formatting with `npm run lint:ci`.

