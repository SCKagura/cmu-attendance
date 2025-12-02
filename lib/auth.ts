import { cookies } from "next/headers";
import { prisma } from "./db";

export const COOKIE = "cmu_user_id";

export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
}
