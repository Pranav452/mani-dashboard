import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/financials/:path*',
    '/environmental/:path*',
    '/fleet/:path*',
    '/reports/:path*',
    '/chat/:path*',
  ]
}
