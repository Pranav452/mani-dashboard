// ---------------------------------------------------------------------------
// Pluggable live carrier tracking.
// Each provider declares which shipments it can handle; the first match runs.
//  - ONE (Ocean Network Express): public e-comm JSON API, no key (ported from vipar).
//  - Maersk / Hapag-Lloyd / CMA CGM: official-API stubs, active only when their key env is set.
//  - cargoo-tracker (TRACKER_BACKEND_URL): the user's always-on PC opens the carrier's public
//    tracking page with plain Playwright and extracts the result. Only carriers whose sites
//    allow it (TRACKER_CARRIERS, default MSC + COSCO) are routed there.
// No provider may bypass bot protection (e.g. Cloudflare Turnstile).
// ---------------------------------------------------------------------------

export interface LiveQuery {
  number: string
  carrier: string | null
  pod: string | null // ERP POD (3-letter code, e.g. ANR)
  eta: string | null // ERP ETA ISO yyyy-mm-dd
  mode: string | null
}

export interface LiveResult {
  available: boolean // false = no provider for this carrier
  ok: boolean // provider ran and returned usable data
  provider: string | null
  status: string | null
  live_eta: string | null // ISO yyyy-mm-dd
  eta_changed: boolean
  summary: string
  vessel?: string | null
  voyage?: string | null
  events?: { date: string | null; location: string | null; description: string | null }[]
  raw?: unknown
}

interface LiveProvider {
  name: string
  enabled(): boolean
  matches(q: LiveQuery): boolean
  track(q: LiveQuery): Promise<LiveResult>
}

const NOT_AVAILABLE: LiveResult = {
  available: false, ok: false, provider: null, status: null, live_eta: null, eta_changed: false,
  summary: "Live tracking not available for this carrier yet",
}

const up = (s: string | null | undefined) => (s ?? "").toUpperCase()
export const etaDiffers = (erpEta: string | null, liveEta: string | null) =>
  !!erpEta && !!liveEta && erpEta !== liveEta

function fail(provider: string, summary: string, raw?: unknown): LiveResult {
  return { available: true, ok: false, provider, status: null, live_eta: null, eta_changed: false, summary, raw }
}

// --------------------------- ONE ------------------------------------------
const ONE_API = "https://ecomm.one-line.com/api/v2/edh/containers/track-and-trace/search"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

interface OneEvent { matrixId: string; locationName?: string; date?: string; localPortDate?: string; trigger?: string }
interface OneContainer {
  bookingNo?: string; containerNo?: string
  latestEvent?: { eventName?: string; locationName?: string; date?: string }
  por?: { code?: string; locationName?: string; countryName?: string }
  pod?: { code?: string; locationName?: string; countryName?: string }
  vesselVoyage?: { vesselName?: string; voyageNo?: string }
  cargoEvents?: OneEvent[]
}

// localPortDate is local wall time serialized with a Z suffix — take the date part as-is.
const oneDay = (e?: OneEvent) => (e ? (e.localPortDate || e.date || "").slice(0, 10) || null : null)

