// app/test-login/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TokenLog {
  id: number;
  token: string;
  device: string | null;
  url: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface CmuData {
  email: string;
  name?: string;
  student_id?: string;
  it_account?: string;
  firstname_th?: string;
  firstname_en?: string;
  lastname_th?: string;
  lastname_en?: string;
  organization_name_th?: string;
  organization_name_en?: string;
}

interface TestResult {
  success: boolean;
  cmuData: CmuData | null;
  userInfo: any;
  userRoles: string[];
  message: string;
  error?: string;
}

export default function TestLoginPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<TokenLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/token-logs?page=1&limit=20");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    } finally {
      setLoading(false);
    }
  };

  const testToken = async (token: string) => {
    setSelectedToken(token);
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/cmu/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        cmuData: null,
        userInfo: null,
        userRoles: [],
        message: "",
        error: "Failed to test token",
      });
    } finally {
      setTesting(false);
    }
  };

  const loginWithToken = async (token: string) => {
    // Redirect to CMU login with this token
    window.location.href = `/api/cmu/login?token=${token}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                CMU Mobile Test Login
              </h1>
              <p className="text-white/80">
                เลือก token ที่จับได้เพื่อทดสอบข้อมูล CMU Mobile
              </p>
            </div>
            <button
              onClick={() => router.push("/student")}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← กลับ
            </button>
          </div>

          {loading ? (
            <div className="text-white text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading tokens...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-white/60 text-center py-12">
              <p className="text-lg mb-2">ยังไม่มี token ที่จับได้</p>
              <p className="text-sm">
                เข้า URL ที่มี ?token=xxx เพื่อให้ระบบจับ token
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((log) => (
                <div
                  key={log.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/20 hover:bg-white/10 transition-all"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Token Info */}
                    <div className="lg:col-span-2 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 text-sm min-w-24">
                          Token:
                        </span>
                        <code className="text-white/90 text-sm font-mono break-all flex-1">
                          {log.token}
                        </code>
                      </div>
                      {log.device && (
                        <div className="flex items-start gap-2">
                          <span className="text-white/60 text-sm min-w-24">
                            Device:
                          </span>
                          <code className="text-white/70 text-xs font-mono break-all">
                            {log.device}
                          </code>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 text-sm min-w-24">
                          IP:
                        </span>
                        <span className="text-white/70 text-sm">
                          {log.ip || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-white/60 text-sm min-w-24">
                          Captured:
                        </span>
                        <span className="text-white/70 text-sm">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => testToken(log.token)}
                        disabled={testing && selectedToken === log.token}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
                      >
                        {testing && selectedToken === log.token
                          ? "Testing..."
                          : "🔍 Test Token"}
                      </button>
                      <button
                        onClick={() => loginWithToken(log.token)}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
                      >
                        🔐 Login with Token
                      </button>
                    </div>
                  </div>

                  {/* Test Result */}
                  {selectedToken === log.token && testResult && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      {testResult.error ? (
                        <div className="text-red-300 text-sm">
                          <p className="font-semibold mb-1">❌ Error</p>
                          <p>{testResult.error}</p>
                        </div>
                      ) : testResult.cmuData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-white/80 font-semibold text-sm mb-2">
                              ข้อมูล CMU Mobile:
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex gap-2">
                                <span className="text-white/60 min-w-32">
                                  IT Account:
                                </span>
                                <span className="text-white">
                                  {testResult.cmuData.it_account || "-"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-white/60 min-w-32">
                                  Email:
                                </span>
                                <span className="text-white">
                                  {testResult.cmuData.email || "-"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-white/60 min-w-32">
                                  Student ID:
                                </span>
                                <span className="text-white">
                                  {testResult.cmuData.student_id || "-"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-white/60 min-w-32">
                                  ชื่อ (TH):
                                </span>
                                <span className="text-white">
                                  {testResult.cmuData.firstname_th}{" "}
                                  {testResult.cmuData.lastname_th}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-white/60 min-w-32">
                                  Name (EN):
                                </span>
                                <span className="text-white">
                                  {testResult.cmuData.firstname_en}{" "}
                                  {testResult.cmuData.lastname_en}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-white/80 font-semibold text-sm mb-2">
                              หน่วยงาน & บทบาท:
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex gap-2">
                                <span className="text-white/60 min-w-32">
                                  Organization:
                                </span>
                                <span className="text-white">
                                  {testResult.cmuData.organization_name_th ||
                                    "-"}
                                </span>
                              </div>
                              <div className="mt-3">
                                <span className="text-white/60 text-sm block mb-2">
                                  บทบาทในระบบ:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {testResult.userRoles.length > 0 ? (
                                    testResult.userRoles.map((role) => (
                                      <span
                                        key={role}
                                        className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 rounded-full text-xs font-medium text-white"
                                      >
                                        {role}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-white/60 text-xs">
                                      ยังไม่มีบทบาทในระบบ
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white/60 text-sm">
                          ไม่มีข้อมูล CMU
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={fetchTokens}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {loading ? "Loading..." : "🔄 Refresh"}
            </button>
            <p className="text-white/60 text-sm">
              Total: {tokens.length} token{tokens.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
