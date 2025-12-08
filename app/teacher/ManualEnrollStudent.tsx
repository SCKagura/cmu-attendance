"use client";

import { useState } from "react";

export function ManualEnrollStudent({ courseId }: { courseId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [studentCode, setStudentCode] = useState("");
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [section, setSection] = useState("");
  const [labSection, setLabSection] = useState("");

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setSuccess(null);
    setStudentCode("");
    setFoundStudent(null);
    setSection("");
    setLabSection("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setFoundStudent(null);
  };

  const handleSearch = async () => {
    if (!studentCode || studentCode.trim().length !== 9) {
      setError("Please enter a valid 9-digit student code");
      return;
    }

    setSearching(true);
    setError(null);
    setFoundStudent(null);

    try {
      const res = await fetch(`/api/users/search?studentCode=${studentCode.trim()}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Student not found in the system");
        }
        const data = await res.json();
        throw new Error(data.error || "Failed to search student");
      }

      const data = await res.json();
      setFoundStudent(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!foundStudent) {
      setError("Please search for a student first");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode: foundStudent.studentCode,
          section: section || null,
          labSection: labSection || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enroll student");
      }

      setSuccess("Student enrolled successfully!");
      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
      >
        ➕ Add Student Manually
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  ➕ Add Student to Course
                </h2>
                <button
                  onClick={handleClose}
                  className="text-white/60 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Search Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Search Student by Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Enter 9-digit student code"
                    maxLength={9}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>

              {/* Student Info Display */}
              {foundStudent && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="text-sm font-medium text-green-300 mb-2">Student Found</h3>
                  <div className="space-y-1 text-sm text-white/80">
                    <p><strong>Code:</strong> {foundStudent.studentCode}</p>
                    <p><strong>Name:</strong> {foundStudent.displayNameTh || foundStudent.displayNameEn || "-"}</p>
                    <p><strong>Email:</strong> {foundStudent.cmuEmail}</p>
                  </div>
                </div>
              )}

              {/* Enrollment Form */}
              {foundStudent && (
                <form onSubmit={handleEnroll} className="space-y-4">
                  {/* Section (SECLEC) */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      SECLEC (Lecture Section)
                    </label>
                    <input
                      type="text"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g., 0, 1, 2"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-white/50 mt-1">Optional</p>
                  </div>

                  {/* Lab Section (SECLAB) */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      SECLAB (Lab Section)
                    </label>
                    <input
                      type="text"
                      value={labSection}
                      onChange={(e) => setLabSection(e.target.value)}
                      placeholder="e.g., 1, 2"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-white/50 mt-1">Optional</p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                      ❌ {error}
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                      ✅ {success}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                    >
                      {loading ? "Enrolling..." : "Enroll Student"}
                    </button>
                  </div>
                </form>
              )}

              {/* Error Message (outside form for search errors) */}
              {error && !foundStudent && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  ❌ {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
