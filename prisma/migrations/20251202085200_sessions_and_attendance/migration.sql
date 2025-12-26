/*
  Warnings:

  - You are about to drop the `ClassSessionToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `createdById` on the `ClassSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Attendance_classSessionId_idx";

-- DropIndex
DROP INDEX "ClassSessionToken_token_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ClassSessionToken";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClassSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "courseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "classIndex" TEXT,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "keyword" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "preHashedSalt" TEXT,
    "preHashedValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClassSession" ("classIndex", "courseId", "createdAt", "date", "endTime", "expiresAt", "id", "keyword", "name", "preHashedSalt", "preHashedValue", "startTime", "updatedAt") SELECT "classIndex", "courseId", "createdAt", "date", "endTime", "expiresAt", "id", "keyword", "name", "preHashedSalt", "preHashedValue", "startTime", "updatedAt" FROM "ClassSession";
DROP TABLE "ClassSession";
ALTER TABLE "new_ClassSession" RENAME TO "ClassSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
