import type { Metadata } from "next";
import "./globals.css";
import { logTokenFromHeaders } from "@/lib/logToken";
import { GlobalAdminNav } from "@/components/GlobalAdminNav";
import { getCurrentUser, getUserRoles } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CMU Attendance System",
  description: "Check-Chue - CMU Attendance System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Log token if present in headers (set by middleware)
  await logTokenFromHeaders();

  // Fetch user and roles for admin nav
  const user = await getCurrentUser();
  const roles = user ? await getUserRoles(user.id) : [];

  return (
    <html lang="en">
      <body className="antialiased">
        <GlobalAdminNav userRoles={roles} />
        {children}
      </body>
    </html>
  );
}