import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const account = url.searchParams.get("account") ?? "devuser";
  const email = url.searchParams.get("email") ?? `${account}@example.com`;
  const redirect = url.searchParams.get("redirect") ?? "/teacher";

  const user = await prisma.user.upsert({
    where: { cmuAccount: account },
    update: { cmuEmail: email },
    create: { cmuAccount: account, cmuEmail: email },
    select: { id: true },
  });

  (await cookies()).set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return NextResponse.redirect(new URL(redirect, req.url));
}
