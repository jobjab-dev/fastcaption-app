-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 5000,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "subStatus" TEXT NOT NULL DEFAULT 'active',
    "subCurrentPeriodEnd" DATETIME,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "credits", "email", "emailVerified", "id", "image", "name") SELECT "createdAt", "credits", "email", "emailVerified", "id", "image", "name" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubId_key" ON "User"("stripeSubId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
