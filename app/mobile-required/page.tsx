import Link from "next/link";

export default function MobileRequiredPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="text-6xl mb-6">📱</div>
        <h1 className="text-2xl font-bold text-white mb-4">
          CMU Mobile App Required
        </h1>
        <p className="text-white/80 mb-8 leading-relaxed">
          สำหรับนักศึกษา กรุณาใช้งานผ่านแอปพลิเคชัน <strong>CMU Mobile</strong> เพื่อเช็คชื่อเข้าเรียน
        </p>
        
        <div className="mt-8 pt-6 border-t border-white/10">
          <Link
            href="/api/auth/dev-logout"
            className="text-white/60 hover:text-white transition-colors text-sm underline"
          >
            Logout / ออกจากระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
