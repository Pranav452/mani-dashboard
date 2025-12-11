'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ShipmentDrawer } from "@/components/ShipmentDrawer"
import Link from "next/link"
import dynamic from "next/dynamic"
import Image from "next/image"

const Map = dynamic(() => import("@/components/ui/map").then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-lg"><span className="text-slate-400 text-sm">Loading map...</span></div>
})
import { format, isWithinInterval, parse, isValid, startOfDay, endOfDay, subDays, startOfYear, differenceInDays } from "date-fns"
import { Calendar as CalendarIcon, FilterX, Ship, Box, Anchor, Layers, Container, MapPin, Search, Download, Clock, MessageSquare, Briefcase, LayoutDashboard, FileText, Users, BarChart3, PieChart as PieChartIcon, Settings, MoreVertical, Check, ArrowUpRight, ArrowDownRight, Printer } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line } from "recharts"
import { cn } from "@/lib/utils"

// --- HELPER: Number Cleaner ---
const cleanNum = (val: any) => {
  if (typeof val === 'number') return val
  if (!val) return 0
  const str = String(val).replace(/,/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

// --- HELPER: Smart Date Parser ---
const getValidDate = (row: any) => {
  const candidates = [row.ETD, row.ATD, row.DOCRECD, row.DOCDT]
  for (const dateStr of candidates) {
    if (!dateStr) continue;
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parsed = parse(dateStr, 'dd-MM-yyyy', new Date())
      if (isValid(parsed)) return parsed
    }
    if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !dateStr.includes('-'))) {
      const str = String(dateStr)
      if (str.length === 8) {
        const parsed = parse(str, 'yyyyMMdd', new Date())
        if (isValid(parsed)) return parsed
      }
    }
  }
  return null
}

// --- HELPER: Detect Real Mode (Fixes SEA-AIR issue) ---
const getComputedMode = (row: any) => {
  // SQL PROOF: ISDIFFAIR = '2' means SEA-AIR
  const isDiffAir = String(row.ISDIFFAIR);
  
  if (isDiffAir === '2' || isDiffAir === 'YES' || isDiffAir === '1') {
    return 'SEA-AIR';
  }
  return row.MODE || 'Unknown';
}

// --- HELPER: Smart Carrier Logic (The Fix) ---
const getCarrier = (row: any) => {
  if (row.LINER_NAME && row.LINER_NAME !== "0") return row.LINER_NAME;
  if (row.CONNAME && row.CONNAME !== "0") return row.CONNAME;
  return "Unknown";
}

// --- HELPER: Office mapping by Port of Loading ---
const getOffice = (pol: string) => {
  if (!pol) return 'Unknown'
  const p = pol.toUpperCase()
  if (['DEL', 'NH1', 'ICD'].includes(p)) return 'Delhi'
  if (['BOM', 'NH2', 'JNPT', 'MUM'].includes(p)) return 'Mumbai'
  if (['MAA', 'CHN'].includes(p)) return 'Chennai'
  if (['BLR'].includes(p)) return 'Bangalore'
  if (['CCU', 'KH1'].includes(p)) return 'Kolkata'
  return 'Other'
}

// --- HELPER: Port Code to Coordinates (Common ports lookup) ---
const PORT_COORDS: Record<string, [number, number]> = {
  'SIN': [1.2897, 103.8501], // Singapore
  'HKG': [22.3193, 114.1694], // Hong Kong
  'SHG': [31.2304, 121.4737], // Shanghai
  'SHA': [31.2304, 121.4737], // Shanghai (alt)
  'CNSHA': [31.2304, 121.4737], // Shanghai (full)
  'NGB': [29.8683, 121.5440], // Ningbo
  'CNNGB': [29.8683, 121.5440], // Ningbo (full)
  'QIN': [36.0671, 120.3826], // Qingdao
  'CNQIN': [36.0671, 120.3826], // Qingdao (full)
  'TYO': [35.6762, 139.6503], // Tokyo
  'JPTYO': [35.6762, 139.6503], // Tokyo (full)
  'OSA': [34.6937, 135.5023], // Osaka
  'JPOSA': [34.6937, 135.5023], // Osaka (full)
  'LAX': [33.9416, -118.4085], // Los Angeles
  'USLAX': [33.9416, -118.4085], // Los Angeles (full)
  'NYC': [40.7128, -74.0060], // New York
  'USNYC': [40.7128, -74.0060], // New York (full)
  'LON': [51.5074, -0.1278], // London
  'GBLON': [51.5074, -0.1278], // London (full)
  'ROT': [51.9225, 4.4772], // Rotterdam
  'NLROT': [51.9225, 4.4772], // Rotterdam (full)
  'HAM': [53.5511, 9.9937], // Hamburg
  'DEHAM': [53.5511, 9.9937], // Hamburg (full)
  'DXB': [25.2048, 55.2708], // Dubai
  'AEDXB': [25.2048, 55.2708], // Dubai (full)
  'JED': [21.4858, 39.1925], // Jeddah
  'SAJED': [21.4858, 39.1925], // Jeddah (full)
  'BOM': [19.0760, 72.8777], // Mumbai
  'INBOM': [19.0760, 72.8777], // Mumbai (full)
  'CHN': [22.3193, 114.1694], // Chennai
  'INCHN': [22.3193, 114.1694], // Chennai (full)
  'MEL': [-37.8136, 144.9631], // Melbourne
  'AUMEL': [-37.8136, 144.9631], // Melbourne (full)
  'SYD': [-33.8688, 151.2093], // Sydney
  'AUSYD': [-33.8688, 151.2093], // Sydney (full)
  'JKT': [-6.2088, 106.8456], // Jakarta
  'IDJKT': [-6.2088, 106.8456], // Jakarta (full)
  'BKK': [13.7563, 100.5018], // Bangkok
  'THBKK': [13.7563, 100.5018], // Bangkok (full)
  'KUL': [3.1390, 101.6869], // Kuala Lumpur
  'MYKUL': [3.1390, 101.6869], // Kuala Lumpur (full)
  'TPE': [25.0330, 121.5654], // Taipei
  'TWTPE': [25.0330, 121.5654], // Taipei (full)
  'ICN': [37.5665, 126.9780], // Incheon
  'KRICN': [37.5665, 126.9780], // Incheon (full)
  'PNH': [11.5564, 104.9282], // Phnom Penh
  'KHPNH': [11.5564, 104.9282], // Phnom Penh (full)
  'HAN': [21.0285, 105.8542], // Hanoi
  'VNHAN': [21.0285, 105.8542], // Hanoi (full)
  'SGN': [10.8231, 106.6297], // Ho Chi Minh City
  'VNSGN': [10.8231, 106.6297], // Ho Chi Minh City (full)
  'MNL': [14.5995, 120.9842], // Manila
  'PHMNL': [14.5995, 120.9842], // Manila (full)
  'SGP': [1.2897, 103.8501], // Singapore (alt)
  'SGSIN': [1.2897, 103.8501], // Singapore (full)
  'HKHKG': [22.3193, 114.1694], // Hong Kong (full)
  // Actual port codes from data
  'NH1': [28.6139, 77.2090], // Delhi/Noida area (India)
  'TRN': [19.0760, 72.8777], // Possibly Thane/Mumbai area
  'DEL': [28.6139, 77.2090], // Delhi (India)
  '600': [28.6139, 77.2090], // Possibly Delhi area code
  'KH1': [22.5726, 88.3639], // Kolkata (India)
  'CGP': [22.5726, 88.3639], // Chittagong port (Bangladesh) or Kolkata
  'MAA': [13.0827, 80.2707], // Chennai/Madras (India)
  'DAC': [23.8103, 90.4125], // Dhaka (Bangladesh)
  'KHI': [24.8607, 67.0011], // Karachi (Pakistan)
  'BLR': [12.9716, 77.5946], // Bangalore (India)
  'LHE': [31.5497, 74.3436], // Lahore (Pakistan)
  'MUM': [19.0760, 72.8777], // Mumbai (India)
  'MD2': [19.0760, 72.8777], // Mumbai variant
  'COC': [9.9312, 76.2673], // Cochin (India)
  'SZX': [22.5431, 114.0579], // Shenzhen (China)
  'NHA': [19.0176, 73.1107], // Navi Mumbai (India)
  'CQF': [50.6292, 3.0573], // Calais (France)
  'AMD': [23.0225, 72.5714], // Ahmedabad (India)
  'ANR': [51.2194, 4.4025], // Antwerp (Belgium)
  'LIL': [50.6292, 3.0573], // Lille (France)
  'CH2': [51.5074, -0.1278], // Possibly London area
  'PAR': [48.8566, 2.3522], // Paris (France)
  'RTM': [51.9225, 4.4772], // Rotterdam (Netherlands)
  'LI1': [50.6292, 3.0573], // Lille variant
  'CD6': [51.5074, -0.1278], // Possibly London code
  'GOA': [15.2993, 74.1240], // Goa (India)
  'VLC': [39.4699, -0.3774], // Valencia (Spain)
  'WAW': [52.2297, 21.0122], // Warsaw (Poland)
  'GT0': [51.5074, -0.1278], // Possibly UK code
  'MRS': [43.2965, 5.3698], // Marseille (France)
  'FEL': [51.5074, -0.1278], // Possibly UK code
  'GY1': [51.5074, -0.1278], // Possibly UK code
  'PR1': [51.5074, -0.1278], // Possibly UK code
  'DKR': [14.7167, -17.4677], // Dakar (Senegal)
}

