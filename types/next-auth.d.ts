import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    authority?: string
    cmpid?: string
    pkid?: number
    concode?: string
    grpcode?: string
  }

  interface Session {
    user: User & {
      role?: string
      authority?: string
      cmpid?: string
      pkid?: number
      concode?: string
      grpcode?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    authority?: string
    cmpid?: string
    pkid?: number
    concode?: string
    grpcode?: string
  }
}
