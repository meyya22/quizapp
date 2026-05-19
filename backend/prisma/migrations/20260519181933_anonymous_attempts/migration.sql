-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quiz_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "quizId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_quiz_attempts" ("completedAt", "id", "passed", "quizId", "score", "startedAt", "timeTaken", "userId") SELECT "completedAt", "id", "passed", "quizId", "score", "startedAt", "timeTaken", "userId" FROM "quiz_attempts";
DROP TABLE "quiz_attempts";
ALTER TABLE "new_quiz_attempts" RENAME TO "quiz_attempts";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
