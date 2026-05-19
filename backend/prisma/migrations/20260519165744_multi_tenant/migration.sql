/*
  Warnings:

  - Added the required column `adminId` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "categories_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("createdAt", "description", "id", "adminId", "name", "updatedAt") SELECT "createdAt", "description", "id", COALESCE((SELECT "id" FROM "users" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1), ''), "name", "updatedAt" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_adminId_name_key" ON "categories"("adminId", "name");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PARTICIPANT',
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "googleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "googleId", "id", "name", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "googleId", "id", "name", "passwordHash", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
