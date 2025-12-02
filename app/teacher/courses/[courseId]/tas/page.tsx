"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type TA = {
  id: number;
  user: {
    id: string;
    cmuAccount: string;
    cmuEmail: string;
    displayNameTh?: string;
    displayNameEn?: string;
  };
};

export default function TAsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("");
  const [tas, setTas] = useState<TA[]>([]);
  const [newTaAccount, setNewTaAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setCourseId(p.courseId);
      fetchTAs(p.courseId);
    });
  }, [params]);

  async function fetchTAs(cid: string) {
    try {
      const res = await fetch(`/api/courses/${cid}/tas`);
      const data = await res.json();
      if (res.ok) {
        setTas(data.tas || []);
      }
    } catch (err) {
      console.error("Failed to fetch TAs:", err);
    }
  }

  async function handleAddTA(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaAccount.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/tas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmuAccount: newTaAccount.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add TA");
        return;
      }

      setNewTaAccount("");
      fetchTAs(courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTA(userRoleId: number) {
    if (!confirm("Are you sure you want to remove this TA?")) return;

    try {
      const res = await fetch(
        `/api/courses/${courseId}/tas?userRoleId=${userRoleId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchTAs(courseId);
      }
    } catch (err) {
      console.error("Failed to remove TA:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-white/80 hover:text-white flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            TA Management
          </h1>
          <p className="text-white/70">
            Add or remove Teaching Assistants for this course
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add New TA</h2>
          <form onSubmit={handleAddTA} className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                CMU Account
              </label>
              <input
                type="text"
                value={newTaAccount}
                onChange={(e) => setNewTaAccount(e.target.value)}
                placeholder="e.g., john.doe"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              />
              <p className="text-sm text-white/60 mt-1">
                The user must have logged in at least once
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? "Adding..." : "Add TA"}
            </button>
          </form>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            Current TAs ({tas.length})
          </h2>

          {tas.length === 0 ? (
            <p className="text-white/70">No TAs assigned yet</p>
          ) : (
            <div className="space-y-3">
              {tas.map((ta) => (
                <div
                  key={ta.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {ta.user.displayNameTh ||
                        ta.user.displayNameEn ||
                        ta.user.cmuAccount}
                    </div>
                    <div className="text-white/60 text-sm">
                      {ta.user.cmuEmail}
                    </div>
                    <div className="text-white/50 text-xs">
                      Account: {ta.user.cmuAccount}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTA(ta.id)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
