// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const device = searchParams.get("device");

  // If token parameter exists, pass it via headers for logging
  if (token) {
    const response = NextResponse.next();
    
    // Add token and metadata to headers so the app can log it
    response.headers.set("x-cmu-token", token);
    if (device) {
      response.headers.set("x-cmu-device", device);
    }
    response.headers.set("x-cmu-token-url", request.url);
    response.headers.set(
      "x-cmu-token-ip",
      request.headers.get("x-forwarded-for") || "unknown"
    );
    response.headers.set(
      "x-cmu-token-ua",
      request.headers.get("user-agent") || "unknown"
    );
    response.headers.set(
      "x-cmu-token-referer",
      request.headers.get("referer") || ""
    );
    
    return response;
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
