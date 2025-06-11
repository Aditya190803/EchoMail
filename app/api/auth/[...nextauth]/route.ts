import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Create a basic configuration with minimal settings
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
        },
      },
    }),
  ],
  // Use a hardcoded secret for development
  secret: "NEXTAUTH_SECRET_DEVELOPMENT_ONLY",
})

export { handler as GET, handler as POST }
