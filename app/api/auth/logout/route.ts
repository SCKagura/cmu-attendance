import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  
  // Delete the session cookie
  response.cookies.delete(COOKIE);
  response.cookies.set(COOKIE, "", { 
    maxAge: 0, 
    path: "/" 
  });
  
  return response;
}
