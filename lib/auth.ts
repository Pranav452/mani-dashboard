import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { executeQuery } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Corporate Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        // --- STEP 1: LOGIN (Get CMPID) ---
        // Matches: SELECT @CMPID=CMPID FROM CMP_DTLS WHERE ROLETYPE='KPI' ...
        const loginQuery = `
          SELECT TOP 1
            cmp_usercode,
            cmp_username,
            fullname,
            RoleType,
            cmp_datelimit,
            authority,
            CMPID
          FROM CMP_DTLS
          WHERE cmp_username = @p0 AND cmp_password = @p1
        `

        const users = await executeQuery(loginQuery, [credentials.username, credentials.password])

        if (users && users.length > 0) {
          const user = users[0]

          // Check Expiry
          if (user.cmp_datelimit) {
             const expiry = new Date(user.cmp_datelimit)
             const now = new Date()
             if (expiry < now) throw new Error("Account Expired")
          }

          let pkid = null
          let concode = null
          let grpcode = null

          // --- STEP 2: MAPPING (Get PKID & CONCODE) ---
          // Matches: SELECT @PKID = pk_id ... FROM TBL_KPI_CONSIGNEE_GRP WHERE FK_CMPID=@CMPID
          // We only do this if they are a KPI user (or if logic applies to everyone)
          if (user.CMPID) {
             const mapQuery = `
                SELECT TOP 1 pk_id, MAIN_CONCODE, CON_CODE
                FROM TBL_KPI_CONSIGNEE_GRP
                WHERE FK_CMPID = @p0
             `
             const mapping = await executeQuery(mapQuery, [user.CMPID])

             if (mapping && mapping.length > 0) {
                // Match boss's query: SELECT TOP 1 without ORDER BY
                const row = mapping[0]
                pkid = row.pk_id
                concode = row.MAIN_CONCODE
                grpcode = row.CON_CODE
             }
          }

          console.log("LOGIN SUCCESS:", {
            user: user.cmp_username,
            CMPID: user.CMPID,
            PKID: pkid,
            CONCODE: concode,
            GRPCODE: grpcode
          })

          // 3. Return Session Data with the new keys
          return {
            id: user.cmp_usercode.toString(),
            name: user.cmp_username,
            email: user.fullname,
            role: user.RoleType ? user.RoleType.trim() : 'KPI',
            authority: user.authority,
            cmpid: user.CMPID,
            pkid: pkid,
            concode: concode,
            grpcode: grpcode
          }
        }

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Persist the DB keys to the token
      if (user) {
        token.role = user.role
        token.authority = user.authority
        token.cmpid = user.cmpid
        token.pkid = user.pkid
        token.concode = user.concode
        token.grpcode = user.grpcode
      }
      return token
    },
    async session({ session, token }: any) {
      // Pass keys to the client session
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).authority = token.authority;
        (session.user as any).cmpid = token.cmpid;
        (session.user as any).pkid = token.pkid;
        (session.user as any).concode = token.concode;
        (session.user as any).grpcode = token.grpcode;
        session.user.name = token.name;
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
}