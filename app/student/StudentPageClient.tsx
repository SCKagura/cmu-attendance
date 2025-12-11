// app/student/StudentPageClient.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: string;
  cmuAccount: string;
  cmuEmail: string;
  studentCode: string | null;
  displayNameTh: string | null;
  displayNameEn: string | null;
  organizationTh: string | null;
  organizationEn: string | null;
}

interface Enrollment {
  id: number;
  studentCode: string;
  courseId: number;
  course: {
    courseCode: string;
    courseNameTh: string | null;
    courseNameEn: string | null;
    academicYear: number;
    semester: number;
  };
}

interface TestResult {
  success: boolean;
  cmuData: any;
  userInfo: any;
  userRoles: string[];
  message: string;
  error?: string;
  detail?: string;
}

interface Props {
  user: User | null;
  enrollments: Enrollment[];
}

export default function StudentPageClient({ user, enrollments }: Props) {
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [capturedTokens, setCapturedTokens] = useState<Array<{id: number, token: string, createdAt: string}>>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    if (!user) {
      fetchCapturedTokens();
    }
  }, [user]);

  const fetchCapturedTokens = async () => {
    setLoadingTokens(true);
    try {
      const res = await fetch("/api/admin/token-logs?page=1&limit=10");
      if (res.ok) {
        const data = await res.json();
        setCapturedTokens(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleTestToken = async () => {
    if (!token.trim()) {
      alert("Please enter a token");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/cmu/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
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
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTesting(false);
    }
  };

  const selectToken = (selectedToken: string) => {
    setToken(selectedToken);
    setTestResult(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Student Portal</h1>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Student Dashboard
          </h1>
          <div className="text-white/80">
            <p className="font-semibold text-lg">
              สวัสดี, {user.displayNameTh || user.cmuAccount}
            </p>
            <p className="text-sm">
              Email: {user.cmuEmail} | Student Code: {user.studentCode ?? "-"}
            </p>
            {(user.organizationTh || user.organizationEn) && (
              <p className="text-sm">
                {user.organizationTh} / {user.organizationEn}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">
            รายวิชาที่ลงทะเบียน
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-white/70">
              ยังไม่มีข้อมูลรายวิชา — อาจารย์จะเพิ่มรายชื่อของคุณผ่านระบบ
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((e) => (
                <div
                  key={e.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all"
                >
                  <div className="mb-3">
                    <div className="font-semibold text-white text-lg">
                      {e.course.courseCode}
                    </div>
                    <div className="text-white/80 text-sm">
                      {e.course.courseNameTh ?? e.course.courseNameEn}
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      ปี {e.course.academicYear} เทอม {e.course.semester}
                    </div>
                    <div className="text-white/60 text-xs">
                      รหัส นศ.: {e.studentCode}
                    </div>
                  </div>
                  <Link
                    href={`/student/generate?courseId=${e.courseId}&courseName=${encodeURIComponent(
                      e.course.courseCode
                    )}`}
                    className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2 px-4 rounded-lg text-center transition-all shadow-lg text-sm"
                  >
                    Generate QR Code
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
