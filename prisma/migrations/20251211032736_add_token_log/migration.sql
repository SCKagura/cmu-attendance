/*
  Warnings:

  - A unique constraint covering the columns `[courseId,studentCode]` on the table `Enrollment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN "activeSections" TEXT;

-- CreateTable
CREATE TABLE "TokenLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_courseId_studentCode_key" ON "Enrollment"("courseId", "studentCode");
