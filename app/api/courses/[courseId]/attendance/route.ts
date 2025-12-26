import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);

  // Check if user is owner or TA of this course
  const course = await prisma.course.findFirst({
    where: {
      id: cid,
      OR: [
        { ownerId: user.id },
        {
          userRoles: {
            some: {
              userId: user.id,
              role: { name: "TA" },
            },
          },
        },
      ],
    },
  });

  if (!course) {
    return NextResponse.json(
      { error: "Course not found or access denied" },
      { status: 404 }
    );
  }

  // Get all attendance records for this course
  const attendances = await prisma.attendance.findMany({
    where: {
      classSession: {
        courseId: cid,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          cmuAccount: true,
          displayNameTh: true,
          displayNameEn: true,
          studentCode: true,
        },
      },
      scanner: {
        select: {
          id: true,
          cmuAccount: true,
          displayNameTh: true,
          displayNameEn: true,
        },
      },
      classSession: {
        select: {
          id: true,
          name: true,
          classIndex: true,
          date: true,
          startTime: true,
          endTime: true,
          keyword: true,
        },
      },
    },
    orderBy: {
      checkedAt: "desc",
    },
  });

  return NextResponse.json({ attendances });
}
