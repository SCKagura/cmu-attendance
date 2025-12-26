// app/student/PortalSelector.tsx
"use client";
import Link from "next/link";

interface Portal {
  name: string;
  description: string;
  href: string;
  icon: string;
  gradient: string;
}

interface Props {
  roles: string[];
}

export default function PortalSelector({ roles }: Props) {
  const portals: Portal[] = [];

  // Student Portal - available to everyone with STUDENT role
  if (roles.includes("STUDENT")) {
    portals.push({
      name: "Student Portal",
      description: "ดูรายวิชาและสร้าง QR Code สำหรับเช็คชื่อ",
      href: "/student/courses",
      icon: "📚",
      gradient: "from-blue-500 to-cyan-500",
    });
  }

  // TA Portal - available to TAs
  if (roles.includes("TA")) {
    portals.push({
      name: "TA Portal",
      description: "จัดการการเช็คชื่อและดูรายงานในฐานะ TA",
      href: "/ta",
      icon: "👨‍🏫",
      gradient: "from-purple-500 to-pink-500",
    });
  }

  // Teacher Portal - available to TEACHER and CO_TEACHER
  if (roles.includes("TEACHER") || roles.includes("CO_TEACHER")) {
    portals.push({
      name: "Teacher Portal",
      description: "จัดการรายวิชา นักเรียน และรายงานการเข้าเรียน",
      href: "/teacher",
      icon: "🎓",
      gradient: "from-green-500 to-emerald-500",
    });
  }

  // Admin Portal - available to ADMIN
  if (roles.includes("ADMIN")) {
    portals.push({
      name: "Admin Portal",
      description: "จัดการระบบและผู้ใช้งานทั้งหมด",
      href: "/admin",
      icon: "⚙️",
      gradient: "from-red-500 to-orange-500",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Portal Selection
          </h1>
          <p className="text-white/70 text-lg">
            เลือก Portal ที่คุณต้องการเข้าใช้งาน
          </p>
        </div>

        {portals.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
            <p className="text-white/80">
              ไม่พบ Portal ที่คุณสามารถเข้าถึงได้
            </p>
            <p className="text-white/60 text-sm mt-2">
              กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${portals.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'sm:grid-cols-2'}`}>
            {portals.map((portal) => (
              <Link
                key={portal.href}
                href={portal.href}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{portal.icon}</div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {portal.name}
                  </h2>
                  <p className="text-white/70 mb-6">
                    {portal.description}
                  </p>
                  <div className={`inline-block bg-gradient-to-r ${portal.gradient} text-white font-semibold py-3 px-8 rounded-lg group-hover:shadow-lg transition-all`}>
                    เข้าสู่ Portal →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
