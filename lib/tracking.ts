import { executeQuery } from "@/lib/db"
import { liveCheck, hasLiveProvider, type LiveQuery } from "@/lib/live-tracking"
import { getLiveCache, putLiveCache, cacheFromJoined, CACHE_SELECT, CACHE_JOIN, type LiveCacheRow } from "@/lib/tracking-cache"

// ---------------------------------------------------------------------------
// Track & Trace data layer.
// Primary source: our own ERP data (TBL_CLIENT_KPI_DASHBOARD_PBI — the same table
// USP_CLIENT_DASHBOARD_PAGELOAD reads), joined to VSL_MASTER for vessel/voyage.
// Scoping replicates the SP exactly: the user's CMPID (from the signed session JWT)
// resolves to a CONCODE list via CMP_DTLS + TBL_KPI_CONSIGNEE_GRP, and rows are
// filtered to CONCODE IN that list. KPI users get their TOP 1 group; SA users get
// every group with an FK_CMPID. Any other role gets nothing.
// ---------------------------------------------------------------------------

export interface TrackEvent {
  label: string
  date: string | null // ISO yyyy-mm-dd
  done: boolean
}

export interface TrackResponse {
  found: boolean
  number: string
  mode: string | null
  status: string
  live_eta: string | null
  smart_summary: string
  message: string
  co2: string | null
  vessel: string | null
  voyage: string | null
  carrier: string | null
  pol: string | null
  pod: string | null
  etd: string | null
  atd: string | null
  eta: string | null
  ata: string | null
  delivery: string | null
  container_size: string | null
  jobs: string[]
  events: TrackEvent[]
  source: "ERP" | "Live" | "Demo"
  eta_changed: boolean
  live: LiveInfo | null
  live_supported: boolean
}

const t = (v: unknown) => (v == null ? "" : String(v).trim())

// ERP stores dates as dd/MM/yyyy strings; return ISO yyyy-mm-dd or null.
export function erpDate(v: unknown): string | null {
  const s = t(v)
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m || m[3] === "1900") return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

export function normalizeNumber(raw: unknown): string {
  return t(raw).toUpperCase().replace(/[\s-]/g, "")
}

/** Resolve the comma-separated CONCODE scope for a CMPID, mirroring the dashboard SP. */
async function resolveScope(cmpid: string | number): Promise<string[]> {
  const rows = await executeQuery(
    `SELECT CODES = CASE
        WHEN C.ROLETYPE = 'SA' THEN STUFF((SELECT ',' + G.CON_CODE FROM TBL_KPI_CONSIGNEE_GRP G
                                           WHERE G.FK_CMPID <> '' FOR XML PATH('')), 1, 1, '')
        WHEN C.ROLETYPE = 'KPI' THEN (SELECT TOP 1 G.CON_CODE FROM TBL_KPI_CONSIGNEE_GRP G WHERE G.FK_CMPID = C.CMPID)
        ELSE NULL END
     FROM CMP_DTLS C WHERE C.CMPID = @p0`,
    [String(cmpid)]
  )
  const codes = t(rows?.[0]?.CODES)
  return codes.split(",").map((c) => c.trim()).filter(Boolean)
}

const scopeCache = new Map<string, { codes: string[]; at: number }>()
async function getScope(cmpid: string | number) {
  const key = String(cmpid)
  const hit = scopeCache.get(key)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.codes
  const codes = await resolveScope(cmpid)
  scopeCache.set(key, { codes, at: Date.now() })
  return codes
}

// ERP SHPTSTATUS sometimes lags the milestone dates; dates showing a later stage win.
export function effectiveStatus(code: string, d: { atd: string | null; ata: string | null; delivery: string | null }): string {
  if (d.delivery) return "Delivered"
  if (d.ata && code !== "DELIVERED") return "Arrived"
  if (d.atd && (code === "BOOKING" || code === "RECEPT")) return "In Transit"
  return STATUS_LABEL[code] ?? (code || "Unknown")
}

