"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalAdminNav({ 
  userRoles 
}: { 
  userRoles: string[] 
}) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (userRoles.includes("ADMIN")) {
      setIsAdmin(true);
    }
  }, [userRoles]);

  if (!isAdmin) return null;

  // Don't show on login or mobile-required pages
  if (pathname === "/login" || pathname === "/mobile-required") return null;

  const navItems = [
    { name: "Student View", path: "/student", role: "STUDENT" },
    { name: "TA View", path: "/ta", role: "TA" },
    { name: "Teacher View", path: "/teacher", role: "TEACHER" },
    { name: "Admin Panel", path: "/admin", role: "ADMIN" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl flex gap-4 items-center">
      <span className="text-xs font-bold text-yellow-400 mr-2 uppercase tracking-wider">
        Admin Controls
      </span>
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`text-sm font-medium transition-colors hover:text-white ${
            pathname.startsWith(item.path)
              ? "text-white underline decoration-blue-400 decoration-2 underline-offset-4"
              : "text-white/60"
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
