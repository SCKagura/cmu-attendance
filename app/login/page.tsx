"use client";
import Link from "next/link";

export default function LoginPage() {
  // Read from environment variable (available in client-side)
  const entraidUrl = process.env.NEXT_PUBLIC_CMU_ENTRAID_URL;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          CMU Attendance System
        </h1>
        
        <div className="space-y-4">
          {/* CMU EntraID Login */}
          {entraidUrl && (
            <Link
              href={entraidUrl}
              className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-center shadow-lg"
            >
              🔐 Login with CMU Account (EntraID)
            </Link>
          )}

        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Need help? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
}

