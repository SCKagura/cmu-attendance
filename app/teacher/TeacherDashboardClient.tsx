"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteCourseButton from "./_components/DeleteCourseButton";

type Course = {
  id: number;
  courseCode: string;
  courseNameTh: string | null;
  academicYear: number;
  semester: number;
};

export default function TeacherDashboardClient({
  ownedCourses,
  coTaughtCourses,
}: {
  ownedCourses: Course[];
  coTaughtCourses: Course[];
}) {
  const [activeTab, setActiveTab] = useState<"teacher" | "coteacher">("teacher");

  const courses = activeTab === "teacher" ? ownedCourses : coTaughtCourses;

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div className="bg-white/10 backdrop-blur-lg p-1 rounded-xl inline-flex border border-white/20">
          <button
            onClick={() => setActiveTab("teacher")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "teacher"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Teacher Portal
          </button>
          <button
            onClick={() => setActiveTab("coteacher")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "coteacher"
                ? "bg-teal-600 text-white shadow-lg"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Co-Teacher Portal
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">
          {activeTab === "teacher" ? "Your Courses" : "Assigned Courses"}
        </h2>
        {courses.length === 0 ? (
          <div className="text-white/40 bg-white/5 rounded-xl p-8 text-center border border-white/10">
            {activeTab === "teacher"
              ? 'No courses yet — click "Create Course" to get started'
              : "No courses assigned to you as a Co-Teacher"}
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(
              ({ id, courseCode, courseNameTh, academicYear, semester }) => (
                <li
                  key={id}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-6 hover:bg-white/20 transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="font-bold text-xl text-white mb-1">
                    {courseCode}
                  </div>
                  <div className="text-white/80 mb-4 line-clamp-1">
                    {courseNameTh ?? ""}
                  </div>
                  <div className="mb-6 text-sm text-white/50">
                    Year {academicYear} Semester {semester}
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/teacher/courses/${String(id)}/roster`}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white text-center transition-colors ${
                        activeTab === "teacher"
                          ? "bg-purple-600/80 hover:bg-purple-500"
                          : "bg-teal-600/80 hover:bg-teal-500"
                      }`}
                    >
                      Manage
                    </Link>
                    {activeTab === "teacher" && <DeleteCourseButton id={id} />}
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