const oneProvider: LiveProvider = {
  name: "ONE",
  enabled: () => true,
  matches: (q) =>
    q.mode !== "AIR" &&
    (/^ONE[YU]/.test(up(q.number)) || /\bONE\b|OCEAN NETWORK/.test(up(q.carrier))),
  async track(q) {
    let json: { status?: number; message?: string; data?: OneContainer[] } = {}
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(ONE_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json", "User-Agent": UA, Origin: "https://ecomm.one-line.com",
            Referer: "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",
          },
          body: JSON.stringify({ page: 1, page_length: 20, filters: { search_text: q.number, search_type: "CNTR_NO" }, timestamp: Date.now() }),
          signal: AbortSignal.timeout(20_000),
          cache: "no-store",
        })
        json = await res.json()
      } catch {
        return fail("ONE", "ONE tracking service unreachable")
      }
      // Rate-limited: back off once, then give up (the cron runs again in 6 h).
      if (json.status === 429 || /throttl|too many/i.test(json.message ?? "")) {
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 3000)); continue }
        return fail("ONE", "ONE tracking is rate-limiting requests; try again later")
      }
      break
    }
    if (json.status !== 200) return fail("ONE", `ONE tracking error: ${json.message ?? "unknown"}`)
    const list = Array.isArray(json.data) ? json.data : []
    if (list.length === 0) return fail("ONE", "Container not found on ONE tracking")

    // Containers are reused across trips: prefer the record whose POD matches our ERP POD
    // (UN/LOCODE suffix, e.g. BEANR ↔ ANR). If none matches, don't report a misleading ETA.
    // Also require the ONE arrival date to be within 45 days of our ERP ETA (same POD can be a later trip).
    const pod = up(q.pod)
    const near = (x: OneContainer) => {
      const d = oneDay((x.cargoEvents ?? []).find((e) => e.matrixId === "E089"))
      if (!q.eta || !d) return true
      return Math.abs(new Date(d).getTime() - new Date(q.eta).getTime()) <= 45 * 86_400_000
    }
    const c = list.find((x) => (!pod || up(x.pod?.code).endsWith(pod)) && near(x))
    if (!c) {
      const other = list[0]
      return fail("ONE", `ONE's latest trip for this container (${other.por?.locationName ?? "?"} → ${other.pod?.locationName ?? "?"}) doesn't match this shipment`, list)
    }
    const arrival = (c.cargoEvents ?? []).find((e) => e.matrixId === "E089")
    const departure = (c.cargoEvents ?? []).find((e) => e.matrixId === "E061")
    // ONE sometimes leaves the POD arrival as ESTIMATED after the box is long delivered,
    // so the latest event name wins when it shows a later stage.
    const ev = up(c.latestEvent?.eventName)
    const returned = /EMPTY.*RETURN/.test(ev)
    const delivered = returned || /GATE OUT|DELIVER|PICKED UP|UNLOADED FROM .*AT DESTINATION/.test(ev)
    const arrived = delivered || arrival?.trigger === "ACTUAL" || /DISCHARG|ARRIV/.test(ev)
    const status = returned ? "Empty Returned" : delivered ? "Delivered" : arrived ? "Arrived"
      : departure?.trigger === "ACTUAL" ? "In Transit" : "At Origin"
    const live_eta = oneDay(arrival)
    const vv = [c.vesselVoyage?.vesselName, c.vesselVoyage?.voyageNo].filter(Boolean).join(" ")
    const last = c.latestEvent
    const summary = [
      last?.eventName ? `${last.eventName}${last.locationName ? ` at ${last.locationName}` : ""}${last.date ? ` (${last.date.slice(0, 10)})` : ""}.` : "",
      vv ? `Vessel ${vv}.` : "",
      live_eta ? `${arrived ? "Arrived" : "ETA"} ${c.pod?.locationName ?? "POD"} ${live_eta}.` : "",
    ].filter(Boolean).join(" ")
    return { available: true, ok: true, provider: "ONE", status, live_eta, eta_changed: etaDiffers(q.eta, live_eta), summary, raw: c }
  },
}

// ------------------- Official carrier API stubs ---------------------------
// Activated only when the key env var is set. Implement track() against the
// carrier's official API when credentials are obtained.
function officialStub(name: string, envKey: string, carrierRe: RegExp, prefixRe: RegExp): LiveProvider {
  return {
    name,
    enabled: () => !!process.env[envKey]?.trim(),
    matches: (q) => q.mode !== "AIR" && (carrierRe.test(up(q.carrier)) || prefixRe.test(up(q.number))),
    async track() {
      return fail(name, `${name} official API integration not implemented yet`)
    },
  }
}

const maerskProvider = officialStub("Maersk", "MAERSK_API_KEY", /MAERSK/, /^(MAEU|MSKU|MRKU|MRSU)/)
const hapagProvider = officialStub("Hapag-Lloyd", "HAPAG_API_KEY", /HAPAG/, /^(HLCU|HLXU|HAMU)/)
const cmaProvider = officialStub("CMA CGM", "CMA_API_KEY", /^CMA|CMA CGM/, /^(CMAU|CGMU|APHU|APZU)/)

// --------------------- cargoo-tracker (always-on PC) ----------------------
// Carrier keys the tracker can read (others are blocked by bot walls — see tracker /health).
const TRACKER_CARRIER_RES: Record<string, { name: RegExp; prefix: RegExp }> = {
  MSC: { name: /\bMSC\b|MEDITERRANEAN/, prefix: /^(MSCU|MEDU|MSDU|MSMU)/ },
  COSCO: { name: /COSCO|\bOOCL\b/, prefix: /^(CSNU|CBHU|CCLU|COSU)/ },
  CMA: { name: /^CMA|CMA CGM|\bANL\b/, prefix: /^(CMAU|CGMU|APZU|APHU|ECMU)/ },
  HAPAG: { name: /HAPAG/, prefix: /^(HLXU|HLCU|HLBU|HAMU)/ },
  MAERSK: { name: /MAERSK/, prefix: /^(MAEU|MSKU|MRKU|MRSU)/ },
  EVERGREEN: { name: /EVERGREEN/, prefix: /^(EGHU|EMCU|EGSU|EISU)/ },
  HMM: { name: /\bHMM\b|HYUNDAI/, prefix: /^(HDMU|HMMU)/ },
}
const trackerCarriers = () =>
  (process.env.TRACKER_CARRIERS?.trim() || "MSC,COSCO").toUpperCase().split(",").map((s) => s.trim()).filter((k) => k in TRACKER_CARRIER_RES)

