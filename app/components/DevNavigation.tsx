import Link from 'next/link';

export default function DevNavigation() {
  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 bg-black/80 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl animate-fade-in">
      <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1 px-1">
        Dev Controls
      </div>
      
      <Link 
        href="/student" 
        className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 rounded-lg transition-colors text-sm font-medium"
      >
        🎓 Student Portal
      </Link>
      
      <Link 
        href="/teacher" 
        className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 rounded-lg transition-colors text-sm font-medium"
      >
        👨‍🏫 Teacher Portal
      </Link>
      
      <Link 
        href="/admin" 
        className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 rounded-lg transition-colors text-sm font-medium"
      >
        🛡️ Admin Dashboard
      </Link>

      <div className="h-px bg-white/10 my-1" />

      <a 
        href="/api/cmu/login?token=dev-student&redirect=/"
        className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-200 rounded-lg transition-colors text-sm font-medium"
      >
        🔄 Reset Identity (Fix Roles)
      </a>
    </div>
  );
}
