import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { activeContainersForRefresh, refreshLive } from "@/lib/tracking"
import { hasLiveProvider } from "@/lib/live-tracking"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const CONCURRENCY = 2
const MAX_PER_RUN = 400

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false // fail closed
  const auth = req.headers.get("authorization") ?? ""
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : req.headers.get("x-cron-secret") ?? ""
  const a = Buffer.from(given), b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Background live refresh (Vercel cron, every 6 h): live-checks every active container
// (not delivered; ATA empty or within 30 days) across all clients that has a live
// provider, and stores snapshots in tracking_live_cache. Reads ERP only.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  const started = Date.now()
  const all = await activeContainersForRefresh()
  const todo = all.filter(hasLiveProvider).slice(0, MAX_PER_RUN)
  let ok = 0, failed = 0, next = 0
  const worker = async () => {
    while (next < todo.length && Date.now() - started < (maxDuration - 20) * 1000) {
      const q = todo[next++]
      try {
        const r = await refreshLive(q)
        r.ok ? ok++ : failed++
      } catch {
        failed++
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return NextResponse.json({ active: all.length, eligible: todo.length, checked: ok + failed, ok, failed, ms: Date.now() - started })
}

export const POST = GET
