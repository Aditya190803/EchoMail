export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/compose/:path*", "/api/send-email/:path*"],
}
