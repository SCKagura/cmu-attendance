// app/student/page.tsx
import { getCurrentUser, getCurrentUserGlobalRoles } from "@/lib/auth";
import PortalSelector from "./PortalSelector";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Not logged in - show login prompt
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Portal Selection</h1>
          <p className="text-white/80 mb-6">
            กรุณา Login ผ่าน CMU Mobile
          </p>
          <div className="bg-white/5 rounded-lg p-6 border border-white/20">
            <p className="text-white/70 text-sm mb-2">
              วิธีการ Login:
            </p>
            <ol className="text-white/60 text-sm text-left space-y-2 list-decimal list-inside">
              <li>เปิดแอป CMU Mobile</li>
              <li>สแกน QR Code หรือคลิกลิงก์จากระบบ</li>
              <li>ระบบจะดึงข้อมูลของคุณจาก CMU Mobile อัตโนมัติ</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Get user's global roles
  const roles = await getCurrentUserGlobalRoles();

  // Always show portal selection - let user choose their portal
  return <PortalSelector roles={roles} />;
}