const STATUS_LABEL: Record<string, string> = {
  BOOKING: "Booked",
  RECEPT: "Cargo Received",
  DEPARTED: "In Transit",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
}

export function buildEvents(r: { etd: string | null; atd: string | null; eta: string | null; ata: string | null; delivery: string | null; received?: string | null; booked?: string | null }): TrackEvent[] {
  return [
    { label: "Booked", date: r.booked ?? null, done: true },
    { label: "Cargo Received", date: r.received ?? null, done: !!(r.received || r.atd || r.ata || r.delivery) },
    { label: r.atd ? "Departed POL" : "Departure (est.)", date: r.atd || r.etd, done: !!(r.atd || r.ata || r.delivery) },
    { label: r.ata ? "Arrived POD" : "Arrival (est.)", date: r.ata || r.eta, done: !!(r.ata || r.delivery) },
    { label: "Delivered", date: r.delivery, done: !!r.delivery },
  ]
}

export function summarize(r: Pick<TrackResponse, "status" | "vessel" | "pol" | "pod" | "eta" | "ata" | "delivery" | "atd">): string {
  const route = r.pol && r.pod ? `${r.pol} → ${r.pod}` : ""
  if (r.delivery) return `Delivered on ${r.delivery}${route ? ` (${route})` : ""}.`
  if (r.ata) return `Arrived at ${r.pod ?? "destination"} on ${r.ata}; awaiting delivery.`
  if (r.atd) return `Sailed${r.vessel ? ` on ${r.vessel}` : ""}${route ? ` (${route})` : ""}. ETA ${r.eta ?? "not set"}.`
  return `${r.status}${route ? ` for ${route}` : ""}. ${r.eta ? `Planned ETA ${r.eta}.` : "ETA not yet available."}`
}

export function notFound(number: string, message?: string): TrackResponse {
  return {
    found: false, number, mode: null, status: "Not Found", live_eta: null,
    smart_summary: message ?? "No shipment with this container / MAWB number was found in your account.",
    message: message ?? "Not found", co2: null, vessel: null, voyage: null, carrier: null, pol: null, pod: null,
    etd: null, atd: null, eta: null, ata: null, delivery: null, container_size: null, jobs: [], events: [],
    source: "ERP", eta_changed: false, live: null, live_supported: false,
  }
}

