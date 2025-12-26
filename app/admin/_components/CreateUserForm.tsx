import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    cmuAccount: "",
    cmuEmail: "",
    displayName: "",
    studentCode: "",
    roleName: "STUDENT",
  });

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setSuccess(null);
    setFormData({
      cmuAccount: "",
      cmuEmail: "",
      displayName: "",
      studentCode: "",
      roleName: "STUDENT",
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      setSuccess("User created successfully!");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 pb-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              ➕ Create New User
            </h2>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g., John Doe"
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* CMU Account */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                CMU Account <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="cmuAccount"
                value={formData.cmuAccount}
                onChange={handleChange}
                placeholder="e.g., john.doe"
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-white/50 mt-1">Unique account identifier</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="cmuEmail"
                value={formData.cmuEmail}
                onChange={handleChange}
                placeholder="e.g., john.doe@cmu.ac.th"
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Student Code */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Student Code (Optional)
              </label>
              <input
                type="text"
                name="studentCode"
                value={formData.studentCode}
                onChange={handleChange}
                placeholder="e.g., 650610000"
                maxLength={9}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-white/50 mt-1">9 digits, only for students</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Role <span className="text-red-400">*</span>
              </label>
              <select
                name="roleName"
                value={formData.roleName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="STUDENT" className="bg-slate-800">STUDENT</option>
                <option value="TA" className="bg-slate-800">TA</option>
                <option value="TEACHER" className="bg-slate-800">TEACHER</option>
                <option value="ADMIN" className="bg-slate-800">ADMIN</option>
              </select>
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
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg"
      >
        ➕ Create New User
      </button>

      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
