import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const account = process.argv[2];
  if (!account) {
    console.error("Please provide a cmuAccount");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { cmuAccount: account },
  });

  if (!user) {
    console.error(`User ${account} not found`);
    process.exit(1);
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });

  if (!adminRole) {
    console.error("ADMIN role not found");
    process.exit(1);
  }

  const existing = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: adminRole.id,
      courseId: null,
    },
  });

  if (!existing) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
        courseId: null,
      },
    });
    console.log(`✓ Assigned ADMIN role to ${account}`);
  } else {
    console.log(`✓ User ${account} is already ADMIN`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
