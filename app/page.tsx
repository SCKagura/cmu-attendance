import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  // If not logged in, redirect to student page (which has login options)
  if (!user) {
    redirect("/student");
  }

  // Check if user is a teacher
  const isTeacher = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: { in: ["TEACHER", "CO_TEACHER"] } },
    },
  });

  // Auto-redirect based on role
  if (isTeacher) {
    redirect("/teacher");
  } else {
    redirect("/student");
  }
}