/** Look up a container / MAWB number within the user's client scope. */
export async function trackFromErp(cmpid: string | number, rawNumber: string): Promise<TrackResponse> {
  const number = normalizeNumber(rawNumber)
  const codes = await getScope(cmpid)
  if (codes.length === 0) return notFound(number, "Your account has no client scope configured.")

  const rows = await executeQuery(
    `SELECT TOP 100 A.JOBNO, A.MODE, A.ISDIFFAIR, A.LINER_NAME, A.LINER_CODE, A.AIRLINENAME,
            POL = CASE WHEN A.POL = '600' THEN 'MAA' ELSE A.POL END, A.POD, A.CONT_CONTSIZE,
            A.DOCRECD, A.CARGORECPT, A.ETD, A.ATD, A.ETA, A.ATA, A.DELIVERY, A.SHPTSTATUS, A.DOCDT,
            A.CO2, A.CO2_ORDER, VSL = M.vsl_name, VOY = M.vsl_voyno
       FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
       INNER JOIN EXPT_MASTER B ON A.JOBNO = B.EXPTNO
       LEFT JOIN VSL_MASTER M ON M.vsl_rtno = A.CONT_VESSEL
      WHERE (A.CONTMAWB = @p0 OR A.MAWBNO = @p0)
        AND A.CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p1, ',') WHERE VALUE <> '')
      ORDER BY A.DOCDT DESC, A.ID DESC`,
    [number, codes.join(",")]
  )
  if (!rows) throw new Error("ERP query failed")
  if (rows.length === 0) return notFound(number)

  // Use the most recent job's row; collect all job numbers.
  const r = rows[0]
  const jobs = [...new Set(rows.map((x: any) => t(x.JOBNO)).filter(Boolean))] as string[]
  // CO2 is per order row; sum distinct order CO2, fall back to container CO2.
  const co2Order = rows.reduce((s: number, x: any) => s + (Number(x.CO2_ORDER) || 0), 0)
  const co2Val = co2Order || Number(r.CO2) || 0
  const mode = t(r.MODE).toUpperCase() === "SEA" && t(r.ISDIFFAIR) === "2" ? "SEA-AIR" : t(r.MODE).toUpperCase() || null

  const base = {
    etd: erpDate(r.ETD), atd: erpDate(r.ATD), eta: erpDate(r.ETA), ata: erpDate(r.ATA), delivery: erpDate(r.DELIVERY),
  }
  const statusCode = t(r.SHPTSTATUS).toUpperCase()
  const status = effectiveStatus(statusCode, base)
  const res: TrackResponse = {
    found: true, number, mode, status,
    live_eta: base.ata || base.eta,
    smart_summary: "", message: "",
    co2: co2Val ? `${co2Val.toFixed(2)} kg` : null,
    vessel: t(r.VSL) || null, voyage: t(r.VOY) || null,
    carrier: t(r.LINER_NAME) || t(r.AIRLINENAME) || t(r.LINER_CODE) || null,
    pol: t(r.POL) || null, pod: t(r.POD) || null,
    ...base,
    container_size: t(r.CONT_CONTSIZE) || null,
    jobs,
    events: buildEvents({ ...base, booked: erpDate(r.DOCRECD), received: erpDate(r.CARGORECPT) }),
    source: "ERP", eta_changed: false, live: null, live_supported: false,
  }
  res.smart_summary = res.message = summarize(res)
  res.live_supported = hasLiveProvider(liveQueryOf(res))
  return applyLive(res, await getLiveCache(number))
}

// ---------------------------------------------------------------------------
// Live layer: cached snapshots (tracking_live_cache) + on-demand provider checks.
// ---------------------------------------------------------------------------
export interface LiveInfo {
  checked_at: string
  ok: boolean
  status: string | null
  live_eta: string | null
  eta_changed: boolean
  summary: string | null
  source: string | null
}

const toLiveInfo = (c: LiveCacheRow): LiveInfo => ({
  checked_at: c.checked_at, ok: c.ok, status: c.status, live_eta: c.live_eta,
  eta_changed: c.eta_changed, summary: c.summary, source: c.source,
})

/** Merge a live snapshot into an ERP response (only successful snapshots override ERP fields). */
export function applyLive(res: TrackResponse, c: LiveCacheRow | undefined): TrackResponse {
  if (!c) return res
  const live = toLiveInfo(c)
  if (!c.ok) return { ...res, live }
  const out: TrackResponse = { ...res, live, source: "Live", live_eta: c.live_eta ?? res.live_eta, eta_changed: c.eta_changed }
  // Never let a live status downgrade a later ERP milestone (e.g. ERP Delivered vs carrier In Transit).
  const rank = (s: string) => /return|deliver/i.test(s) ? 3 : /arriv/i.test(s) ? 2 : /transit|depart/i.test(s) ? 1 : 0
  if (c.status && rank(c.status) >= rank(res.status)) out.status = c.status
  if (c.summary) out.smart_summary = out.message = c.summary
  return out
}

export function liveQueryOf(r: { number: string; carrier: string | null; pod: string | null; eta: string | null; mode: string | null }): LiveQuery {
  return { number: r.number, carrier: r.carrier, pod: r.pod, eta: r.eta, mode: r.mode }
}

