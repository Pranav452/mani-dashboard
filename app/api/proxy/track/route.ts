import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { applyLive, demoLive, liveQueryOf, normalizeNumber, refreshLive, trackDemo, trackFromErp } from "@/lib/tracking"

export const dynamic = "force-dynamic"
export const maxDuration = 120 // live checks drive a real browser on the tracker PC

// Track & Trace lookup: ERP data scoped to the user's client codes (instant),
// merged with the cached live snapshot. { live: true } runs a live provider
// check now (only after the number is confirmed to be in the user's scope).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) {
    return NextResponse.json({ status: "Error", message: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ status: "Error", message: "Invalid request body" }, { status: 400 })
  }

  const number = normalizeNumber(body?.number)
  if (!/^[A-Z0-9]{6,20}$/.test(number)) {
    return NextResponse.json({ status: "Error", message: "Enter a valid container or MAWB number" }, { status: 400 })
  }

  try {
    if (user.role === "DEMO") {
      const d = trackDemo(number)
      return NextResponse.json(body?.live === true && d.found ? { ...d, live: demoLive(number), live_supported: true } : { ...d, live_supported: d.found })
    }
    if (!user.cmpid) {
      return NextResponse.json({ status: "Error", message: "Account has no client scope" }, { status: 403 })
    }
    const erp = await trackFromErp(user.cmpid, number)
    if (body?.live !== true || !erp.found) return NextResponse.json(erp)
    const row = await refreshLive(liveQueryOf(erp))
    return NextResponse.json(applyLive(erp, row))
  } catch (error) {
    console.error("Track lookup error:", error)
    return NextResponse.json(
      { status: "Error", message: "Tracking lookup failed. Please try again." },
      { status: 500 }
    )
  }
}
