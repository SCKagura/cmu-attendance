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
  role: {
    id: number;
    name: string;
  };
};

export default function TeamPage({ params }: { params: Promise<{ courseId: string }> }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("");
  const [members, setMembers] = useState<any[]>([]);
  const [newAccount, setNewAccount] = useState("");
  const [role, setRole] = useState("TA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setCourseId(p.courseId);
      fetchMembers(p.courseId);
    });
  }, [params]);

  async function fetchMembers(cid: string) {
    try {
      const res = await fetch(`/api/courses/${cid}/tas`);
      const data = await res.json();
      if (res.ok) {
        setMembers(data.tas || []);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccount.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/tas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: newAccount.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add member");
        return;
      }

      setNewAccount("");
      fetchMembers(courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userRoleId: number) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(
        `/api/courses/${courseId}/tas?userRoleId=${userRoleId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchMembers(courseId);
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
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
            Manage Team
          </h1>
          <p className="text-white/70">
            Add TAs or Teachers to this course
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Member</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                CMU Account or Email
              </label>
              <input
                type="text"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                placeholder="e.g., john.doe or john.doe@cmu.ac.th"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              />
              <p className="text-sm text-white/60 mt-1">
                You can enter either the CMU Account or full CMU Email.
              </p>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Role</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="TA"
                    checked={role === "TA"}
                    onChange={(e) => setRole(e.target.value)}
                    className="accent-purple-500"
                  />
                  Teaching Assistant (TA)
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="TEACHER"
                    checked={role === "TEACHER"}
                    onChange={(e) => setRole(e.target.value)}
                    className="accent-pink-500"
                  />
                  Teacher
                </label>
              </div>
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
              {loading ? "Adding..." : "Add Member"}
            </button>
          </form>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            Current Members ({members.length})
          </h2>

          {members.length === 0 ? (
            <p className="text-white/70">No members assigned yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {m.user.displayNameTh ||
                          m.user.displayNameEn ||
                          m.user.cmuAccount}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${['TEACHER', 'CO_TEACHER'].includes(m.role.name) ? 'bg-pink-500/50 text-white' : 'bg-blue-500/50 text-white'}`}>
                        {['TEACHER', 'CO_TEACHER'].includes(m.role.name) ? 'Teacher' : m.role.name}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm">
                      {m.user.cmuEmail}
                    </div>
                    <div className="text-white/50 text-xs">
                      Account: {m.user.cmuAccount}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
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
