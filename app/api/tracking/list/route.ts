import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listContainers, listDemo, type ListFilters } from "@/lib/tracking"

export const dynamic = "force-dynamic"

// Paginated container/MAWB list for the logged-in user's client scope.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const s = (k: string) => (sp.get(k) ?? "").trim().slice(0, 60) || null
  const f: ListFilters = {
    page: Number(sp.get("page")) || 1,
    q: s("q"), mode: s("mode"), carrier: s("carrier"), status: s("status"), pod: s("pod"),
    active: sp.get("all") !== "1",
  }
  try {
    if (user.role === "DEMO") return NextResponse.json(listDemo(f))
    if (!user.cmpid) return NextResponse.json({ message: "Account has no client scope" }, { status: 403 })
    return NextResponse.json(await listContainers(user.cmpid, f))
  } catch (e) {
    console.error("Tracking list error:", e)
    return NextResponse.json({ message: "Failed to load containers" }, { status: 500 })
  }
}
