// app/admin/token-logs/page.tsx
"use client";
import { useEffect, useState } from "react";

interface TokenLog {
  id: number;
  token: string;
  url: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TokenLogsPage() {
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const fetchLogs = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/token-logs?page=${page}&limit=50`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch token logs");
      }

      const data = await res.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Token copied to clipboard!");
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
          <h1 className="text-3xl font-bold text-white mb-6">
            CMU Mobile Token Logs
          </h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-white text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4">Timestamp</th>
                      <th className="text-left py-3 px-4">Token</th>
                      <th className="text-left py-3 px-4">URL</th>
                      <th className="text-left py-3 px-4">IP</th>
                      <th className="text-left py-3 px-4">User Agent</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-white/60">
                          No token logs found
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-white/10 hover:bg-white/5"
                        >
                          <td className="py-3 px-4 text-sm">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <code className="bg-white/10 px-2 py-1 rounded text-xs">
                              {log.token.substring(0, 20)}
                              {log.token.length > 20 ? "..." : ""}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-sm max-w-xs truncate">
                            {log.url}
                          </td>
                          <td className="py-3 px-4 text-sm">{log.ip || "-"}</td>
                          <td className="py-3 px-4 text-sm max-w-xs truncate">
                            {log.userAgent || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => copyToClipboard(log.token)}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-white px-4 py-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(pagination.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === pagination.totalPages}
                    className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {pagination && (
                <div className="mt-4 text-center text-white/60 text-sm">
                  Total: {pagination.total} token{pagination.total !== 1 ? "s" : ""}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