// A carrier-name match wins; leased boxes (BSIU, CLHU, ...) have no carrier prefix.
function trackerMatches(q: LiveQuery): boolean {
  const name = up(q.carrier).trim()
  const keys = trackerCarriers()
  if (name && name !== "UNKNOWN") {
    const hit = Object.entries(TRACKER_CARRIER_RES).find(([, r]) => r.name.test(name))
    if (hit) return keys.includes(hit[0])
  }
  return keys.some((k) => TRACKER_CARRIER_RES[k].prefix.test(up(q.number)))
}

const isoOf = (v: unknown): string | null => {
  const m = String(v ?? "").trim().match(/(\d{4})-(\d{2})-(\d{2})|(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? (m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${m[5]}-${m[4]}`) : null
}

const cargooProvider: LiveProvider = {
  name: "cargoo-tracker",
  enabled: () => !!process.env.TRACKER_BACKEND_URL?.trim(),
  matches: (q) => q.mode !== "AIR" && !oneProvider.matches(q) && trackerMatches(q),
  async track(q) {
    const url = process.env.TRACKER_BACKEND_URL!.trim().replace(/\/$/, "")
    try {
      const r = await fetch(`${url}/api/track/sea`, {
        method: "POST",
        // ngrok free domains show an interstitial to browsers unless this header is sent.
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
        body: JSON.stringify({ number: q.number, carrier: q.carrier ?? "Unknown", system_eta: q.eta ?? "N/A" }),
        signal: AbortSignal.timeout(100_000), // the PC drives a real browser: ~30-60 s per check
        cache: "no-store",
      })
      if (!r.ok) return fail("cargoo-tracker", "Live tracker returned an error")
      const d: any = await r.json()
      const provider = d?.provider ? `${d.provider} (live)` : "cargoo-tracker"
      if (/unavailable|not found/i.test(String(d?.status ?? ""))) {
        return fail(provider, String(d?.reason || d?.smart_summary || "Live tracking unavailable"), d)
      }
      const live_eta = isoOf(d?.live_eta_iso) ?? isoOf(d?.live_eta)
      if (!live_eta) return fail(provider, "Live tracker had no ETA", d)
      // Containers are reused across trips: only trust an ETA within 45 days of the ERP ETA.
      if (q.eta && Math.abs(new Date(live_eta).getTime() - new Date(q.eta).getTime()) > 45 * 86_400_000) {
        return fail(provider, `Carrier's current trip for this container (ETA ${live_eta}) doesn't match this shipment`, d)
      }
      const vv = [d?.vessel, d?.voyage].filter(Boolean).join(" ")
      const summary = [String(d?.smart_summary ?? "").trim(), vv && !String(d?.smart_summary ?? "").includes(vv) ? `Vessel ${vv}.` : ""]
        .filter(Boolean).join(" ")
      return {
        available: true, ok: true, provider,
        status: d?.status && !/error|unknown/i.test(d.status) ? String(d.status) : null,
        live_eta, eta_changed: etaDiffers(q.eta, live_eta), summary,
        vessel: d?.vessel ?? null, voyage: d?.voyage ?? null,
        events: Array.isArray(d?.events) ? d.events : [],
        raw: d,
      }
    } catch {
      return fail("cargoo-tracker", "Live tracker unreachable")
    }
  },
}

const PROVIDERS: LiveProvider[] = [oneProvider, maerskProvider, hapagProvider, cmaProvider, cargooProvider]

export function hasLiveProvider(q: LiveQuery): boolean {
  return PROVIDERS.some((p) => p.enabled() && p.matches(q))
}

export async function liveCheck(q: LiveQuery): Promise<LiveResult> {
  const p = PROVIDERS.find((x) => x.enabled() && x.matches(q))
  if (!p) return NOT_AVAILABLE
  const res = await p.track(q)
  // A carrier-specific provider failed → try the generic fallback if configured.
  if (!res.ok && p !== cargooProvider && cargooProvider.enabled() && cargooProvider.matches(q)) {
    const fb = await cargooProvider.track(q)
    if (fb.ok) return fb
  }
  return res
}