/** Run a live provider check now, persist the snapshot, return the cache row. */
export async function refreshLive(q: LiveQuery): Promise<LiveCacheRow> {
  const r = await liveCheck(q)
  const row: LiveCacheRow = {
    number: q.number, carrier: q.carrier, status: r.status, live_eta: r.live_eta, eta_changed: r.eta_changed,
    summary: r.summary, source: r.provider, ok: r.ok, checked_at: new Date().toISOString(), raw: r.raw,
  }
  if (!r.available) return row // don't store "no provider" placeholders
  // A failed check must not wipe a previous good snapshot; keep it and report the failure.
  if (!r.ok) {
    const prev = await getLiveCache(q.number)
    if (prev?.ok) return { ...prev, summary: `${prev.summary ?? ""} (latest check failed: ${r.summary})`.trim() }
  }
  await putLiveCache(row)
  return row
}

// ---------------------------------------------------------------------------
// Container list (server-side pagination, filters in SQL), scoped like the dashboard.
// One row per container/MAWB number = its most recent ERP job row.
// ---------------------------------------------------------------------------
export const PAGE_SIZE = 20

export interface ListFilters {
  page?: number
  q?: string | null
  mode?: string | null
  carrier?: string | null
  status?: string | null // ERP SHPTSTATUS code
  pod?: string | null
  active?: boolean // true = not delivered (default)
}

export interface ListRow {
  number: string
  mawb: string | null
  mode: string | null
  carrier: string | null
  pol: string | null
  pod: string | null
  vessel: string | null
  voyage: string | null
  etd: string | null
  atd: string | null
  eta: string | null
  ata: string | null
  delivery: string | null
  status: string
  status_code: string
  live: LiveInfo | null
  live_supported: boolean
}

export interface ListResponse {
  rows: ListRow[]
  total: number
  page: number
  pageSize: number
  options: { carriers: string[]; pods: string[]; statuses: string[]; modes: string[] }
}

const MODE_SQL = `CASE WHEN UPPER(A.MODE)='SEA' AND A.ISDIFFAIR='2' THEN 'SEA-AIR' ELSE UPPER(A.MODE) END`
const CARRIER_SQL = `COALESCE(NULLIF(LTRIM(RTRIM(A.LINER_NAME)),''), NULLIF(LTRIM(RTRIM(A.AIRLINENAME)),''), NULLIF(LTRIM(RTRIM(A.LINER_CODE)),''))`
// Same 12-month window the dashboard SP uses (DOCDT is yyyyMMdd text).
const WINDOW_SQL = `A.DOCDT >= CONVERT(VARCHAR(8), DATEADD(MM, -12, GETDATE()), 112)`

const optionsCache = new Map<string, { v: ListResponse["options"]; at: number }>()

async function listOptions(cmpid: string, scope: string): Promise<ListResponse["options"]> {
  const hit = optionsCache.get(cmpid)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.v
  const rows = await executeQuery(
    `SELECT DISTINCT K = 'C', V = ${CARRIER_SQL} FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
       WHERE A.CONTMAWB <> '' AND ${WINDOW_SQL} AND A.CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')
     UNION SELECT DISTINCT 'P', LTRIM(RTRIM(A.POD)) FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
       WHERE A.CONTMAWB <> '' AND ${WINDOW_SQL} AND A.CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')
     UNION SELECT DISTINCT 'S', UPPER(LTRIM(RTRIM(A.SHPTSTATUS))) FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
       WHERE A.CONTMAWB <> '' AND ${WINDOW_SQL} AND A.CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')
     UNION SELECT DISTINCT 'M', ${MODE_SQL} FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
       WHERE A.CONTMAWB <> '' AND ${WINDOW_SQL} AND A.CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')`,
    [scope]
  )
  const pick = (k: string) => [...new Set((rows ?? []).filter((r: any) => r.K === k && t(r.V)).map((r: any) => t(r.V)))].sort() as string[]
  const v = { carriers: pick("C"), pods: pick("P"), statuses: pick("S"), modes: pick("M") }
  optionsCache.set(cmpid, { v, at: Date.now() })
  return v
}

