"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type User = {
  id: string;
  cmuAccount: string;
  cmuEmail: string;
  studentCode?: string;
  displayNameTh?: string;
  displayNameEn?: string;
  roles: Array<{
    id: number;
    role: {
      name: string;
    };
    course?: {
      id: number;
      courseCode: string;
      courseNameTh?: string;
    };
  }>;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("STUDENT");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch users");
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignRole() {
    if (!selectedUser) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          roleName: selectedRole,
        }),
      });

      if (res.ok) {
        fetchUsers();
        setSelectedUser(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign role");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-4 rounded-lg max-w-md">
          <h2 className="font-bold mb-2">Error</h2>
          <p>{error}</p>
          <Link
            href="/teacher"
            className="mt-4 inline-block text-white underline"
          >
            Go to Teacher Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/teacher"
            className="text-white/80 hover:text-white flex items-center gap-2 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-white/70">
            Manage users and assign global roles
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Assign Global Role
          </h2>
          <div className="flex gap-4">
            <select
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-800">
                  {u.displayNameTh || u.displayNameEn || u.cmuAccount} ({u.cmuEmail})
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="STUDENT" className="bg-slate-800">STUDENT</option>
              <option value="TA" className="bg-slate-800">TA</option>
              <option value="TEACHER" className="bg-slate-800">TEACHER</option>
              <option value="ADMIN" className="bg-slate-800">ADMIN</option>
            </select>

            <button
              onClick={handleAssignRole}
              disabled={!selectedUser}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-lg"
            >
              Assign Role
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            All Users ({users.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-white">
              <thead className="bg-white/10 border-b border-white/20">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Student Code</th>
                  <th className="px-4 py-3">Roles</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {user.displayNameTh || user.displayNameEn || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {user.cmuAccount}
                    </td>
                    <td className="px-4 py-3 text-sm">{user.cmuEmail}</td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {user.studentCode || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <span
                            key={r.id}
                            className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-300"
                          >
                            {r.role.name}
                            {r.course && ` (${r.course.courseCode})`}
                          </span>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-white/50 text-sm">No roles</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
