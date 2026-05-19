-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quizzes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quizzes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_quizzes" ("categoryId", "createdAt", "description", "id", "passingScore", "title", "updatedAt") SELECT "categoryId", "createdAt", "description", "id", "passingScore", "title", "updatedAt" FROM "quizzes";
DROP TABLE "quizzes";
ALTER TABLE "new_quizzes" RENAME TO "quizzes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
