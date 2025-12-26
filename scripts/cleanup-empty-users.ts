// scripts/cleanup-empty-users.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface EmptyUser {
  id: string;
  cmuAccount: string;
  cmuEmail: string;
  studentCode: string | null;
  displayNameTh: string | null;
  displayNameEn: string | null;
  createdAt: Date;
}

async function findEmptyUsers(): Promise<EmptyUser[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const emptyUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        lt: twentyFourHoursAgo,
      },
      roles: { none: {} },
      enrollments: { none: {} },
      attendances: { none: {} },
      scans: { none: {} },
      ownedCourses: { none: {} },
    },
    select: {
      id: true,
      cmuAccount: true,
      cmuEmail: true,
      studentCode: true,
      displayNameTh: true,
      displayNameEn: true,
      createdAt: true,
    },
  });

  return emptyUsers;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("🔍 Searching for empty/placeholder users...\n");

  const emptyUsers = await findEmptyUsers();

  if (emptyUsers.length === 0) {
    console.log("✅ No empty users found. Database is clean!");
    return;
  }

  console.log(`📊 Found ${emptyUsers.length} empty user(s):\n`);

  emptyUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.cmuAccount}`);
    console.log(`   Email: ${user.cmuEmail}`);
    console.log(`   Student Code: ${user.studentCode || "N/A"}`);
    console.log(
      `   Display Name: ${user.displayNameTh || user.displayNameEn || "N/A"}`
    );
    console.log(`   Created: ${user.createdAt.toISOString()}`);
    console.log("");
  });

  if (isDryRun) {
    console.log("🔒 DRY RUN MODE - No users were deleted.");
    console.log(
      "   Run without --dry-run flag to actually delete these users.\n"
    );
    return;
  }

  // Confirmation prompt
  console.log("⚠️  WARNING: This will permanently delete these users!");
  console.log(
    "   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n"
  );

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("🗑️  Deleting empty users...\n");

  let deletedCount = 0;
  const deletedUsers: string[] = [];

  for (const user of emptyUsers) {
    try {
      await prisma.user.delete({
        where: { id: user.id },
      });
      deletedCount++;
      deletedUsers.push(user.cmuAccount);
      console.log(`✓ Deleted: ${user.cmuAccount}`);
    } catch (error) {
      console.error(`✗ Failed to delete ${user.cmuAccount}:`, error);
    }
  }

  console.log(`\n✅ Successfully deleted ${deletedCount} user(s).`);

  if (deletedUsers.length > 0) {
    console.log("\n📝 Deleted users:");
    deletedUsers.forEach((account) => console.log(`   - ${account}`));
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "CLEANUP_EMPTY_USERS",
      meta: JSON.stringify({
        deletedCount,
        deletedUsers,
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log("\n📋 Audit log created.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
