import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Check if the path is protected
  const isProtectedPath = ["/dashboard", "/compose", "/settings", "/admin"].some((path) =>
    request.nextUrl.pathname.startsWith(path),
  )

  // Check if the path is admin-only
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin")

  // If the path is protected and the user is not authenticated
  if (isProtectedPath && !token) {
    const url = new URL("/auth/signin", request.url)
    url.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If the path is admin-only and the user is not an admin
  if (isAdminPath && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/compose/:path*", "/settings/:path*", "/admin/:path*"],
}