function mapListRow(r: any): ListRow {
  const code = t(r.SHPTSTATUS).toUpperCase()
  const row: ListRow = {
    number: t(r.NUM), mawb: t(r.MAWBNO) || null, mode: t(r.MODE) || null, carrier: t(r.CARRIER) || null,
    pol: t(r.POL) || null, pod: t(r.POD) || null, vessel: t(r.VSL) || null, voyage: t(r.VOY) || null,
    etd: erpDate(r.ETD), atd: erpDate(r.ATD), eta: erpDate(r.ETA), ata: erpDate(r.ATA), delivery: erpDate(r.DELIVERY),
    status: "", status_code: code, live: null, live_supported: false,
  }
  row.status = effectiveStatus(code, row)
  row.live_supported = hasLiveProvider(liveQueryOf(row))
  return row
}

export async function listContainers(cmpid: string | number, f: ListFilters): Promise<ListResponse> {
  const codes = await getScope(cmpid)
  const page = Math.max(1, Math.floor(f.page ?? 1))
  const empty = { carriers: [], pods: [], statuses: [], modes: [] }
  if (codes.length === 0) return { rows: [], total: 0, page, pageSize: PAGE_SIZE, options: empty }
  const scope = codes.join(",")
  const q = t(f.q).toUpperCase().slice(0, 40)
  const active = f.active !== false

  const listSql = `
    WITH base AS (
      SELECT NUM = A.CONTMAWB, A.MAWBNO, MODE = ${MODE_SQL}, CARRIER = ${CARRIER_SQL},
             POL = CASE WHEN A.POL = '600' THEN 'MAA' ELSE A.POL END, A.POD, A.CONT_VESSEL,
             A.ETD, A.ATD, A.ETA, A.ATA, A.DELIVERY, SHPTSTATUS = UPPER(LTRIM(RTRIM(A.SHPTSTATUS))), A.DOCDT, A.JOBNO,
             RN = ROW_NUMBER() OVER (PARTITION BY A.CONTMAWB ORDER BY A.DOCDT DESC, A.ID DESC)
        FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
       INNER JOIN EXPT_MASTER B ON A.JOBNO = B.EXPTNO
       WHERE A.CONTMAWB <> '' AND ${WINDOW_SQL}
         AND A.CONCODE IN (SELECT VALUE FROM DBO.FN_SPLIT(@p0, ',') WHERE VALUE <> '')
    ), f AS (
      SELECT base.*, VSL = M.vsl_name, VOY = M.vsl_voyno
        FROM base OUTER APPLY (SELECT TOP 1 vsl_name, vsl_voyno FROM VSL_MASTER WHERE vsl_rtno = base.CONT_VESSEL) M
       WHERE RN = 1
         AND (@p1 = 0 OR (SHPTSTATUS <> 'DELIVERED' AND ISNULL(DELIVERY, '') = ''))
         AND (@p2 = '' OR NUM LIKE '%' + @p2 + '%' OR MAWBNO LIKE '%' + @p2 + '%' OR JOBNO LIKE '%' + @p2 + '%' OR M.vsl_name LIKE '%' + @p2 + '%')
         AND (@p3 = '' OR MODE = @p3)
         AND (@p4 = '' OR CARRIER = @p4)
         AND (@p5 = '' OR SHPTSTATUS = @p5)
         AND (@p6 = '' OR POD = @p6)
    )
    , p AS (SELECT TOTAL = COUNT(*) OVER (), PN = ROW_NUMBER() OVER (ORDER BY DOCDT DESC, NUM), * FROM f)
    SELECT p.*, ${CACHE_SELECT} FROM p ${CACHE_JOIN("p.NUM")} WHERE PN > @p7 AND PN <= @p7 + ${PAGE_SIZE} ORDER BY PN`

  const [rows, options] = await Promise.all([
    executeQuery(listSql, [scope, active ? 1 : 0, q, t(f.mode).toUpperCase(), t(f.carrier), t(f.status).toUpperCase(), t(f.pod).toUpperCase(), (page - 1) * PAGE_SIZE]),
    listOptions(String(cmpid), scope),
  ])
  if (!rows) throw new Error("ERP list query failed")
  const list = rows.map((x: any) => {
    const r = mapListRow(x)
    const c = cacheFromJoined(r.number, x)
    if (c) r.live = toLiveInfo(c)
    return r
  })
  return { rows: list, total: rows[0]?.TOTAL ?? 0, page, pageSize: PAGE_SIZE, options }
}

