'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { PremiumPageShell } from "@/components/PremiumPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Ship, UploadCloud, Download, Play, ArrowRight, Check, AlertCircle, Radio, Database, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { parseExcel, normalizeKeys, exportData } from "@/lib/excel-utils";

// --- Types ---
interface TrackEvent { label: string; date: string | null; done: boolean }
interface TrackData {
  found?: boolean;
  status?: string;
  live_eta?: string | null;
  smart_summary?: string;
  message?: string;
  co2?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  carrier?: string | null;
  pol?: string | null;
  pod?: string | null;
  etd?: string | null;
  atd?: string | null;
  eta?: string | null;
  ata?: string | null;
  delivery?: string | null;
  mode?: string | null;
  container_size?: string | null;
  jobs?: string[];
  events?: TrackEvent[];
  source?: string;
  eta_changed?: boolean;
  live?: LiveInfo | null;
  live_supported?: boolean;
}
interface LiveInfo { checked_at: string; ok: boolean; status: string | null; live_eta: string | null; eta_changed: boolean; summary: string | null; source: string | null }
interface TrackResult {
  id?: number;
  container: string;
  carrier: string;
  status: string;
  liveEta: string;
  summary: string;
  co2: string;
  loading: boolean;
  selected?: boolean;
  data?: TrackData;
}

const BULK_CONCURRENCY = 4;

async function lookup(number: string, carrier: string, live: boolean): Promise<{ data: TrackData; ok: boolean; httpStatus: number }> {
  const res = await fetch("/api/proxy/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number, carrier, live }),
  });
  const data = (await res.json().catch(() => ({}))) as TrackData;
  return { data, ok: res.ok, httpStatus: res.status };
}

function toRow(r: TrackResult, data: TrackData, httpStatus: number): TrackResult {
  if (httpStatus === 401) return { ...r, loading: false, status: "Error", summary: "Session expired — please sign in again" };
  return {
    ...r,
    loading: false,
    data,
    carrier: data.carrier || r.carrier,
    status: data.status || "Error",
    liveEta: data.live_eta || data.eta || "-",
    summary: data.smart_summary || data.message || "No info found",
    co2: data.co2 || "-",
  };
}

const fmt = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

