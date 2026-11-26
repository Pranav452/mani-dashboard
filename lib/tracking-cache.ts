// Live-tracking snapshot cache stored in MSSQL table dbo.MD_TRACKING_LIVE_CACHE
// (DDL: sql/20261126_md_tracking_live_cache.sql). This is the ONLY table the app writes;
// ERP tables are read-only. If a DB write fails, the snapshot is kept in process memory.
import { executeQuery } from "@/lib/db"

export interface LiveCacheRow {
  number: string
  carrier: string | null
  status: string | null
  live_eta: string | null // yyyy-mm-dd
  eta_changed: boolean
  summary: string | null
  source: string | null
  ok: boolean
  checked_at: string // ISO timestamp
  raw?: unknown
}

const memory = new Map<string, LiveCacheRow>()

// Columns for joining the cache into ERP queries (alias L). Dates come back as text to avoid TZ shifts.
export const CACHE_SELECT = `L_STATUS = L.STATUS, L_LIVE_ETA = CONVERT(VARCHAR(10), L.LIVE_ETA, 120), L_ETA_CHANGED = L.ETA_CHANGED,
  L_SUMMARY = L.SUMMARY, L_SOURCE = L.SOURCE, L_OK = L.OK, L_CHECKED_AT = CONVERT(VARCHAR(19), L.CHECKED_AT, 126), L_CARRIER = L.CARRIER`
export const CACHE_JOIN = (numExpr: string) => `LEFT JOIN dbo.MD_TRACKING_LIVE_CACHE L ON L.NUMBER = ${numExpr}`

/** Map L_* columns from a joined row (or memory fallback) to a cache row. */
export function cacheFromJoined(number: string, r: any): LiveCacheRow | undefined {
  const mem = memory.get(number)
  const db: LiveCacheRow | undefined = r?.L_CHECKED_AT
    ? {
        number, carrier: r.L_CARRIER ?? null, status: r.L_STATUS ?? null, live_eta: r.L_LIVE_ETA ?? null,
        eta_changed: !!r.L_ETA_CHANGED, summary: r.L_SUMMARY ?? null, source: r.L_SOURCE ?? null, ok: !!r.L_OK,
        checked_at: new Date(r.L_CHECKED_AT + "Z").toISOString(),
      }
    : undefined
  if (mem && (!db || db.checked_at < mem.checked_at)) return mem
  return db
}

export async function getLiveCache(number: string): Promise<LiveCacheRow | undefined> {
  const rows = await executeQuery(`SELECT ${CACHE_SELECT} FROM dbo.MD_TRACKING_LIVE_CACHE L WHERE L.NUMBER = @p0`, [number])
  return cacheFromJoined(number, rows?.[0])
}

export async function putLiveCache(r: LiveCacheRow): Promise<void> {
  memory.set(r.number, { ...r, raw: undefined })
  let raw: string | null = null
  try { raw = r.raw == null ? null : JSON.stringify(r.raw).slice(0, 200_000) } catch { raw = null }
  const params = [
    r.number, r.carrier, r.status, r.live_eta, r.eta_changed ? 1 : 0, r.summary, r.source, r.ok ? 1 : 0, new Date(r.checked_at), raw,
  ]
  const res = await executeQuery(
    `UPDATE dbo.MD_TRACKING_LIVE_CACHE
        SET CARRIER = @p1, STATUS = @p2, LIVE_ETA = CONVERT(DATETIME, @p3, 120), ETA_CHANGED = @p4, SUMMARY = @p5,
            SOURCE = @p6, OK = @p7, CHECKED_AT = @p8, RAW = @p9
      WHERE NUMBER = @p0;
     IF @@ROWCOUNT = 0
       INSERT INTO dbo.MD_TRACKING_LIVE_CACHE (NUMBER, CARRIER, STATUS, LIVE_ETA, ETA_CHANGED, SUMMARY, SOURCE, OK, CHECKED_AT, RAW)
       VALUES (@p0, @p1, @p2, CONVERT(DATETIME, @p3, 120), @p4, @p5, @p6, @p7, @p8, @p9);
     SELECT OK = 1;`,
    params
  )
  if (res) memory.delete(r.number) // persisted; DB is the source of truth again
  else console.warn("[tracking-cache] DB write failed; keeping snapshot in memory for", r.number)
}