/** Active containers across ALL clients for the background refresh (cron only). */
export async function activeContainersForRefresh(): Promise<LiveQuery[]> {
  const rows = await executeQuery(
    `WITH base AS (
       SELECT NUM = A.CONTMAWB, MODE = ${MODE_SQL}, CARRIER = ${CARRIER_SQL}, A.POD, A.ETA, A.ATA, A.DELIVERY,
              SHPTSTATUS = UPPER(LTRIM(RTRIM(A.SHPTSTATUS))),
              RN = ROW_NUMBER() OVER (PARTITION BY A.CONTMAWB ORDER BY A.DOCDT DESC, A.ID DESC)
         FROM TBL_CLIENT_KPI_DASHBOARD_PBI A
        WHERE A.CONTMAWB <> '' AND ${WINDOW_SQL})
     SELECT NUM, MODE, CARRIER, POD, ETA, ATA FROM base
      WHERE RN = 1 AND SHPTSTATUS <> 'DELIVERED' AND ISNULL(DELIVERY, '') = ''
        AND (ISNULL(ATA, '') = '' OR (CASE WHEN LEN(ATA) = 10 AND ATA LIKE '[0-3][0-9]/[01][0-9]/[12][0-9][0-9][0-9]' AND ISDATE(SUBSTRING(ATA,7,4)+SUBSTRING(ATA,4,2)+LEFT(ATA,2)) = 1 THEN CONVERT(DATETIME, ATA, 103) END >= DATEADD(DD, -30, GETDATE())))`
  )
  if (!rows) throw new Error("ERP active query failed")
  return rows.map((r: any) => ({ number: t(r.NUM).toUpperCase(), carrier: t(r.CARRIER) || null, pod: t(r.POD) || null, eta: erpDate(r.ETA), mode: t(r.MODE) || null }))
}

// ---------------------------------------------------------------------------
// Demo mode (dummy/dummy login has no ERP scope): deterministic sample data for
// numbers with a valid ISO 6346 check digit; anything else is "not found".
// ---------------------------------------------------------------------------
export function isValidIso6346(n: string): boolean {
  if (!/^[A-Z]{4}\d{7}$/.test(n)) return false
  const val = (c: string) => {
    if (/\d/.test(c)) return Number(c)
    let v = c.charCodeAt(0) - 55 // A=10
    v += Math.floor((v - 1) / 10) // skip multiples of 11
    return v
  }
  let sum = 0
  for (let i = 0; i < 10; i++) sum += val(n[i]) * 2 ** i
  return (sum % 11) % 10 === Number(n[10])
}

