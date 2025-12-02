"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCodeDisplay from "@/app/_components/QRCodeDisplay";

export default function GenerateQRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseName = searchParams.get("courseName");

  const [keyword, setKeyword] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !keyword.trim()) return;

    setLoading(true);
    setError(null);
    setQrToken("");
    setSessionInfo(null);

    try {
      const res = await fetch("/api/student/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, keyword: keyword.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate QR code");
        return;
      }

      setQrToken(data.qrToken);
      setSessionInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-white/80 hover:text-white flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">
            Generate QR Code
          </h1>
          <p className="text-white/70 mb-6">
            {courseName || `Course ID: ${courseId}`}
          </p>

          <form onSubmit={handleGenerate} className="space-y-4 mb-8">
            <div>
              <label className="block text-white font-medium mb-2">
                Session Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter keyword from teacher"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              />
              <p className="text-sm text-white/60 mt-1">
                Ask your teacher for the session keyword
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !keyword.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? "Generating..." : "Generate QR Code"}
            </button>
          </form>

          {qrToken && sessionInfo && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 text-center">
                Your QR Code
              </h2>

              <div className="flex justify-center mb-4">
                <QRCodeDisplay value={qrToken} size={280} />
              </div>

              <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-white/80">
                  <span>Session:</span>
                  <span className="font-medium text-white">
                    {sessionInfo.session.name}
                  </span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>Course:</span>
                  <span className="font-medium text-white">
                    {sessionInfo.course.courseCode}
                  </span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>Student Code:</span>
                  <span className="font-medium text-white">
                    {sessionInfo.studentCode}
                  </span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>Expires:</span>
                  <span className="font-medium text-white">
                    {new Date(sessionInfo.session.expiresAt).toLocaleString(
                      "th-TH"
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg text-sm">
                <strong>⚠️ Important:</strong> This QR code is for one-time use
                only. Show it to your TA/Teacher to scan.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
