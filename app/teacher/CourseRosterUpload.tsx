"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function CourseRosterUpload({ courseId }: { courseId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importFormat, setImportFormat] = useState("1");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Hardcoded paths for now - in a real app these would be in public/images
  const formats = [
    { id: "1", name: "Format 1 (Standard)", desc: "No, ID, Name, Surname (Row 8+)", img: "/images/Format1.png" },
    { id: "2", name: "Format 2 (With Email)", desc: "No, ID, Name, Surname, Email (Row 8+)", img: "/images/Format2.png" },
    { id: "3", name: "Format 3 (CMU Reg)", desc: "ID, Name, Lec, Lab, Email (Row 2+)", img: "/images/Format3.png" },
  ];

  const resetState = () => {
      setFile(null);
      setError(null);
      setSuccess(null);
      setStep(1);
      setAvailableSections([]);
      setSelectedSections(new Set());
      setPreviewRows([]);
  };

  const handleOpen = () => {
      resetState();
      setIsModalOpen(true);
  };

  const handleClose = () => {
      resetState();
      setIsModalOpen(false);
  };

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

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
        const form = new FormData();
        form.append("file", file);
        form.append("format", importFormat);
        form.append("action", "analyze");

        const res = await fetch(`/api/courses/${courseId}/import-roster`, {
            method: "POST",
            body: form,
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to analyze file");
        }

        const data = await res.json();
        const sections = data.sections || [];
        
        setPreviewRows(data.preview || []);

        if (sections.length === 0) {
            await handleImport([]); 
        } else {
            setAvailableSections(sections);
            setSelectedSections(new Set(sections)); // Default select all
            setStep(2);
        }

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleImport = async (sectionsToImport: string[] | null = null) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("format", importFormat);
      form.append("action", "import");
      
      const sections = sectionsToImport ?? Array.from(selectedSections);
      if (sections.length > 0) {
          form.append("selectedSections", JSON.stringify(sections));
      }

      const res = await fetch(`/api/courses/${courseId}/import-roster`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to import");
      }

      const data = await res.json();
      setSuccess(`Imported ${data.importedRows} students successfully.`);
      
      // Reset
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

  const toggleSection = (sec: string) => {
      const next = new Set(selectedSections);
      if (next.has(sec)) next.delete(sec);
      else next.add(sec);
      setSelectedSections(next);
  };

  const toggleAll = () => {
      if (selectedSections.size === availableSections.length) {
          setSelectedSections(new Set());
      } else {
          setSelectedSections(new Set(availableSections));
      }
  };

  return (
    <>
      <div className="flex gap-2">
         <button
            onClick={handleOpen}
            className="rounded-lg bg-sky-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
          >
            Import Excel
         </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-4 bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl shadow-purple-900/20">
            <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
              <h2 className="text-lg font-bold text-white">
                  {step === 1 ? "Select Import Format" : "Select Sections to Import"}
              </h2>
              <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar">
              
              {step === 1 && (
                  <>
                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                        {formats.map((f) => (
                        <div 
                            key={f.id}
                            onClick={() => setImportFormat(f.id)}
                            className={`cursor-pointer group relative overflow-hidden rounded-xl border-2 transition-all w-full md:w-[calc(33.33%-11px)] ${importFormat === f.id ? "border-purple-500 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}
                        >
                            <div className="h-32 bg-black relative">
                            <Image 
                                src={f.img} 
                                alt={f.name} 
                                fill 
                                className="object-contain p-2 opacity-90 group-hover:opacity-100 transition-opacity"
                                unoptimized 
                            />
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
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-6 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group cursor-pointer relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-white font-medium mb-1 text-sm">{file ? file.name : "Click to upload or drag and drop"}</p>
                            <p className="text-white/40 text-xs">Excel files only (.xlsx, .xls)</p>
                        </div>
                    </div>
                  </>
              )}

              {step === 2 && (
                  <div className="space-y-4">
                      {previewRows.length > 0 && (
                          <div className="mb-4">
                              <h3 className="text-white font-medium text-sm mb-2">Preview (First 5 Rows)</h3>
                              <div className="overflow-x-auto rounded-lg border border-white/10">
                                  <table className="w-full text-sm text-left text-white/80">
                                      <thead className="bg-white/5 text-white/60 uppercase text-xs">
                                          <tr>
                                              <th className="px-3 py-2">No</th>
                                              <th className="px-3 py-2">ID</th>
                                              <th className="px-3 py-2">Name</th>
                                              <th className="px-3 py-2">Section</th>
                                              <th className="px-3 py-2">Email</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                          {previewRows.map((row, i) => (
                                              <tr key={i} className="hover:bg-white/5">
                                                  <td className="px-3 py-2">{row.no}</td>
                                                  <td className="px-3 py-2 font-mono">{row.studentCode}</td>
                                                  <td className="px-3 py-2">{row.firstName} {row.lastName}</td>
                                                  <td className="px-3 py-2">
                                                      Lec {row.section} / Lab {(!row.lab || row.lab === '0' || row.lab === 'null') ? "-" : row.lab}
                                                  </td>
                                                  <td className="px-3 py-2 text-white/60">{row.email || "-"}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}

                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                          <span className="text-white font-medium text-sm">Select Sections</span>
                          <button onClick={toggleAll} className="text-xs text-purple-300 hover:text-purple-200">
                              {selectedSections.size === availableSections.length ? "Deselect All" : "Select All"}
                          </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {availableSections.map(sec => {
                              const [lec, lab] = sec.split('|');
                              // Always show Lec/Lab format as requested
                              const labLabel = (lab && lab !== '0' && lab !== 'null') ? lab : "-";
                              const label = `Lec ${lec} / Lab ${labLabel}`;
                              
                              return (
                                <label key={sec} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selectedSections.has(sec) ? "bg-purple-500/20 border-purple-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSections.has(sec)} 
                                        onChange={() => toggleSection(sec)}
                                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                                    />
                                    <span className="text-white font-mono text-sm">{label}</span>
                                </label>
                              );
                          })}
                      </div>
                  </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-200 flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {success}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-slate-900/50 backdrop-blur-sm rounded-b-2xl">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              
              {step === 1 ? (
                <button
                    onClick={handleAnalyze}
                    disabled={!file || loading}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                    {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Scanning...
                    </>
                    ) : (
                    "Next"
                    )}
                </button>
              ) : (
                <button
                    onClick={() => handleImport()}
                    disabled={loading || selectedSections.size === 0}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                    {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Importing...
                    </>
                    ) : (
                    `Import (${selectedSections.size})`
                    )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
