-- RedefineTables
PRAGMA defer_foreign_keys = ON;

PRAGMA foreign_keys = OFF;

CREATE TABLE "new_User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO
  "new_User" (
    "createdAt",
    "email",
    "id",
    "is_admin",
    "updatedAt"
  )
SELECT
  "createdAt",
  "email",
  "id",
  "is_admin",
  "updatedAt"
FROM
  "User";

DROP TABLE "User";

ALTER TABLE "new_User"
RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

PRAGMA foreign_keys = ON;

PRAGMA defer_foreign_keys = OFF;
