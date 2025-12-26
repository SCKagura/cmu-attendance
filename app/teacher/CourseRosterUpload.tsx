"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function CourseRosterUpload({ courseId }: { courseId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = select format, 2 = upload, 3 = select students
  const [selectedFormat, setSelectedFormat] = useState<string>("1");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set()); // Set of student codes
  const [searchFilter, setSearchFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const resetState = () => {
      setFile(null);
      setError(null);
      setSuccess(null);
      setStep(1);
      setSelectedFormat("1");
      setAllStudents([]);
      setSelectedStudents(new Set());
      setSearchFilter("");
      setSectionFilter("all");
      setAvailableSections([]);
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
        form.append("action", "analyze");
        form.append("format", selectedFormat);

        const res = await fetch(`/api/courses/${courseId}/import-roster`, {
            method: "POST",
            body: form,
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to analyze file");
        }

        const data = await res.json();
        const students = data.students || [];
        const sections = data.sections || [];
        
        setAllStudents(students);
        setAvailableSections(sections);
        
        // Default: select all students
        const allCodes = new Set<string>(students.map((s: any) => s.studentCode));
        setSelectedStudents(allCodes);
        
        setStep(3);

    } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
        setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", "import");
      form.append("format", selectedFormat);
      
      // Send selected student codes
      const selectedCodes = Array.from(selectedStudents);
      if (selectedCodes.length > 0) {
          form.append("selectedStudents", JSON.stringify(selectedCodes));
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

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentCode: string) => {
      const next = new Set(selectedStudents);
      if (next.has(studentCode)) next.delete(studentCode);
      else next.add(studentCode);
      setSelectedStudents(next);
  };

  const toggleAll = () => {
      const filtered = getFilteredStudents();
      const filteredCodes = new Set(filtered.map(s => s.studentCode));
      
      // Check if all filtered students are selected
      const allSelected = filtered.every(s => selectedStudents.has(s.studentCode));
      
      if (allSelected) {
          // Deselect all filtered
          const next = new Set(selectedStudents);
          filteredCodes.forEach(code => next.delete(code));
          setSelectedStudents(next);
      } else {
          // Select all filtered
          const next = new Set(selectedStudents);
          filteredCodes.forEach(code => next.add(code));
          setSelectedStudents(next);
      }
  };

  const getFilteredStudents = () => {
      return allStudents.filter(student => {
          // Filter by section
          if (sectionFilter !== "all") {
              const secKey = `${student.section}|${student.lab}`;
              if (secKey !== sectionFilter) return false;
          }
          
          // Filter by search
          if (searchFilter) {
              const search = searchFilter.toLowerCase();
              const matchName = (student.displayName || `${student.firstName} ${student.lastName}`).toLowerCase().includes(search);
              const matchCode = student.studentCode.includes(search);
              if (!matchName && !matchCode) return false;
          }
          
          return true;
      });
  };

  const handleSelectAll = () => {
      const filtered = getFilteredStudents();
      const next = new Set(selectedStudents);
      filtered.forEach(s => next.add(s.studentCode));
      setSelectedStudents(next);
  };

  const handleDeselectAll = () => {
      const filtered = getFilteredStudents();
      const filteredCodes = new Set(filtered.map(s => s.studentCode));
      const next = new Set(selectedStudents);
      filteredCodes.forEach(code => next.delete(code));
      setSelectedStudents(next);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-20">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[75vh] flex flex-col shadow-2xl shadow-purple-900/20">
            <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
              <h2 className="text-lg font-bold text-white">
                  {step === 1 ? "Select Excel Format" : step === 2 ? "Upload Excel File" : "Select Students to Import"}
              </h2>
              <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              
              {step === 1 && (
                  <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-200 text-sm">
                          📋 <strong>เลือกรูปแบบไฟล์ Excel</strong> ที่ตรงกับไฟล์ของคุณ
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                          {/* Format 1 */}
                          <button
                              onClick={() => setSelectedFormat("1")}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                  selectedFormat === "1"
                                      ? "border-purple-500 bg-purple-500/20"
                                      : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
                          >
                              <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                      selectedFormat === "1" ? "border-purple-500" : "border-white/30"
                                  }`}>
                                      {selectedFormat === "1" && (
                                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                      )}
                                  </div>
                                  <div className="flex-1">
                                      <h3 className="text-white font-semibold mb-2">Format 1: Standard</h3>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/70">
                                          <div>• Data Start: <span className="text-white">Row 8</span></div>
                                          <div>• Section: <span className="text-white">C4 (Global)</span></div>
                                          <div>• Student Code: <span className="text-white">Column B</span></div>
                                          <div>• Email: <span className="text-red-300">ไม่มี</span></div>
                                      </div>
                                  </div>
                              </div>
                          </button>

                          {/* Format 2 */}
                          <button
                              onClick={() => setSelectedFormat("2")}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                  selectedFormat === "2"
                                      ? "border-purple-500 bg-purple-500/20"
                                      : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
                          >
                              <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                      selectedFormat === "2" ? "border-purple-500" : "border-white/30"
                                  }`}>
                                      {selectedFormat === "2" && (
                                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                      )}
                                  </div>
                                  <div className="flex-1">
                                      <h3 className="text-white font-semibold mb-2">Format 2: CMU Reg</h3>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/70">
                                          <div>• Data Start: <span className="text-white">Row 5</span></div>
                                          <div>• Section: <span className="text-white">B, C (Individual)</span></div>
                                          <div>• Student Code: <span className="text-white">Column D</span></div>
                                          <div>• Email: <span className="text-green-300">Column I</span></div>
                                      </div>
                                  </div>
                              </div>
                          </button>

                          {/* Format 3 */}
                          <button
                              onClick={() => setSelectedFormat("3")}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                  selectedFormat === "3"
                                      ? "border-purple-500 bg-purple-500/20"
                                      : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
                          >
                              <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                      selectedFormat === "3" ? "border-purple-500" : "border-white/30"
                                  }`}>
                                      {selectedFormat === "3" && (
                                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                      )}
                                  </div>
                                  <div className="flex-1">
                                      <h3 className="text-white font-semibold mb-2">Format 3: Standard + Email</h3>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/70">
                                          <div>• Data Start: <span className="text-white">Row 8</span></div>
                                          <div>• Section: <span className="text-white">C4 (Global)</span></div>
                                          <div>• Student Code: <span className="text-white">Column B</span></div>
                                          <div>• Email: <span className="text-green-300">Column G</span></div>
                                      </div>
                                  </div>
                              </div>
                          </button>

                          {/* Format 4 */}
                          <button
                              onClick={() => setSelectedFormat("4")}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                  selectedFormat === "4"
                                      ? "border-purple-500 bg-purple-500/20"
                                      : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
                          >
                              <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                      selectedFormat === "4" ? "border-purple-500" : "border-white/30"
                                  }`}>
                                      {selectedFormat === "4" && (
                                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                      )}
                                  </div>
                                  <div className="flex-1">
                                      <h3 className="text-white font-semibold mb-2">Format 4: CMU Reg Alt</h3>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/70">
                                          <div>• Data Start: <span className="text-white">Row 5</span></div>
                                          <div>• Section: <span className="text-white">B, C (Individual)</span></div>
                                          <div>• Student Code: <span className="text-white">Column D</span></div>
                                          <div>• Email: <span className="text-green-300">Column I</span></div>
                                      </div>
                                  </div>
                              </div>
                          </button>
                      </div>
                  </div>
              )}
              
              {step === 2 && (
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
                          <p className="text-white/60 text-xs mt-2">📋 Format {selectedFormat} selected</p>
                      </div>
                  </div>
              )}

              {step === 3 && (
                  <div className="space-y-4">
                      {/* Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Search */}
                          <input
                              type="text"
                              placeholder="Search by name or student code..."
                              value={searchFilter}
                              onChange={(e) => setSearchFilter(e.target.value)}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                          />
                          
                          {/* Section Filter */}
                          <select
                              value={sectionFilter}
                              onChange={(e) => setSectionFilter(e.target.value)}
                              className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 [&>option]:bg-slate-800 [&>option]:text-white"
                          >
                              <option value="all" className="bg-slate-800 text-white">All Sections</option>
                              {availableSections.map(sec => {
                                  const [lec, lab] = sec.split('|');
                                  const labLabel = (lab && lab !== '0' && lab !== 'null') ? lab : "-";
                                  return (
                                      <option key={sec} value={sec} className="bg-slate-800 text-white">
                                          Lec {lec} / Lab {labLabel}
                                      </option>
                                  );
                              })}
                          </select>
                      </div>

                      {/* Select All / Deselect All */}
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                          <span className="text-white font-medium text-sm">
                              {selectedStudents.size} of {allStudents.length} students selected
                          </span>
                          <button onClick={toggleAll} className="text-xs text-purple-300 hover:text-purple-200">
                              {getFilteredStudents().every(s => selectedStudents.has(s.studentCode)) ? "Deselect All" : "Select All"}
                          </button>
                      </div>

                      {/* Student Table */}
                      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                          {getFilteredStudents().length === 0 ? (
                              <div className="p-8 text-center text-white/40">
                                  No students found matching your filters
                              </div>
                          ) : (
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                      <thead className="bg-white/10 border-b border-white/10">
                                          <tr>
                                              <th className="px-3 py-3 text-left w-12">
                                                  <input
                                                      type="checkbox"
                                                      checked={selectedStudents.size === getFilteredStudents().length && getFilteredStudents().length > 0}
                                                      onChange={(e) => {
                                                          if (e.target.checked) {
                                                              handleSelectAll();
                                                          } else {
                                                              handleDeselectAll();
                                                          }
                                                      }}
                                                      className="w-4 h-4 rounded border-white/30 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                                                  />
                                              </th>
                                              <th className="px-3 py-3 text-left text-white/70 font-medium w-16">No.</th>
                                              <th className="px-3 py-3 text-left text-white/70 font-medium">Student ID</th>
                                              <th className="px-3 py-3 text-left text-white/70 font-medium">Name</th>
                                              <th className="px-3 py-3 text-left text-white/70 font-medium w-24">SecLec</th>
                                              <th className="px-3 py-3 text-left text-white/70 font-medium w-24">SecLab</th>
                                              <th className="px-3 py-3 text-left text-white/70 font-medium">CMU Email</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/10">
                                          {getFilteredStudents().map((student: any) => (
                                              <tr
                                                  key={student.studentCode}
                                                  className="hover:bg-white/5 transition-colors"
                                              >
                                                  <td className="px-3 py-3">
                                                      <input
                                                          type="checkbox"
                                                          checked={selectedStudents.has(student.studentCode)}
                                                          onChange={(e) => {
                                                              const newSelected = new Set(selectedStudents);
                                                              if (e.target.checked) {
                                                                  newSelected.add(student.studentCode);
                                                              } else {
                                                                  newSelected.delete(student.studentCode);
                                                              }
                                                              setSelectedStudents(newSelected);
                                                          }}
                                                          className="w-4 h-4 rounded border-white/30 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                                                      />
                                                  </td>
                                                  <td className="px-3 py-3 text-white/50">{student.no}</td>
                                                  <td className="px-3 py-3">
                                                      <span className="font-mono text-white">{student.studentCode}</span>
                                                  </td>
                                                  <td className="px-3 py-3 text-white">
                                                      {student.displayName || `${student.firstName} ${student.lastName}`}
                                                  </td>
                                                  <td className="px-3 py-3 text-white/80 text-center">{student.section || '-'}</td>
                                                  <td className="px-3 py-3 text-white/80 text-center">
                                                      {(!student.lab || student.lab === '0' || student.lab === 'null') ? '-' : student.lab}
                                                  </td>
                                                  <td className="px-3 py-3 text-white/60 text-sm truncate max-w-xs">
                                                      {student.email || '-'}
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          )}
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
                    onClick={() => setStep(2)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
                >
                    Next
                </button>
              ) : step === 2 ? (
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
                    "Analyze File"
                    )}
                </button>
              ) : (
                <button
                    onClick={() => handleImport()}
                    disabled={loading || selectedStudents.size === 0}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                    {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Importing...
                    </>
                    ) : (
                    `Import (${selectedStudents.size})`
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