const getPortCoords = (portCode: string): [number, number] | null => {
  if (!portCode) return null
  const code = portCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
  if (!code) return null
  
  // Direct match
  if (PORT_COORDS[code]) return PORT_COORDS[code]
  
  // Try first 3 characters (common port code format)
  if (code.length >= 3) {
    const shortCode = code.substring(0, 3)
    if (PORT_COORDS[shortCode]) return PORT_COORDS[shortCode]
  }
  
  // Try last 3 characters (sometimes country prefix)
  if (code.length > 3) {
    const last3 = code.substring(code.length - 3)
    if (PORT_COORDS[last3]) return PORT_COORDS[last3]
  }
  
  // Try removing country prefix (e.g., CNSHA -> SHA)
  if (code.length > 3 && code.match(/^[A-Z]{2}[A-Z0-9]+$/)) {
    const withoutPrefix = code.substring(2)
    if (PORT_COORDS[withoutPrefix]) return PORT_COORDS[withoutPrefix]
  }
  
  // Try common variations
  const variations: Record<string, string> = {
    'SHANGHAI': 'SHG',
    'SINGAPORE': 'SIN',
    'HONGKONG': 'HKG',
    'HONG KONG': 'HKG',
    'NINGBO': 'NGB',
    'QINGDAO': 'QIN',
    'TOKYO': 'TYO',
    'OSAKA': 'OSA',
    'LOSANGELES': 'LAX',
    'LOS ANGELES': 'LAX',
    'NEWYORK': 'NYC',
    'NEW YORK': 'NYC',
    'LONDON': 'LON',
    'ROTTERDAM': 'ROT',
    'HAMBURG': 'HAM',
    'DUBAI': 'DXB',
    'JEDDAH': 'JED',
    'MUMBAI': 'BOM',
    'CHENNAI': 'CHN',
    'MELBOURNE': 'MEL',
    'SYDNEY': 'SYD',
    'JAKARTA': 'JKT',
    'BANGKOK': 'BKK',
    'KUALALUMPUR': 'KUL',
    'KUALA LUMPUR': 'KUL',
    'TAIPEI': 'TPE',
    'INCHEON': 'ICN',
    'PHNOMPENH': 'PNH',
    'PHNOM PENH': 'PNH',
    'HANOI': 'HAN',
    'HOCHIMINH': 'SGN',
    'HO CHI MINH': 'SGN',
    'MANILA': 'MNL',
  }
  const normalized = code.replace(/[^A-Z]/g, '')
  if (variations[normalized]) {
    return PORT_COORDS[variations[normalized]] || null
  }
  return null
}

type ShipmentRecord = {
  [key: string]: any;
  _date?: Date | null;
  _mode?: string;
  _carrier?: string;
  _office?: string;
}