// Carrier public tracking pages, opened in the user's own browser (prefilled where the site supports it).
// `embed` = site renders inside an iframe (verified Nov 2026); others refuse framing, so link only.
const CARRIER_SITES: { key: RegExp; prefix?: RegExp; name: string; url: (n: string) => string; embed?: boolean }[] = [
  { key: /MAERSK|SEALAND/, prefix: /^(MAEU|MSKU|MRKU|MRSU|SEAU)/, name: "Maersk", url: (n) => `https://www.maersk.com/tracking/${n}`, embed: true },
  { key: /COSCO|OOCL/, prefix: /^(CSNU|CBHU|CCLU|OOLU|OOCU)/, name: "COSCO", url: (n) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number=${n}`, embed: true },
  { key: /\bMSC\b|MEDITERRANEAN/, prefix: /^(MSCU|MEDU|MSDU|MSMU)/, name: "MSC", url: (n) => `https://www.msc.com/en/track-a-shipment?trackingNumber=${n}` },
  { key: /CMA|CGM|\bAPL\b|\bANL\b/, prefix: /^(CMAU|CGMU|APZU|APHU|ECMU)/, name: "CMA CGM", url: (n) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=${n}` },
  { key: /HAPAG|HLAG/, prefix: /^(HLXU|HLCU|HLBU|UACU)/, name: "Hapag-Lloyd", url: (n) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${n}` },
  { key: /\bONE\b|OCEAN NETWORK/, prefix: /^(ONEU|ONEY|NYKU|MOLU|KKFU)/, name: "ONE", url: (n) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trakNoParam=${n}` },
  { key: /EVERGREEN|EVER\b/, prefix: /^(EGLV|EGHU|EISU|EMCU|TCLU)/, name: "Evergreen", url: () => `https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do` },
  { key: /HMM|HYUNDAI/, prefix: /^(HDMU|HMMU)/, name: "HMM", url: () => `https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do` },
];

function carrierSite(number: string, carrier?: string | null) {
  const c = String(carrier || "").toUpperCase();
  const n = String(number || "").toUpperCase().trim();
  return CARRIER_SITES.find((s) => c && s.key.test(c)) || CARRIER_SITES.find((s) => s.prefix?.test(n)) || null;
}

function CarrierSiteLink({ number, carrier }: { number: string; carrier?: string | null }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const site = carrierSite(number, carrier);
  if (!site) return null;
  const href = site.url(encodeURIComponent(number.trim()));
  return (
    <div className="space-y-3 border-t border-slate-200 dark:border-zinc-800 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90">
          Open on {site.name} site <ArrowRight className="w-3.5 h-3.5" />
        </a>
        {site.embed && (
          <button type="button" onClick={() => setShowEmbed((v) => !v)}
            className="rounded-md border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800">
            {showEmbed ? "Hide preview" : "Preview here"}
          </button>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">Live view on the carrier&apos;s own website.</span>
      </div>
      {site.embed && showEmbed && (
        <iframe src={href} title={`${site.name} tracking`} loading="lazy" referrerPolicy="no-referrer"
          className="w-full h-[520px] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white" />
      )}
    </div>
  );
}

function ResultCard({ r }: { r: TrackResult }) {
  const d = r.data;
  if (r.loading) {
    return (
      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
        <CardContent className="p-6 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Looking up <span className="font-mono">{r.container}</span>…
        </CardContent>
      </Card>
    );
  }
  if (!d?.found) {
    return (
      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
        <CardContent className="p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">{r.container}</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.summary}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const events = d.events || [];
  const lastDone = events.reduce((acc, e, i) => (e.done ? i : acc), -1);
  return (
    <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">{r.container}</span>
              <StatusPill status={r.status} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
              {d.pol || "—"} <ArrowRight className="w-5 h-5 text-slate-400" /> {d.pod || "—"}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 rounded-full px-2.5 py-1">
            {d.source === "Live" ? <Radio className="w-3 h-3 text-emerald-500" /> : <Database className="w-3 h-3" />}
            {d.source === "Live" ? "Live carrier data" : d.source === "Demo" ? "Demo data" : "MP Cargo records"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Field label="Vessel / Voyage" value={[d.vessel, d.voyage].filter(Boolean).join(" / ") || "—"} />
          <Field label="Carrier" value={d.carrier || "—"} />
          <Field label={d.ata ? "Arrived (ATA)" : "ETA"} value={fmt(d.ata || d.eta)} />
          <Field label={d.atd ? "Departed (ATD)" : "ETD"} value={fmt(d.atd || d.etd)} />
          {d.source === "Live" && d.live_eta && (
            <Field label="Live ETA" value={d.live_eta} accent={d.eta_changed ? "ETA changed vs. our records" : undefined} />
          )}
          {d.container_size && <Field label="Equipment" value={d.container_size} />}
          {d.co2 && <Field label="CO₂" value={d.co2} />}
          {!!d.jobs?.length && <Field label="Job(s)" value={d.jobs.slice(0, 3).join(", ") + (d.jobs.length > 3 ? ` +${d.jobs.length - 3}` : "")} />}
        </div>

        <CarrierSiteLink number={r.container} carrier={d.carrier} />

        {events.length > 0 && (
          <ol className="flex flex-col md:flex-row md:items-start gap-4 md:gap-0">
            {events.map((e, i) => (
              <li key={i} className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 flex-1 relative">
                <div className="flex items-center w-auto md:w-full">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2",
                    e.done ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600"
                  )}>
                    {e.done && <Check className="w-3.5 h-3.5" />}
                  </span>
                  {i < events.length - 1 && (
                    <span className={cn("hidden md:block h-0.5 flex-1 mx-2", i < lastDone ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-700")} />
                  )}
                </div>
                <div>
                  <div className={cn("text-sm font-medium", e.done ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>{e.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{fmt(e.date)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-zinc-800 pt-4">{r.summary}</p>
        {d.live && <LiveNote live={d.live} />}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{value}</div>
      {accent && <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{accent}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      s.includes("arrived") || s.includes("delivered")
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
        : s.includes("error") || s.includes("not found")
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        : s === "pending"
        ? "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300"
        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    )}>
      {status}
    </span>
  );
}
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

function LiveNote({ live }: { live: LiveInfo }) {
  return (
    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
      <Radio className={cn("w-3 h-3", live.ok ? "text-emerald-500" : "text-slate-400")} />
      <span>Live check {ago(live.checked_at)}{live.source ? ` via ${live.source}` : ""}:</span>
      <span className="text-slate-700 dark:text-slate-300">{live.summary || (live.ok ? "OK" : "No data")}</span>
    </div>
  );
}

function LiveCell({ live }: { live: LiveInfo | null | undefined }) {
  if (!live) return <span className="text-slate-400">—</span>;
  return (
    <div className="space-y-0.5" title={live.summary ?? ""}>
      <div className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
        {live.ok && live.live_eta ? fmt(live.live_eta) : <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{live.ok ? "No ETA" : "Unavailable"}</span>}
        {live.ok && live.eta_changed && (
          <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">ETA changed</span>
        )}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{ago(live.checked_at)}</div>
    </div>
  );
}

interface ListRow {
  number: string; mawb: string | null; mode: string | null; carrier: string | null; pol: string | null; pod: string | null;
  vessel: string | null; voyage: string | null; etd: string | null; atd: string | null; eta: string | null; ata: string | null;
  delivery: string | null; status: string; status_code: string; live: LiveInfo | null; live_supported: boolean;
}
interface ListResponse {
  rows: ListRow[]; total: number; page: number; pageSize: number;
  options: { carriers: string[]; pods: string[]; statuses: string[]; modes: string[] };
}
interface Filters { q: string; mode: string; carrier: string; status: string; pod: string; all: boolean; page: number }

const qs = (f: Filters) => {
  const p = new URLSearchParams();
  p.set("page", String(f.page));
  if (f.all) p.set("all", "1");
  for (const k of ["q", "mode", "carrier", "status", "pod"] as const) if (f[k]) p.set(k, f[k]);
  return p.toString();
};

const STATUS_NAMES: Record<string, string> = { BOOKING: "Booked", RECEPT: "Cargo Received", DEPARTED: "In Transit", ARRIVED: "Arrived", DELIVERED: "Delivered" };

const selectCls = "h-9 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-slate-700 dark:text-slate-200";

export default function TrackTracePage() {
  const [tab, setTab] = useState<"list" | "bulk">("list");

  // ---------------- List state ----------------
  const [filters, setFilters] = useState<Filters>({ q: "", mode: "", carrier: "", status: "", pod: "", all: false, page: 1 });
  const [search, setSearch] = useState("");
  const [list, setList] = useState<ListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [liveBusy, setLiveBusy] = useState<Record<string, boolean>>({});
  const cache = useRef(new Map<string, Promise<ListResponse>>());

  const fetchList = useCallback((key: string) => {
    let p = cache.current.get(key);
    if (!p) {
      p = fetch(`/api/tracking/list?${key}`).then(async (r) => {
        if (r.status === 401) throw new Error("Session expired — please sign in again");
        if (!r.ok) throw new Error("Failed to load containers");
        return r.json();
      });
      p.catch(() => cache.current.delete(key));
      cache.current.set(key, p);
    }
    return p;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = qs(filters);
    setListLoading(true); // previous page stays visible (dimmed) while loading
    fetchList(key)
      .then((d) => {
        if (cancelled) return;
        setList(d);
        setListError(null);
        if (d.page * d.pageSize < d.total) fetchList(qs({ ...filters, page: filters.page + 1 })).catch(() => {}); // prefetch next
      })
      .catch((e) => !cancelled && setListError(e.message))
      .finally(() => !cancelled && setListLoading(false));
    return () => { cancelled = true; };
  }, [filters, fetchList]);

  // Debounced search → filters the list server-side.
  useEffect(() => {
    const h = setTimeout(() => {
      const q = search.trim().toUpperCase();
      setFilters((f) => (f.q === q ? f : { ...f, q, page: 1 }));
    }, 300);
    return () => clearTimeout(h);
  }, [search]);

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const patchRowEverywhere = (number: string, live: LiveInfo) => {
    setList((l) => (l ? { ...l, rows: l.rows.map((r) => (r.number === number ? { ...r, live } : r)) } : l));
    // Keep cached pages coherent with the new snapshot.
    for (const [k, p] of cache.current) {
      cache.current.set(k, p.then((d) => ({ ...d, rows: d.rows.map((r) => (r.number === number ? { ...r, live } : r)) })));
    }
  };

  // ---------------- Detail dialog ----------------
  const [detail, setDetail] = useState<TrackResult | null>(null);

  const openDetail = async (number: string, live = false) => {
    setDetail({ container: number, carrier: "", status: "Processing...", liveEta: "-", summary: "", co2: "-", loading: true });
    try {
      const { data, httpStatus } = await lookup(number, "", live);
      setDetail((d) => (d && d.container === number ? toRow(d, data, httpStatus) : d));
      if (data.live) patchRowEverywhere(number, data.live);
    } catch {
      setDetail((d) => (d && d.container === number ? { ...d, loading: false, status: "Error", summary: "Network failed" } : d));
    }
  };

  const checkLive = async (number: string) => {
    setLiveBusy((b) => ({ ...b, [number]: true }));
    try {
      const { data } = await lookup(number, "", true);
      if (data.live) patchRowEverywhere(number, data.live);
      setDetail((d) => (d && d.container === number && !d.loading ? toRow(d, data, 200) : d));
    } finally {
      setLiveBusy((b) => ({ ...b, [number]: false }));
    }
  };

  const onSearchEnter = () => {
    const q = search.trim().toUpperCase();
    // Exact number not in the (12-month) list → open a direct lookup.
    if (q.length >= 6 && list && !list.rows.some((r) => r.number === q || r.mawb === q)) openDetail(q);
  };

  // ---------------- Bulk state ----------------
  const [results, setResults] = useState<TrackResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const mapRowsToShipments = (data: any[]): TrackResult[] =>
    data.map((row: any, index: number) => {
      const norm = normalizeKeys(row);
      return {
        id: index, container: String(norm.trackingNumber || "").trim().toUpperCase(),
        carrier: String(norm.carrier || "").toUpperCase(), status: "Pending", liveEta: "-",
        summary: "Ready to track", co2: "-", loading: false, selected: true,
      };
    }).filter((s) => s.container && s.container.length > 5);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsProcessing(true);
    try {
      setResults(mapRowsToShipments(await parseExcel(e.target.files[0])));
    } catch (err) {
      console.error("Parse error", err);
      alert("Failed to parse Excel file");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const startBulkTracking = async () => {
    setIsProcessing(true);
    const items = results;
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const i = next++;
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, loading: true, status: "Checking..." } : r)));
        try {
          const { data, httpStatus } = await lookup(items[i].container, items[i].carrier, false);
          setResults((prev) => prev.map((r, idx) => (idx === i ? toRow(r, data, httpStatus) : r)));
        } catch {
          setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, loading: false, status: "Error", summary: "Network failed" } : r)));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, items.length) }, worker));
    setIsProcessing(false);
  };

  const handleExportResults = () => {
    exportData(results.map((s) => ({
      Container: s.container, Carrier: s.carrier, Status: s.status,
      Vessel: s.data?.vessel || "", Voyage: s.data?.voyage || "", POL: s.data?.pol || "", POD: s.data?.pod || "",
      ETD: s.data?.etd || "", ATD: s.data?.atd || "", ETA: s.data?.eta || "", ATA: s.data?.ata || "",
      Delivery: s.data?.delivery || "", Summary: s.summary, CO2: s.co2,
    })));
  };

  // ---------------- UI ----------------
  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const th = "px-4 py-3 whitespace-nowrap";

  const listView = (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search container / MAWB / job / vessel"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
            className="pl-9 font-mono"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex rounded-md border border-slate-200 dark:border-zinc-700 p-0.5 text-sm">
            {[{ v: false, l: "Active" }, { v: true, l: "All" }].map((o) => (
              <button key={o.l} onClick={() => setFilter({ all: o.v })}
                className={cn("px-3 py-1 rounded", filters.all === o.v ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300")}>
                {o.l}
              </button>
            ))}
          </div>
          <select aria-label="Mode" className={selectCls} value={filters.mode} onChange={(e) => setFilter({ mode: e.target.value })}>
            <option value="">All modes</option>
            {list?.options.modes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select aria-label="Carrier" className={selectCls} value={filters.carrier} onChange={(e) => setFilter({ carrier: e.target.value })}>
            <option value="">All carriers</option>
            {list?.options.carriers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select aria-label="Status" className={selectCls} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All statuses</option>
            {list?.options.statuses.map((m) => <option key={m} value={m}>{STATUS_NAMES[m] ?? m}</option>)}
          </select>
          <select aria-label="POD" className={selectCls} value={filters.pod} onChange={(e) => setFilter({ pod: e.target.value })}>
            <option value="">All PODs</option>
            {list?.options.pods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-none">
        <div className={cn("overflow-x-auto transition-opacity", listLoading && list && "opacity-60")}>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className={th}>Container / MAWB</th>
                <th className={th}>Route</th>
                <th className={th}>Vessel / Voyage</th>
                <th className={th}>Carrier</th>
                <th className={th}>ETD / ATD</th>
                <th className={th}>ETA / ATA</th>
                <th className={th}>Status</th>
                <th className={th}>Live ETA</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {!list && listLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-5 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" /></td></tr>
              ))}
              {list?.rows.map((r) => (
                <tr key={r.number} onClick={() => openDetail(r.number)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{r.number}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{r.mode}{r.mawb && r.mawb !== r.number ? ` · MAWB ${r.mawb}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{r.pol || "—"} → {r.pod || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{[r.vessel, r.voyage].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.carrier || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300">
                    {fmt(r.atd || r.etd)}<span className="ml-1 text-[10px] text-slate-400">{r.atd ? "A" : r.etd ? "E" : ""}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {fmt(r.ata || r.eta)}<span className="ml-1 text-[10px] font-normal text-slate-400">{r.ata ? "A" : r.eta ? "E" : ""}</span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3"><LiveCell live={r.live} /></td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" disabled={!r.live_supported || !!liveBusy[r.number]}
                      title={r.live_supported ? "Check live status with the carrier" : "Live tracking not available for this carrier yet"}
                      onClick={() => checkLive(r.number)} className="border-slate-200 dark:border-zinc-700 whitespace-nowrap">
                      <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", liveBusy[r.number] && "animate-spin")} />
                      Check live
                    </Button>
                  </td>
                </tr>
              ))}
              {list && list.rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center">
                  <Ship className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">No containers match</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {filters.all ? "Try clearing filters." : "No active shipments — switch to All to include delivered ones."}
                    {filters.q.length >= 6 && " Press Enter to look the number up directly."}
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {listError && <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-zinc-800">{listError}</div>}
        {list && list.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-zinc-800 text-sm text-slate-500 dark:text-slate-400">
            <span>
              {(list.page - 1) * list.pageSize + 1}–{Math.min(list.page * list.pageSize, list.total)} of {list.total}
              {listLoading && <Loader2 className="inline w-3.5 h-3.5 animate-spin ml-2" />}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={filters.page <= 1} onClick={() => setFilter({ page: filters.page - 1 })}
                className="border-slate-200 dark:border-zinc-700"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="tabular-nums">{filters.page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={filters.page >= totalPages}
                onMouseEnter={() => fetchList(qs({ ...filters, page: filters.page + 1 })).catch(() => {})}
                onClick={() => setFilter({ page: filters.page + 1 })}
                className="border-slate-200 dark:border-zinc-700"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Shows shipments from the last 12 months. Live ETAs refresh automatically every 6 hours where the carrier supports it.
      </p>
    </div>
  );

  const bulkView = (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
        <input type="file" className="hidden" id="bulk-upload" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
        <label htmlFor="bulk-upload" className="cursor-pointer block">
          <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload Excel / CSV</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">One container / MAWB number per row</p>
        </label>
      </div>
      {results.length > 0 && (
        <>
          <div className="flex gap-3 justify-center">
            <Button onClick={startBulkTracking} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isProcessing ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing {results.filter((r) => r.status !== "Pending" && !r.loading).length}/{results.length}</>)
                : (<><Play className="w-4 h-4 mr-2" />Look up {results.length}</>)}
            </Button>
            <Button onClick={handleExportResults} variant="outline" className="border-slate-200 dark:border-zinc-800">
              <Download className="w-4 h-4 mr-2" />Export Results
            </Button>
          </div>
          <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className={th}>Container</th><th className={th}>Status</th><th className={th}>Route</th>
                    <th className={th}>Vessel / Voyage</th><th className={th}>Carrier</th><th className={th}>ETA / ATA</th><th className={th}>Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {results.map((res, idx) => (
                    <tr key={idx} onClick={() => res.data?.found && openDetail(res.container)}
                      className={cn("transition-colors", res.data?.found && "cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50")}>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">{res.container}</td>
                      <td className="px-4 py-3">
                        {res.loading ? <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>
                          : <StatusPill status={res.status} />}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{res.data?.found ? `${res.data.pol || "—"} → ${res.data.pod || "—"}` : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{[res.data?.vessel, res.data?.voyage].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{res.carrier || "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">{res.data?.found ? fmt(res.data.ata || res.data.eta) : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={res.summary}>{res.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  const trackingInterface = (
    <div className="space-y-6">
      <div className="text-center space-y-3 py-4">
        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Track &amp; Trace</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Your containers and MAWBs from MP Cargo shipment records, with live carrier ETAs where available
        </p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-zinc-800">
        {([["list", "My Shipments"], ["bulk", "Bulk Upload"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("text-sm font-medium pb-3 -mb-px transition-colors",
              tab === k ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "list" ? listView : bulkView}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-3xl p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Shipment {detail?.container}</DialogTitle>
          {detail && (
            <div className="space-y-2">
              <div className="flex justify-end gap-2">
                {detail.data?.found && detail.data.live_supported && (
                  <Button size="sm" variant="outline" disabled={!!liveBusy[detail.container]} onClick={() => checkLive(detail.container)}
                    className="border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", liveBusy[detail.container] && "animate-spin")} />Check live
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" onClick={() => setDetail(null)} aria-label="Close"><X className="w-4 h-4" /></Button>
              </div>
              <ResultCard r={detail} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <PremiumPageShell
      title="Track & Trace"
      description="Container and MAWB tracking from your MP Cargo shipment records."
      filters={null}
      sections={[{ title: "", content: trackingInterface }]}
      active="tracking"
      columns={1}
    />
  );
}
