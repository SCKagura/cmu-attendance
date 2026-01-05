import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentUserGlobalRoles } from "@/lib/auth";
import PortalSelector from "./student/PortalSelector";

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

  // Get user's global roles
  const roles = await getCurrentUserGlobalRoles();

  // Show portal selector - let user choose their portal
  return <PortalSelector roles={roles} />;
}
