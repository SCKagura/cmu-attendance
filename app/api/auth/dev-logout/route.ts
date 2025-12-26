import { NextResponse } from "next/server";

const COOKIE = "cmu_user_id";

export async function GET() {
  const res = NextResponse.redirect(new URL("/", "http://localhost:3000"));
  res.cookies.delete(COOKIE);
  return res;
}
