"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function CourseRosterUpload({ courseId }: { courseId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importFormat, setImportFormat] = useState("1");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hardcoded paths for now - in a real app these would be in public/images
  // I will use the artifact paths but note they might not render in a normal browser without a server.
  // I'll use a trick: I'll just show the text description if image fails, or use a generic placeholder color.
  const formats = [
    { id: "1", name: "Format 1 (Standard)", desc: "No, ID, Name, Surname (Row 8+)", img: "/images/Format1.png" },
    { id: "2", name: "Format 2 (With Email)", desc: "No, ID, Name, Surname, Email (Row 8+)", img: "/images/Format2.png" },
    { id: "3", name: "Format 3 (Code First)", desc: "Detailed with SecLec/Lab (Row 5+)", img: "/images/Format3.png" },
  ];

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  async function onUpload() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("format", importFormat);
    
    setLoading(true);
    const res = await fetch(`/api/courses/${courseId}/import-roster`, {
      method: "POST",
      body: form,
    });
    setLoading(false);
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "อัปโหลดไม่สำเร็จ");
      return;
    }

    let msg = `อ่าน ${data.readRows} แถว, นำเข้าสำเร็จ ${data.importedRows} คน`;
    if (data.errors && data.errors.length > 0) {
      msg += "\n\nพบข้อผิดพลาดบางรายการ:\n" + data.errors.slice(0, 10).join("\n");
      if (data.errors.length > 10) msg += `\n...และอีก ${data.errors.length - 10} รายการ`;
    }
    alert(msg);
    location.reload();
  }

  return (
    <>
      <div className="flex gap-2">
         <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-sky-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
          >
            Import Excel
          </button>
          
           <button
            onClick={async () => {
                if(!confirm("Add 'student1' to this course for testing?")) return;
                setLoading(true);
                try {
                    const res = await fetch(`/api/courses/${courseId}/enroll-student`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            studentCode: "650610001",
                            firstName: "Test",
                            lastName: "Student1",
                            email: "student1@cmu.ac.th",
                            cmuAccount: "student1"
                        })
                    });
                    if(res.ok) {
                        alert("Added student1 successfully!");
                        location.reload();
                    } else {
                        const data = await res.json();
                        alert(data.error || "Failed to add student1");
                    }
                } catch(e) {
                    alert("Error adding student");
                } finally {
                    setLoading(false);
                }
            }}
            disabled={loading}
            className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + Test Student
          </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-start pl-6 pr-4 pt-1 pb-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-purple-900/20">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">Select Import Format</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {formats.map((f) => (
                  <div 
                    key={f.id}
                    onClick={() => setImportFormat(f.id)}
                    className={`cursor-pointer group relative overflow-hidden rounded-xl border-2 transition-all w-full md:w-[calc(33.33%-11px)] ${importFormat === f.id ? "border-purple-500 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}
                  >
                    <div className="h-40 bg-black relative">
                       <Image 
                          src={f.img} 
                          alt={f.name} 
                          fill 
                          className="object-contain p-2 opacity-90 group-hover:opacity-100 transition-opacity"
                          unoptimized // Disable Next.js optimization to ensure fresh load if needed
                       />
                       {/* Overlay for selected state */}
                       {importFormat === f.id && (
                          <div className="absolute inset-0 bg-purple-500/10 z-10 pointer-events-none" />
                       )}
                    </div>
                    <div className="p-3 border-t border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                            <h3 className={`font-semibold text-sm ${importFormat === f.id ? "text-purple-300" : "text-white"}`}>{f.name}</h3>
                            <p className="text-xs text-white/60">{f.desc}</p>
                        </div>
                        {importFormat === f.id && (
                            <div className="bg-purple-500 text-white rounded-full p-1 shrink-0">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                 <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-white/80 mb-2">Upload File (Format: {formats.find(f => f.id === importFormat)?.name})</label>
                      <input
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-white/80
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-purple-600 file:text-white
                          hover:file:bg-purple-500
                          cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={onUpload}
                      disabled={!file || loading}
                      className="w-full sm:w-auto rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/20"
                    >
                      {loading ? "Uploading..." : "Start Import"}
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
