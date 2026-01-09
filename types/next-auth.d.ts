import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role?: string
      authority?: string
    }
  }

  interface User {
    role?: string
    authority?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    authority?: string
  }
}
