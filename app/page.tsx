import { redirect } from "next/navigation";
import { getCurrentUser, getUserRoles } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  // If token is present, redirect to CMU login API
  if (typeof token === "string" && token) {
    redirect(`/api/cmu/login?token=${token}&redirect=/`);
  }

  const user = await getCurrentUser();

  // If not logged in, redirect to login page
  if (!user) {
    redirect("/login");
  }

  // Determine redirect URL based on roles priority
  const roles = await getUserRoles(user.id);

  if (roles.includes("ADMIN")) {
    redirect("/admin");
  } else if (roles.includes("TEACHER") || roles.includes("CO_TEACHER")) {
    redirect("/teacher");
  } else if (roles.includes("TA")) {
    redirect("/ta");
  } else {
    // Default to mobile required page for students
    redirect("/mobile-required");
  }
}
