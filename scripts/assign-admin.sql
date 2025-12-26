-- Assign ADMIN role to boonyawut_buthboon@cmu.ac.th
-- Run this script on the production database

-- Step 1: Find or create ADMIN role
INSERT INTO "Role" (name) 
VALUES ('ADMIN') 
ON CONFLICT (name) DO NOTHING;

-- Step 2: Assign ADMIN role to the user (global role, courseId = NULL)
INSERT INTO "UserRole" ("userId", "roleId", "courseId", "createdAt")
SELECT u.id, r.id, NULL, NOW()
FROM "User" u, "Role" r
WHERE u."cmuEmail" = 'boonyawut_buthboon@cmu.ac.th'
  AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole" ur
    WHERE ur."userId" = u.id 
      AND ur."roleId" = r.id 
      AND ur."courseId" IS NULL
  );

-- Step 3: Verify the assignment
SELECT u."cmuEmail", u."cmuAccount", r.name as role, ur."courseId"
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
WHERE u."cmuEmail" = 'boonyawut_buthboon@cmu.ac.th';