export function trackDemo(rawNumber: string): TrackResponse {
  const number = normalizeNumber(rawNumber)
  if (!isValidIso6346(number)) return notFound(number, "No shipment with this number in the demo dataset.")
  let h = 0
  for (const c of number) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const pick = <T,>(a: T[], k: number) => a[(h >>> k) % a.length]
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
  const stage = h % 4 // 0 booked, 1 in transit, 2 arrived, 3 delivered
  const etdOff = -30 + (h % 10)
  const base = {
    etd: day(etdOff), atd: stage >= 1 ? day(etdOff) : null,
    eta: day(etdOff + 32), ata: stage >= 2 ? day(etdOff + 33) : null,
    delivery: stage >= 3 ? day(etdOff + 36) : null,
  }
  if (stage === 0) { base.etd = day(5); base.eta = day(37) }
  const res: TrackResponse = {
    found: true, number, mode: "SEA",
    status: ["Booked", "In Transit", "Arrived", "Delivered"][stage],
    live_eta: base.ata || base.eta, smart_summary: "", message: "",
    co2: `${(800 + (h % 1200)).toFixed(2)} kg`,
    vessel: pick(["CMA CGM TIGRIS", "MSC AURORA", "MAERSK ESSEX", "ONE HARMONY"], 3),
    voyage: `${100 + (h % 800)}${pick(["E", "W", "S", "N"], 5)}`,
    carrier: pick(["CMA CGM", "MSC", "MAERSK", "ONE"], 7),
    pol: pick(["MAA", "NSA", "TUT", "CMB"], 9), pod: pick(["ANR", "RTM", "HAM", "LEH"], 11),
    ...base, container_size: pick(["20GP", "40GP", "40HC"], 13), jobs: [],
    events: buildEvents({ ...base, booked: day(etdOff - 10), received: stage >= 1 ? day(etdOff - 3) : null }),
    source: "Demo", eta_changed: false, live: null, live_supported: false,
  }
  res.smart_summary = res.message = summarize(res) + " (demo data)"
  return res
}

// Demo list: deterministic sample containers with valid ISO 6346 check digits.
function withCheckDigit(prefix: string, serial: number): string {
  const body = `${prefix}${String(serial).padStart(6, "0")}`
  for (let d = 0; d <= 9; d++) if (isValidIso6346(body + d)) return body + d
  return body + "0"
}
let demoRows: ListRow[] | null = null
function allDemoRows(): ListRow[] {
  if (demoRows) return demoRows
  const prefixes = ["ONEU", "MSCU", "MAEU", "CMAU", "HLCU", "TGBU"]
  demoRows = Array.from({ length: 67 }, (_, i) => {
    const n = withCheckDigit(prefixes[i % prefixes.length], 100000 + i * 7919)
    const d = trackDemo(n)
    const row: ListRow = {
      number: n, mawb: null, mode: d.mode, carrier: d.carrier, pol: d.pol, pod: d.pod, vessel: d.vessel, voyage: d.voyage,
      etd: d.etd, atd: d.atd, eta: d.eta, ata: d.ata, delivery: d.delivery, status: d.status,
      status_code: ({ Booked: "BOOKING", "In Transit": "DEPARTED", Arrived: "ARRIVED", Delivered: "DELIVERED" } as Record<string, string>)[d.status] ?? "",
      live: null, live_supported: true,
    }
    return row
  })
  return demoRows
}

export function listDemo(f: ListFilters): ListResponse {
  const all = allDemoRows()
  const q = t(f.q).toUpperCase()
  const rows = all.filter((r) =>
    (f.active === false || r.status_code !== "DELIVERED") &&
    (!q || r.number.includes(q) || up(r.vessel).includes(q)) &&
    (!f.mode || r.mode === f.mode) && (!f.carrier || r.carrier === f.carrier) &&
    (!f.status || r.status_code === f.status) && (!f.pod || r.pod === f.pod))
  const page = Math.max(1, Math.floor(f.page ?? 1))
  const uniq = (k: keyof ListRow) => [...new Set(all.map((r) => String(r[k] ?? "")).filter(Boolean))].sort()
  return {
    rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: rows.length, page, pageSize: PAGE_SIZE,
    options: { carriers: uniq("carrier"), pods: uniq("pod"), statuses: uniq("status_code"), modes: uniq("mode") },
  }
}

export function demoLive(number: string): LiveInfo {
  const d = trackDemo(number)
  return {
    checked_at: new Date().toISOString(), ok: d.found, status: d.status, live_eta: d.ata || d.eta,
    eta_changed: false, summary: d.found ? `Demo live check: ${d.status}.` : "Not found", source: "Demo",
  }
}
const up = (s: string | null | undefined) => (s ?? "").toUpperCase()
