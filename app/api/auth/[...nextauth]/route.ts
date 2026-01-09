import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { executeQuery } from "@/lib/db"

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Corporate Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        // 1. Query your specific table
        // Note: I'm using the column names you provided in the dump
        const query = `
          SELECT TOP 1 
            cmp_usercode, 
            cmp_username, 
            fullname, 
            RoleType, 
            cmp_datelimit, 
            authority 
          FROM cmp_dtls 
          WHERE cmp_username = @p0 AND cmp_password = @p1
        `
        
        // WARNING: In production, passwords should be hashed. 
        // Since legacy DB uses plain text, we compare directly.
        const users = await executeQuery(query, [credentials.username, credentials.password])

        if (users && users.length > 0) {
          const user = users[0]

          // 2. Check Date Limit (Expiry)
          const expiry = new Date(user.cmp_datelimit)
          const now = new Date()
          if (expiry < now) {
            throw new Error("Account Expired")
          }

          // 3. Return the user object
          return {
            id: user.cmp_usercode,
            name: user.fullname,
            email: user.cmp_username, // We map username to email for NextAuth compatibility
            role: user.RoleType.trim(), // 'SA' or 'KPI'
            authority: user.authority // The raw permission string
          }
        }

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Persist the custom fields to the token
      if (user) {
        token.role = user.role
        token.authority = user.authority
      }
      return token
    },
    async session({ session, token }: any) {
      // Make custom fields available in the client
      if (session.user) {
        session.user.role = token.role
        session.user.authority = token.authority
      }
      return session
    }
  },
  pages: {
    signIn: '/login', // Point to your custom login page
  }
})

export { handler as GET, handler as POST }
