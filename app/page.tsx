import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  // If token is present, redirect to CMU login API
  // This handles the flow where users scan QR code or click link -> root url -> login api
  if (typeof token === "string" && token) {
    redirect(`/api/cmu/login?token=${token}&redirect=/`);
  }

  const user = await getCurrentUser();

  // If not logged in, redirect to student page
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