export default function Dashboard({ data }: { data: ShipmentRecord[] }) {
  const [selectedMode, setSelectedMode] = useState<string>("ALL")
  const [selectedClient, setSelectedClient] = useState<string>("ALL")
  const [selectedOffice, setSelectedOffice] = useState<string>("ALL")
  const [trendMetric, setTrendMetric] = useState<"weight" | "teu" | "cbm" | "shipments">("weight")
  const [compareEnabled, setCompareEnabled] = useState<boolean>(true)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [selectedTab, setSelectedTab] = useState<"ALL" | "SEA" | "AIR" | "SEA-AIR">("ALL")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredChart, setHoveredChart] = useState<string | null>(null)
  const [selectedModeFilter, setSelectedModeFilter] = useState<string | null>(null)
  const [drilldowns, setDrilldowns] = useState<Record<string, boolean>>({})
  const toggleDrilldown = (key: string) => {
    setDrilldowns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const applyPreset = (preset: "30d" | "90d" | "ytd") => {
    if (!maxDate) return
    const to = endOfDay(maxDate)
    if (preset === "ytd") {
      setDateRange({ from: startOfYear(maxDate), to })
      return
    }
    const days = preset === "30d" ? 30 : 90
    setDateRange({ from: startOfDay(subDays(maxDate, days - 1)), to })
  }


  // --- 1. PARSE DATA & COMPUTE MODE ---
  const parsedData = useMemo<ShipmentRecord[]>(() => {
    return data.map(row => ({
      ...row,
      _date: getValidDate(row),
      _mode: getComputedMode(row), // We use this new _mode for everything
      _carrier: getCarrier(row), // NEW: Uses smart fallback
      _office: getOffice(row.POL)
    }))
  }, [data])

  // --- 2. WATERFALL LOGIC ---
  const { minDate, maxDate } = useMemo(() => {
    let min = new Date(8640000000000000);
    let max = new Date(-8640000000000000);
    let hasData = false;

    parsedData.forEach(row => {
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return
      if (selectedOffice !== "ALL" && row._office !== selectedOffice) return
      if (selectedClient !== "ALL" && row.CONNAME !== selectedClient) return
      if (row._date) {
        if (row._date < min) min = row._date
        if (row._date > max) max = row._date
        hasData = true
      }
    })
    
    if (!hasData) return { minDate: new Date(), maxDate: new Date() }
    return { minDate: min, maxDate: max }
  }, [parsedData, selectedMode, selectedOffice, selectedClient])

  const { allProviders, availableProviders, offices } = useMemo(() => {
    const all = new Set<string>()
    const available = new Set<string>()
    const officesSet = new Set<string>()

    parsedData.forEach(row => {
      const provider = row.CONNAME || "Unknown"
      const office = row._office || "Unknown"
      all.add(provider)
      officesSet.add(office)
      
      // Filter by Computed Mode
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return
      if (selectedOffice !== "ALL" && row._office !== selectedOffice) return
      
      // Filter by Date
      if (dateRange.from && dateRange.to && row._date) {
         if (!isWithinInterval(row._date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return
      }
      
      available.add(provider)
    })
    return { 
      allProviders: Array.from(all).sort(), 
      availableProviders: available,
      offices: Array.from(officesSet).sort()
    }
  }, [parsedData, selectedMode, dateRange, selectedOffice])

  // --- 3. FILTER DATA (with search) ---
  const chartData = useMemo<ShipmentRecord[]>(() => {
    return parsedData.filter(row => {
      // Filter by Computed Mode
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return false

      // Filter by Office
      if (selectedOffice !== "ALL" && row._office !== selectedOffice) return false
      
      if (dateRange.from && dateRange.to) {
        if (!row._date) return false 
        if (!isWithinInterval(row._date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false
      }
      
      if (selectedClient !== "ALL" && row.CONNAME !== selectedClient) return false
      
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = 
          (row.JOBNO?.toString().toLowerCase().includes(q)) ||
          (row.LINER_NAME?.toString().toLowerCase().includes(q)) ||
          (row.CONNAME?.toString().toLowerCase().includes(q)) ||
          (row.POL?.toString().toLowerCase().includes(q)) ||
          (row.POD?.toString().toLowerCase().includes(q)) ||
          (row.ORDERNO?.toString().toLowerCase().includes(q)) ||
          (row.CONTMAWB?.toString().toLowerCase().includes(q)) ||
          (row.CONNO?.toString().toLowerCase().includes(q)) ||
          (row.BLNO?.toString().toLowerCase().includes(q)) ||
          (row.BOOKNO?.toString().toLowerCase().includes(q))
        if (!match) return false
      }
      
      return true
    })
  }, [parsedData, selectedMode, selectedClient, selectedOffice, dateRange, searchQuery])

  // --- 4. EXPORT FUNCTION ---
  const handleExport = () => {
    if (!chartData.length) return
    
    const headers = ["JOBNO", "MODE", "PROVIDER", "CARRIER", "POL", "POD", "ETD", "ATD", "WEIGHT_KG", "TEU", "CBM", "BOOKNO", "CONNO", "BLNO"]
    
    const csvContent = [
      headers.join(","),
      ...chartData.map(row => [
        row.JOBNO || "",
        row._mode || "",
        `"${(row.CONNAME || "").replace(/"/g, '""')}"`,
        `"${(row.LINER_NAME || "").replace(/"/g, '""')}"`,
        row.POL || "",
        row.POD || "",
        row.ETD || "",
        row.ATD || "",
        cleanNum(row.CONT_GRWT),
        cleanNum(row.CONT_TEU),
        cleanNum(row.CONT_CBM),
        row.BOOKNO || "",
        row.CONNO || "",
        row.BLNO || ""
      ].join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `logistics_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    link.click()
  }

  // --- 5. STATS ---
  const kpis = useMemo((): { shipments: number; weight: number; teu: number; cbm: number; avgTransit: number } => {
    // Helper to parse DD-MM-YYYY dates specifically for Transit Calc
    const parseTransitDate = (dateStr: any) => {
      if (!dateStr || typeof dateStr !== 'string') return null
      try {
        // Handle DD-MM-YYYY
        if (dateStr.includes('-')) return parse(dateStr, 'dd-MM-yyyy', new Date())
        return null
      } catch { return null }
    }

    const uniqueJobs = new globalThis.Map<string, ShipmentRecord>()
    chartData.forEach((r, idx) => {
      const key = r.JOBNO ? String(r.JOBNO) : `__${idx}`
      if (!uniqueJobs.has(key)) uniqueJobs.set(key, r)
    })
    const uniqueRows = Array.from(uniqueJobs.values()) as ShipmentRecord[]

    let totalTransitDays = 0
    let transitCount = 0

    uniqueRows.forEach((r: ShipmentRecord) => {
      // Logic: Prefer Actual (ATD/ATA), fallback to Estimated (ETD/ETA)
      const start = parseTransitDate(r.ATD || r.ETD)
      const end = parseTransitDate(r.ATA || r.ETA) // Ensure you have ETA/ATA in your DB/Select query!

      if (start && isValid(start) && end && isValid(end)) {
        const days = differenceInDays(end, start)
        // Sanity Check: Ignore negative days or impossible values (> 120 days)
        if (days >= 0 && days < 150) {
          totalTransitDays += days
          transitCount++
        }
      }
    })

    return {
      shipments: uniqueRows.length,
      weight: uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_GRWT), 0),
      teu: uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_TEU), 0),
      cbm: uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_CBM), 0),
      avgTransit: transitCount > 0 ? (totalTransitDays / transitCount) : 0
    }
  }, [chartData])

  const metricConfig = {
    weight: { label: "Weight (Tons)", accessor: (row: any) => cleanNum(row.CONT_GRWT) / 1000 },
    teu: { label: "TEU", accessor: (row: any) => cleanNum(row.CONT_TEU) },
    cbm: { label: "CBM", accessor: (row: any) => cleanNum(row.CONT_CBM) },
    shipments: { label: "Shipments", accessor: () => 1 }
  } as const

  const monthlyTrend = useMemo(() => {
    const stats: Record<string, number> = {}
    const seenJobs = new Set<string>()
    chartData.forEach((row, idx) => {
      const jobKey = row.JOBNO ? String(row.JOBNO) : `__${idx}`
      if (seenJobs.has(jobKey)) return
      seenJobs.add(jobKey)
      if (!row._date) return
      const monthKey = format(row._date, 'yyyy-MM')
      stats[monthKey] = (stats[monthKey] || 0) + metricConfig[trendMetric].accessor(row)
    })
    return Object.entries(stats)
      .map(([date, val]) => ({ date, val: Math.round(val * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [chartData, trendMetric])

  const monthlyTrendWithPrev = useMemo(() => {
    return monthlyTrend.map((entry, idx) => ({
      ...entry,
      prev: idx > 0 ? monthlyTrend[idx - 1].val : null
    }))
  }, [monthlyTrend])

  const modeStats = useMemo(() => {
    const stats: Record<string, number> = {}
    const seenJobs = new Set<string>()
    chartData.forEach((row, idx) => {
      const jobKey = row.JOBNO ? String(row.JOBNO) : `__${idx}`
      if (seenJobs.has(jobKey)) return
      seenJobs.add(jobKey)
      const m = row._mode || "Unknown" // Use computed mode
      stats[m] = (stats[m] || 0) + 1
    })
    return Object.entries(stats).map(([name, value]) => ({ name, value }))
  }, [chartData])
  const totalModes = useMemo(() => modeStats.reduce((sum, m) => sum + m.value, 0), [modeStats])

  const clientMix = useMemo(() => {
    const map: Record<string, { SEA: number, AIR: number, 'SEA-AIR': number }> = {}
    const seenJobs = new Set<string>()

    chartData.forEach((r, idx) => {
      const jobKey = r.JOBNO ? String(r.JOBNO) : `__${idx}`
      if (seenJobs.has(jobKey)) return
      seenJobs.add(jobKey)

      const client = r.CONNAME || "Unknown"
      if (!map[client]) map[client] = { SEA: 0, AIR: 0, 'SEA-AIR': 0 }
      if (r._mode === 'SEA' || r._mode === 'AIR' || r._mode === 'SEA-AIR') {
        map[client][r._mode] += 1
      }
    })

    return Object.entries(map)
      .map(([name, counts]) => ({ name, ...counts, total: counts.SEA + counts.AIR + counts['SEA-AIR'] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [chartData])

  const carrierStats = useMemo(() => {
    const stats: Record<string, number> = {}
    chartData.forEach(row => {
      const c = row._carrier || "Unknown" // Now uses the smart value
      stats[c] = (stats[c] || 0) + 1
    })
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [chartData])
  
  const originStats = useMemo(() => {
    const stats: Record<string, number> = {}
    chartData.forEach(row => {
      const origin = row.POL || "Unknown"
      stats[origin] = (stats[origin] || 0) + cleanNum(row.CONT_GRWT)
    })
    return Object.entries(stats)
      .map(([name, val]) => ({ name, val: Math.round(val / 1000) }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 8)
  }, [chartData])

  const destinationStats = useMemo(() => {
    const stats: Record<string, number> = {}
    chartData.forEach(row => {
      const dest = row.POD || "Unknown"
      stats[dest] = (stats[dest] || 0) + 1
    })
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [chartData])

  const clientStats = useMemo(() => {
    const stats: Record<string, { shipments: number; tons: number }> = {}
    chartData.forEach(row => {
      const client = row.CONNAME || "Unknown"
      if (!stats[client]) stats[client] = { shipments: 0, tons: 0 }
      stats[client].shipments += 1
      stats[client].tons += cleanNum(row.CONT_GRWT) / 1000
    })
    return Object.entries(stats)
      .map(([name, info]) => ({ name, shipments: info.shipments, tons: Math.round(info.tons * 10) / 10 }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 6)
  }, [chartData])

  const modeMonthly = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {}
    chartData.forEach(row => {
      if (!row._date) return
      const month = format(row._date, 'yyyy-MM')
      const mode = row._mode || "Unknown"
      if (!stats[month]) stats[month] = {}
      stats[month][mode] = (stats[month][mode] || 0) + 1
    })

    const months = Object.keys(stats).sort((a, b) => a.localeCompare(b))
    const modes = Array.from(new Set(modeStats.map(m => m.name)))

    return months.map(month => {
      const entry: Record<string, any> = { month }
      modes.forEach(mode => {
        entry[mode] = stats[month]?.[mode] || 0
      })
      return entry
    })
  }, [chartData, modeStats])

  const laneStats = useMemo(() => {
    const stats: Record<string, { weight: number; shipments: number }> = {}
    chartData.forEach(row => {
      const origin = row.POL || "Unknown"
      const dest = row.POD || "Unknown"
      const key = `${origin} → ${dest}`
      if (!stats[key]) stats[key] = { weight: 0, shipments: 0 }
      stats[key].weight += cleanNum(row.CONT_GRWT) / 1000
      stats[key].shipments += 1
    })
    return Object.entries(stats)
      .map(([name, info]) => ({ name, weight: Math.round(info.weight * 10) / 10, shipments: info.shipments }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
  }, [chartData])

  const recentShipments = useMemo(() => {
    // 1. Sort by Date (Newest first), handle missing dates safely
    const sorted = [...chartData].sort((a, b) => {
      const dateA = a._date ? a._date.getTime() : 0
      const dateB = b._date ? b._date.getTime() : 0
      return dateB - dateA
    })

    // 2. SMART LIMIT:
    // If user is searching, SHOW EVERYTHING (No limit).
    // If user is just browsing, show only Top 12.
    if (searchQuery) {
      return sorted
    }
    
    return sorted.slice(0, 12)
  }, [chartData, searchQuery])

  const mapMarkers = useMemo(() => {
    const markers: Array<{ lat: number; lng: number; label: string; popup: string }> = []
    const seenPorts = new Set<string>()
    
    // Use originStats and destinationStats which have actual port codes
    originStats.forEach(stat => {
      const port = stat.name
      if (port === "Unknown" || !port) return
      const coords = getPortCoords(port)
      if (coords && !seenPorts.has(port)) {
        markers.push({
          lat: coords[0],
          lng: coords[1],
          label: port,
          popup: `Origin: ${stat.val} tons`
        })
        seenPorts.add(port)
      }
    })
    
    destinationStats.forEach(stat => {
      const port = stat.name
      if (port === "Unknown" || !port) return
      const coords = getPortCoords(port)
      if (coords && !seenPorts.has(port)) {
        markers.push({
          lat: coords[0],
          lng: coords[1],
          label: port,
          popup: `Destination: ${stat.value} shipments`
        })
        seenPorts.add(port)
      }
    })
    
    // Fallback: if no markers found, try to get ports directly from chartData
    if (markers.length === 0) {
      const portCounts: Record<string, { pol: number; pod: number }> = {}
      chartData.forEach(row => {
        const pol = row.POL?.toString().trim().toUpperCase()
        const pod = row.POD?.toString().trim().toUpperCase()
        if (pol && pol !== "UNKNOWN") {
          if (!portCounts[pol]) portCounts[pol] = { pol: 0, pod: 0 }
          portCounts[pol].pol++
        }
        if (pod && pod !== "UNKNOWN") {
          if (!portCounts[pod]) portCounts[pod] = { pol: 0, pod: 0 }
          portCounts[pod].pod++
        }
      })
      
      Object.entries(portCounts)
        .sort((a, b) => (b[1].pol + b[1].pod) - (a[1].pol + a[1].pod))
        .slice(0, 20)
        .forEach(([port, counts]) => {
          const coords = getPortCoords(port)
          if (coords && !seenPorts.has(port)) {
            markers.push({
              lat: coords[0],
              lng: coords[1],
              label: port,
              popup: `POL: ${counts.pol}, POD: ${counts.pod}`
            })
            seenPorts.add(port)
          }
        })
    }
    
    return markers
  }, [originStats, destinationStats, chartData])

  const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea']

  const handleRowClick = (record: any) => {
    setSelectedRecord(record)
    setDrawerOpen(true)
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [drawerOpen])

  // --- UI HELPERS ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
  }

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(val)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* 1. TOP NAVBAR */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 relative">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-semibold text-slate-900 leading-tight">Management Dashboard</h1>
              <span className="text-[11px] text-slate-500 font-normal">by Manilal Patel</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" className="font-medium text-slate-900 bg-slate-100" asChild>
              <Link href="/">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" className="font-medium text-slate-500 hover:text-slate-900" asChild>
              <Link href="/financials">Financials</Link>
            </Button>
            <Button variant="ghost" size="sm" className="font-medium text-slate-500 hover:text-slate-900" asChild>
              <Link href="/customers">Customers</Link>
            </Button>
            <Button variant="ghost" size="sm" className="font-medium text-slate-500 hover:text-slate-900" asChild>
              <Link href="/fleet">Fleet</Link>
            </Button>
            <Button variant="ghost" size="sm" className="font-medium text-slate-500 hover:text-slate-900" asChild>
              <Link href="/reports">Reports</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* 2. FILTERS BAR */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Filter */}
            <Select value={selectedMode} onValueChange={(val) => {
              setSelectedMode(val); setDateRange({ from: undefined, to: undefined }); setSelectedClient("ALL");
            }}>
              <SelectTrigger className="h-9 text-sm w-[130px] border-slate-200 bg-white hover:bg-slate-50">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Modes</SelectItem>
                <SelectItem value="SEA">Sea</SelectItem>
                <SelectItem value="AIR">Air</SelectItem>
                <SelectItem value="SEA-AIR">Sea-Air</SelectItem>
              </SelectContent>
            </Select>

            {/* Office Filter */}
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger className="h-9 text-sm w-[130px] border-slate-200 bg-white hover:bg-slate-50">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Offices</SelectItem>
                {offices.map(office => (
                  <SelectItem key={office} value={office}>{office}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 text-sm w-[240px] justify-start text-left font-normal border-slate-200 bg-white hover:bg-slate-50",
                    !dateRange.from && "text-slate-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Provider Filter */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="h-9 text-sm w-[180px] border-slate-200 bg-white hover:bg-slate-50">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Providers</SelectItem>
                {allProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search shipments..." 
                className="pl-9 h-9 border-slate-200 bg-white hover:bg-slate-50 focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Reset Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700" 
                onClick={() => {
                  setSelectedMode("ALL")
                  setSelectedOffice("ALL")
                  setSelectedClient("ALL")
                  setSearchQuery("")
                  setDateRange({ from: undefined, to: undefined })
                }}
              >
                <FilterX className="w-4 h-4 mr-2 text-red-600" /> Reset
              </Button>

              {/* Export Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-slate-200 bg-white hover:bg-slate-50" 
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-5">
        
        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5 items-stretch">
          
          {/* LEFT COLUMN (MAIN CONTENT) */}
          <div className="flex flex-col space-y-6 min-h-0">
            
            {/* SECTION 1: DELIVERIES (METRICS) */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* METRIC 1: TOTAL WEIGHT */}
                 <Card className="shadow-sm border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                   <CardContent className="p-6">
                     <div className="flex items-center justify-between mb-3">
                       <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Weight</div>
                       <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                         <Box className="w-5 h-5 text-emerald-600" />
                       </div>
                     </div>
                     <div className="flex items-end justify-between mb-4">
                       <div className="text-3xl font-bold text-slate-900">{(kpis.weight / 1000).toFixed(1)}</div>
                       <div className="text-sm font-normal text-slate-500 mb-1">tons</div>
                     </div>
                     <div className="h-[50px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyTrend.slice(-12)}>
                            <Bar dataKey="val" fill="#10b981" radius={[4, 4, 0, 0]} barSize={6} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </CardContent>
                 </Card>

                 {/* METRIC 2: AVG TRANSIT TIME */}
                 <Card className="shadow-sm border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                   <CardContent className="p-6">
                     <div className="flex items-center justify-between mb-3">
                       <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Transit Time</div>
                       <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                         <Clock className="w-5 h-5 text-blue-600" />
                       </div>
                     </div>
                     <div className="flex items-end justify-between mb-4">
                       <div className="text-3xl font-bold text-slate-900">{kpis.avgTransit.toFixed(1)}</div>
                       <div className="text-sm font-normal text-slate-500 mb-1">days</div>
                     </div>
                     <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Fastest</span>
                          <span className="font-medium text-slate-900">12 days</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Slowest</span>
                          <span className="font-medium text-slate-900">45 days</span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 {/* METRIC 3: TOTAL SHIPMENTS */}
                 <Card className="shadow-sm border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                   <CardContent className="p-6">
                     <div className="flex items-center justify-between mb-3">
                       <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Shipments</div>
                       <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                         <Ship className="w-5 h-5 text-purple-600" />
                       </div>
                     </div>
                     <div className="flex items-end justify-between mb-4">
                       <div className="text-3xl font-bold text-slate-900">{kpis.shipments.toLocaleString()}</div>
                       <div className="text-sm font-normal text-slate-500 mb-1">files</div>
                     </div>
                     <div className="h-[50px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyTrend.slice(-12)}>
                            <defs>
                              <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2} fill="url(#colorShipments)" />
                          </AreaChart>
                        </ResponsiveContainer>
                     </div>
                   </CardContent>
                 </Card>
                </div>
              </CardContent>
            </Card>
            
            {/* SECTION 2: REVENUE AND COSTS (VOLUME TRENDS) */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden flex-1 min-h-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Shipment Volume Analysis</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      {(["weight", "teu", "cbm"] as const).map(key => (
                        <button 
                          key={key} 
                          className={cn("text-xs font-medium px-3 py-1.5 rounded-md transition-all", trendMetric === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                          onClick={() => setTrendMetric(key)}
                        >
                          {metricConfig[key].label}
                        </button>
                      ))}
                   </div>
                   <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleDrilldown('shipment-volume')}>
                     {drilldowns['shipment-volume'] ? 'Hide details' : 'View details'}
                   </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 min-h-0">
                <div className="h-[300px] w-full" onClick={() => toggleDrilldown('shipment-volume')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendWithPrev}>
                      <defs>
                        <linearGradient id="mainChartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="prevChartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        dy={10} 
                        tickFormatter={(val) => {
                          try { return format(new Date(val), 'MMM') } catch { return val }
                        }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff', 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                        itemStyle={{color: '#0f172a', fontWeight: 600}}
                        cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area 
                        name={metricConfig[trendMetric].label}
                        type="monotone" 
                        dataKey="val" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#mainChartGradient)" 
                        activeDot={{r: 6, strokeWidth: 0}}
                      />
                      {compareEnabled && (
                        <Area
                          name="Prev period"
                          type="monotone"
                          dataKey="prev"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          fill="url(#prevChartGradient)"
                          strokeDasharray="6 6"
                          connectNulls
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600 font-medium">Revenue</span>
                  </div>
                   <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-sm text-slate-600 font-medium">Costs</span>
                  </div>


                   <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-900" />
                    <span className="text-sm text-slate-600 font-medium">Net Profit</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-400">Vs previous period</span>
                    <button
                      aria-label="Toggle compare previous period"
                      onClick={() => setCompareEnabled(v => !v)}
                      className={cn(
                        "w-9 h-5 rounded-full relative transition-colors",
                        compareEnabled ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                          compareEnabled ? "right-0.5" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                </div>
                {drilldowns['shipment-volume'] && (
                  <div className="mt-4 border border-slate-100 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-slate-900">Monthly detail</div>
                      <span className="text-xs text-slate-500">Last 6 months</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {monthlyTrend.slice(-6).map(entry => (
                        <div key={entry.date} className="p-3 rounded-lg bg-white border border-slate-200">
                          <div className="text-xs text-slate-500">{format(new Date(entry.date + '-01'), 'MMM yyyy')}</div>
                          <div className="text-lg font-semibold text-slate-900">{formatNumber(entry.val)}</div>
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(entry.val / (monthlyTrend[monthlyTrend.length -1]?.val || 1) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MODE & COSTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900">Balance and costs</CardTitle>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent className="h-[250px] relative">
                  <div className="absolute top-4 left-6">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cash Balance</div>
                    <div className="text-2xl font-bold text-slate-900">$126K</div>
                  </div>
                  <div className="mt-12 h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modeStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {modeStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900">Costs by category</CardTitle>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mb-6">
                    <div className="bg-emerald-500 w-[35%]" />
                    <div className="bg-slate-800 w-[25%]" />
                    <div className="bg-yellow-400 w-[15%]" />
                    <div className="bg-slate-300 w-[25%]" />
                  </div>
                  
                  <div className="space-y-3">
                    {laneStats.slice(0, 5).map((lane, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-slate-800" : idx === 2 ? "bg-yellow-400" : "bg-slate-300")} />
                          <span className="text-slate-600 truncate max-w-[150px]">{lane.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">${(lane.weight * 120).toLocaleString()}</span>
                          <span className="text-slate-400 text-xs w-8 text-right">{Math.round((lane.weight / (kpis.weight/1000)) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
          
          
          {/* RIGHT COLUMN (SIDE PANEL) */}
          <div className="flex flex-col space-y-4 lg:space-y-1.5  min-h-0 lg:w-[340px]">
            
            {/* QUICK SNAPSHOT */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 lg:h-[380px] mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900"> Quick Snapshot</CardTitle>
                <CardDescription className="text-xs text-slate-500">Compact overview for the right column</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[11px] uppercase text-slate-400 font-semibold mb-1">On-Time</div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-semibold text-slate-900">92%</span>
                    <span className="text-xs text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />+4%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[92%] bg-emerald-500" />
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Exceptions</div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-semibold text-slate-900">18</span>
                    <span className="text-xs text-amber-600 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" />-3</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[35%] bg-amber-500" />
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Utilization</div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-semibold text-slate-900">78%</span>
                    <span className="text-xs text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />+2%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[78%] bg-slate-900" />
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Gross Margin</div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-semibold text-slate-900">24%</span>
                    <span className="text-xs text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />+1.4%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[24%] bg-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* INVOICES / SHIPMENTS LIST */}
            <Card className="shadow-none border border-slate-200 rounded-xl ">
              <CardHeader className="pb-0  px-6">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
                   <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleDrilldown('invoices')}>
                       {drilldowns['invoices'] ? 'Hide drilldown' : 'Show drilldown'}
                     </Button>
                     <MoreVertical className="w-4 h-3.5  text-slate-400" />
                   </div>
                </div>
                
                {/* STATUS CARDS */}
                <div className="grid grid-cols-3 gap-2 mb-2.5 ">
                   <div className="space-y-0.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Paid</div>
                      <div className="text-base font-bold text-slate-900">$169K</div>
                   </div>
                   <div className="space-y-1 border-l border-slate-100 pl-3">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Pending</div>
                      <div className="text-base font-bold text-slate-900">$95K</div>
                   </div>
                   <div className="space-y-1 border-l border-slate-100 pl-3">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Unpaid</div>
                      <div className="text-base font-bold text-slate-900">$64K</div>
                   </div>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
                   <div className="h-full w-[65%] bg-emerald-500 rounded-full" />
                </div>

                {/* TABS */}
                <div className="flex items-center gap-1 border-b border-slate-100 mb-4 overflow-x-auto">
                   {(["ALL", "SEA", "AIR", "SEA-AIR"] as const).map(tab => (
                     <button
                       key={tab}
                       onClick={() => setSelectedTab(tab)}
                       className={cn(
                         "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                         selectedTab === tab 
                           ? "border-slate-900 text-slate-900" 
                           : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                       )}
                     >
                       {tab === "ALL" ? "All" : tab}
                     </button>
                   ))}
                </div>

                {/* SEARCH */}
                <div className="relative ">
                   <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                   <Input 
                      placeholder="Search invoice..." 
                      className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
              </CardHeader>
              
              <CardContent className="p-0 flex-1 overflow-auto min-h-0 max-h-[600px]">
                <div className="divide-y divide-slate-50">
                   {recentShipments
                     .filter(s => selectedTab === "ALL" || s._mode === selectedTab)
                     .map((row, idx) => (
                     <div 
                       key={idx} 
                       className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group"
                      onClick={() => {
                        toggleDrilldown('invoices')
                        handleRowClick(row)
                      }}
                     >
                        <div className="flex items-center gap-3">
                           {/* Checkbox placeholder */}
                           <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center text-white group-hover:border-slate-400">
                              <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                           </div>
                           
                           {/* Icon based on Mode */}
                           <div className={cn(
                             "w-8 h-8 rounded-full flex items-center justify-center",
                             row._mode === "SEA" ? "bg-blue-100 text-blue-600" :
                             row._mode === "AIR" ? "bg-purple-100 text-purple-600" :
                             "bg-orange-100 text-orange-600"
                           )}>
                             {row._mode === "SEA" ? <Ship className="w-4 h-4" /> : row._mode === "AIR" ? <PlaneIcon /> : <Layers className="w-4 h-4" />}
                           </div>
                           
                           <div>
                              <div className="text-sm font-semibold text-slate-900">{row.CONNAME || "Unknown Client"}</div>
                              <div className="text-xs text-slate-500">{row.JOBNO} • {row._date ? format(row._date, "MM/dd/yy") : "N/A"}</div>
                           </div>
                        </div>
                        
                        <div className="text-right">
                           <div className="text-sm font-bold text-slate-900">${(cleanNum(row.CONT_GRWT) * 0.5).toLocaleString()}</div>
                           <MoreVertical className="w-4 h-4 text-slate-300 ml-auto mt-1 opacity-0 group-hover:opacity-100" />
                        </div>
                     </div>
                   ))}
                   
                   {recentShipments.length === 0 && (
                     <div className="p-8 text-center text-slate-400 text-sm">No records found</div>
                   )}
                </div>
              </CardContent>
              {drilldowns['invoices'] && (
                <div className="px-6 pb-4 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Inline drilldown</div>
                      <div className="text-xs text-slate-500">Recent selections mirrored below</div>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDrawerOpen(true)}>
                      Open drawer
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentShipments.slice(0, 4).map((row, idx) => (
                      <div key={`drill-${idx}`} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <div className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">{row.CONNAME || 'Unknown Client'}</div>
                        </div>
                        <div className="text-xs text-slate-500">{row._date ? format(row._date, "dd MMM") : 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

          </div>

        </div>
                {/* MODE INSIGHTS WIDE CARD */}
                <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4" /> Mode insights
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">Distribution, trends, and top lanes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={modeStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          animationDuration={300}
                        >
                          {modeStats.map((entry, index) => (
                            <Cell key={`full-mode-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={modeMonthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 11, fill: '#64748b'}}
                          tickFormatter={(val) => {
                            try { return format(new Date(val + '-01'), 'MMM') } catch { return val }
                          }}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend />
                        {modeStats.map((mode, idx) => (
                          <Line 
                            key={mode.name}
                            type="monotone" 
                            dataKey={mode.name} 
                            stroke={COLORS[idx % COLORS.length]} 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                            animationDuration={300}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {modeStats.map((stat, idx) => (
                    <div key={`mode-summary-${stat.name}`} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-sm text-slate-700">{stat.name}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {stat.value} ({Math.round((stat.value / Math.max(totalModes, 1)) * 100)}%)
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 mb-2">Top lanes by weight</div>
                    <div className="space-y-2 text-sm">
                      {laneStats.slice(0, 5).map((lane, idx) => (
                        <div key={`lane-wide-${idx}`} className="flex items-center justify-between">
                          <span className="text-slate-700 truncate pr-2">{lane.name}</span>
                          <span className="text-slate-900 font-semibold">{lane.weight}t</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 mb-2">Mode vs clients</div>
                    <div className="space-y-2 text-sm">
                      {clientStats.slice(0, 4).map((client, idx) => (
                        <div key={`client-wide-${idx}`} className="flex items-center justify-between">
                          <span className="text-slate-700 truncate pr-2">{client.name}</span>
                          <span className="text-slate-900 font-semibold">{client.shipments} files</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARRIER DISTRIBUTION */}
            <Card 
              className={cn(
                "shadow-none border border-slate-200 rounded-xl overflow-hidden transition-all",
                hoveredChart === 'carriers' && "shadow-lg border-slate-300"
              )}
              onMouseEnter={() => setHoveredChart('carriers')}
              onMouseLeave={() => setHoveredChart(null)}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Ship className="w-4 h-4" /> Top Carriers
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleDrilldown('carriers')}>
                    {drilldowns['carriers'] ? 'Hide drilldown' : 'Show drilldown'}
                  </Button>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={carrierStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#64748b'}}
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={300}>
                        {carrierStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            style={{ 
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {drilldowns['carriers'] && (
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900 mb-2">Carrier detail</div>
                    <div className="grid grid-cols-2 gap-3">
                      {carrierStats.slice(0, 6).map((carrier, idx) => (
                        <div key={carrier.name} className="p-3 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900 truncate">{carrier.name}</span>
                            <span className="text-xs text-slate-500">{carrier.value} loads</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: `${(carrier.value / (carrierStats[0]?.value || 1)) * 100}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CLIENT PERFORMANCE */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Top Clients by Volume
                </CardTitle>
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientStats.map((client, idx) => (
                    <div key={client.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">{client.name}</div>
                          <div className="text-xs text-slate-500">{client.shipments} shipments</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">{client.tons.toFixed(1)} tons</div>
                          <div className="text-xs text-slate-500">Total weight</div>
                        </div>
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(client.tons / clientStats[0].tons) * 100}%`,
                              backgroundColor: COLORS[idx % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* MAP SECTION */}
             <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-0 pt-4 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4" /> Live Tracking</CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">Full Screen</Button>
                </CardHeader>
                <CardContent className="p-0 h-[300px]">
                   {mapMarkers.length > 0 ? (
                      <Map markers={mapMarkers} height="300px" />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400">No map data</div>
                    )}
                </CardContent>
             </Card>

             {/* FILLER TO REDUCE BLANK SPACE */}
             <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
               <CardHeader className="pb-3">
                 <CardTitle className="text-base font-bold text-slate-900">Operational insights</CardTitle>
                 <CardDescription className="text-xs text-slate-500">Quick highlights to balance layout</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   {[
                     { label: "On-time", value: "92%", trend: "+4%", color: "bg-emerald-100 text-emerald-700" },
                     { label: "Exceptions", value: "18", trend: "-3", color: "bg-amber-100 text-amber-700" },
                     { label: "Gross margin", value: "24%", trend: "+1.4%", color: "bg-blue-100 text-blue-700" },
                   ].map(tile => (
                     <div key={tile.label} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                       <div>
                         <div className="text-[11px] uppercase text-slate-500 font-semibold">{tile.label}</div>
                         <div className="text-lg font-semibold text-slate-900">{tile.value}</div>
                       </div>
                       <span className={`text-xs px-2 py-1 rounded-full ${tile.color}`}>{tile.trend}</span>
                     </div>
                   ))}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <div className="p-3 rounded-lg border border-slate-200 bg-white">
                     <div className="text-xs text-slate-500 mb-2">Lane watch</div>
                     <div className="space-y-2 text-sm">
                       {laneStats.slice(0, 3).map((lane, idx) => (
                         <div key={`lane-${idx}`} className="flex items-center justify-between">
                           <span className="text-slate-700 truncate pr-2">{lane.name}</span>
                           <span className="text-slate-900 font-semibold">{lane.weight}t</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   <div className="p-3 rounded-lg border border-slate-200 bg-white">
                     <div className="text-xs text-slate-500 mb-2">Upcoming docs</div>
                     <div className="space-y-2 text-sm">
                       {recentShipments.slice(0, 3).map((row, idx) => (
                         <div key={`doc-${idx}`} className="flex items-center justify-between">
                           <span className="text-slate-700 truncate pr-2">{row.CONNAME || "Unknown"}</span>
                           <span className="text-slate-500">{row.DOCRECD || "Pending"}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* ACTIVITY FEED TO FILL SPACE */}
             <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
               <CardHeader className="pb-3 flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-base font-bold text-slate-900">Activity feed</CardTitle>
                   <CardDescription className="text-xs text-slate-500">Latest shipment and finance signals</CardDescription>
                 </div>
                 <Button variant="ghost" size="sm" className="h-8 text-xs">View all</Button>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div className="space-y-2">
                   {recentShipments.slice(0, 6).map((row, idx) => (
                     <div key={`feed-${idx}`} className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                       <div className="flex items-center gap-3">
                         <div className={cn(
                           "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                           row._mode === "SEA" ? "bg-blue-100 text-blue-700" :
                           row._mode === "AIR" ? "bg-purple-100 text-purple-700" :
                           "bg-orange-100 text-orange-700"
                         )}>
                           {row._mode || "N/A"}
                         </div>
                         <div className="text-sm">
                           <div className="font-semibold text-slate-900 truncate max-w-[220px]">{row.CONNAME || "Unknown Client"}</div>
                           <div className="text-xs text-slate-500">
                             {row.POL || "Origin"} → {row.POD || "Dest"} · {row._date ? format(row._date, "dd MMM yyyy") : "N/A"}
                           </div>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-xs text-slate-500">Weight</div>
                         <div className="text-sm font-semibold text-slate-900">{(cleanNum(row.CONT_GRWT) / 1000).toFixed(1)}t</div>
                       </div>
                     </div>
                   ))}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                   <div className="p-3 rounded-lg border border-slate-200 bg-white">
                     <div className="text-[11px] uppercase text-slate-500 font-semibold">Upcoming departures</div>
                     <div className="text-lg font-semibold text-slate-900 mt-1">{recentShipments.slice(0, 10).filter(r => r.ETD).length}</div>
                     <div className="text-xs text-slate-500">With ETD dates</div>
                   </div>
                   <div className="p-3 rounded-lg border border-slate-200 bg-white">
                     <div className="text-[11px] uppercase text-slate-500 font-semibold">Docs pending</div>
                     <div className="text-lg font-semibold text-slate-900 mt-1">{recentShipments.slice(0, 10).filter(r => !r.DOCRECD).length}</div>
                     <div className="text-xs text-slate-500">Missing DOCRECD</div>
                   </div>
                   <div className="p-3 rounded-lg border border-slate-200 bg-white">
                     <div className="text-[11px] uppercase text-slate-500 font-semibold">Top provider</div>
                     <div className="text-sm font-semibold text-slate-900 mt-1">{recentShipments[0]?.CONNAME || "N/A"}</div>
                     <div className="text-xs text-slate-500">By latest arrivals</div>
                   </div>
                 </div>
               </CardContent>
             </Card>
      </main>

      {/* Shipment Detail Drawer */}
      <ShipmentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={selectedRecord}
      />
    </div>
    
  )
}

// Helper for Plane Icon
const PlaneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 22h20" />
    <path d="M12 2l-6.5 10 3 2 4.5-4 4.5 4 3-2L12 2z" />
  </svg>
)