import { PrismaClient } from "@prisma/client";
try {
  const prisma = new PrismaClient();
  console.log("✓ Instantiated PrismaClient successfully");
} catch (e) {
  console.error("❌ Failed to instantiate:", e);
}
