import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

async function main() {
  console.log("Connecting to database...");
  await prisma.$connect();
  console.log("✓ Connected!");
  
  const count = await prisma.user.count();
  console.log("User count:", count);
  
  const roles = await prisma.role.findMany();
  console.log("Roles:", roles);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
