'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import dynamic from "next/dynamic"

const Map = dynamic(() => import("@/components/ui/map").then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-lg"><span className="text-slate-400 text-sm">Loading map...</span></div>
})
import { format, isWithinInterval, parse, isValid, startOfDay, endOfDay, subDays, startOfYear, differenceInDays } from "date-fns"
import { Calendar as CalendarIcon, FilterX, Ship, Box, Anchor, Layers, Container, X, MapPin, Search, Download, Clock } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts"
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

export default function Dashboard({ data }: { data: any[] }) {
  const [selectedMode, setSelectedMode] = useState<string>("ALL")
  const [selectedClient, setSelectedClient] = useState<string>("ALL")
  const [trendMetric, setTrendMetric] = useState<"weight" | "teu" | "cbm" | "shipments">("weight")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

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
  const parsedData = useMemo(() => {
    return data.map(row => ({
      ...row,
      _date: getValidDate(row),
      _mode: getComputedMode(row) // We use this new _mode for everything
    }))
  }, [data])

  // --- 2. WATERFALL LOGIC ---
  const { minDate, maxDate } = useMemo(() => {
    let min = new Date(8640000000000000);
    let max = new Date(-8640000000000000);
    let hasData = false;

    parsedData.forEach(row => {
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return
      if (row._date) {
        if (row._date < min) min = row._date
        if (row._date > max) max = row._date
        hasData = true
      }
    })
    
    if (!hasData) return { minDate: new Date(), maxDate: new Date() }
    return { minDate: min, maxDate: max }
  }, [parsedData, selectedMode])

  const { allProviders, availableProviders } = useMemo(() => {
    const all = new Set<string>()
    const available = new Set<string>()

    parsedData.forEach(row => {
      const provider = row.CONNAME || "Unknown"
      all.add(provider)
      
      // Filter by Computed Mode
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return
      
      // Filter by Date
      if (dateRange.from && dateRange.to && row._date) {
         if (!isWithinInterval(row._date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return
      }
      
      available.add(provider)
    })
    return { allProviders: Array.from(all).sort(), availableProviders: available }
  }, [parsedData, selectedMode, dateRange])

  // --- 3. FILTER DATA (with search) ---
  const chartData = useMemo(() => {
    return parsedData.filter(row => {
      // Filter by Computed Mode
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return false
      
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
  }, [parsedData, selectedMode, selectedClient, dateRange, searchQuery])

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
  const kpis = useMemo(() => {
    // Calculate transit time
    let transitDays: number[] = []
    chartData.forEach(row => {
      const etd = row.ETD ? getValidDate({ ETD: row.ETD }) : null
      const atd = row.ATD ? getValidDate({ ATD: row.ATD }) : null
      if (etd && atd && atd > etd) {
        const days = differenceInDays(atd, etd)
        if (days > 0 && days < 365) transitDays.push(days) // Reasonable range
      }
    })
    
    const avgTransit = transitDays.length > 0 
      ? transitDays.reduce((sum, d) => sum + d, 0) / transitDays.length 
      : 0

    return {
      shipments: chartData.length,
      weight: chartData.reduce((sum, r) => sum + cleanNum(r.CONT_GRWT), 0),
      teu: chartData.reduce((sum, r) => sum + cleanNum(r.CONT_TEU), 0),
      cbm: chartData.reduce((sum, r) => sum + cleanNum(r.CONT_CBM), 0),
      avgTransit: Math.round(avgTransit * 10) / 10
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
    chartData.forEach(row => {
      if (!row._date) return
      const key = format(row._date, 'yyyy-MM')
      stats[key] = (stats[key] || 0) + metricConfig[trendMetric].accessor(row)
    })
    return Object.entries(stats)
      .map(([date, val]) => ({ date, val: Math.round(val * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [chartData, trendMetric])

  const modeStats = useMemo(() => {
    const stats: Record<string, number> = {}
    chartData.forEach(row => {
      const m = row._mode || "Unknown" // Use computed mode
      stats[m] = (stats[m] || 0) + 1
    })
    return Object.entries(stats).map(([name, value]) => ({ name, value }))
  }, [chartData])

  const carrierStats = useMemo(() => {
    const stats: Record<string, number> = {}
    chartData.forEach(row => {
      const c = row.LINER_NAME || "Unknown"
      stats[c] = (stats[c] || 0) + 1
    })
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
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
    return chartData
      .filter(r => r._date)
      .sort((a, b) => (b._date as Date).getTime() - (a._date as Date).getTime())
      .slice(0, 12)
  }, [chartData])

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

  return (
    <div className="min-h-screen bg-slate-100 p-4 space-y-4">
      
      {/* HEADER & FILTERS */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3 items-center justify-between sticky top-0 z-20">
        <div className="flex gap-3 items-center flex-wrap w-full xl:w-auto">
          <div className="flex items-center gap-2 mr-2 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
             <Ship className="text-blue-600" size={18} />
             <span className="font-bold text-blue-900 hidden md:inline">LogisticsAI</span>
          </div>
          
          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Job / Container / BL..." 
              className="pl-9 w-[200px] md:w-[250px] h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* MODE */}
          <Select value={selectedMode} onValueChange={(val) => {
            setSelectedMode(val); setDateRange({ from: undefined, to: undefined }); setSelectedClient("ALL");
          }}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Modes</SelectItem>
              <SelectItem value="SEA">SEA</SelectItem>
              <SelectItem value="AIR">AIR</SelectItem>
              <SelectItem value="SEA-AIR">SEA-AIR</SelectItem>
            </SelectContent>
          </Select>

          {/* CALENDAR */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-[200px] h-9 justify-start text-left font-normal border-slate-200", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}</> : format(dateRange.from, "MMM dd, y")) : <span>Date Range</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus mode="range" defaultMonth={minDate || new Date()} selected={dateRange}
                onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2} disabled={(date) => date < minDate || date > maxDate}
              />
            </PopoverContent>
          </Popover>

          {/* PROVIDER */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Providers</SelectItem>
              {allProviders.map(provider => (
                <SelectItem key={provider} value={provider} disabled={!availableProviders.has(provider)} className={!availableProviders.has(provider) ? "opacity-50" : ""}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
          {/* EXPORT BUTTON */}
          <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => { 
            setSelectedMode("ALL"); 
            setSelectedClient("ALL"); 
            setSearchQuery(""); 
            setDateRange({ from: undefined, to: undefined }) 
          }} className="text-red-500 h-9 hover:bg-red-50">
            <FilterX className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-slate-600">Total Shipments</CardTitle><Box className="w-3.5 h-3.5 text-blue-600" /></CardHeader>
          <CardContent className="pt-0"><div className="text-xl font-bold text-slate-900">{kpis.shipments.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-slate-600">Gross Weight</CardTitle><Anchor className="w-3.5 h-3.5 text-emerald-600" /></CardHeader>
          <CardContent className="pt-0"><div className="text-xl font-bold text-slate-900">{(kpis.weight / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-500">Tons</span></div></CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-slate-600">Total TEUs</CardTitle><Container className="w-3.5 h-3.5 text-orange-600" /></CardHeader>
          <CardContent className="pt-0"><div className="text-xl font-bold text-slate-900">{kpis.teu.toFixed(1)}</div></CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-slate-600">Total CBM</CardTitle><Layers className="w-3.5 h-3.5 text-purple-600" /></CardHeader>
          <CardContent className="pt-0"><div className="text-xl font-bold text-slate-900">{kpis.cbm.toFixed(1)}</div></CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1.5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-medium text-slate-600">Avg Transit</CardTitle><Clock className="w-3.5 h-3.5 text-indigo-600" /></CardHeader>
          <CardContent className="pt-0"><div className="text-xl font-bold text-slate-900">{kpis.avgTransit > 0 ? `${kpis.avgTransit}` : '-'} <span className="text-xs font-normal text-slate-500">{kpis.avgTransit > 0 ? 'days' : ''}</span></div></CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <Card className="col-span-1 md:col-span-2 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Volume Trend</CardTitle>
              <CardDescription className="text-xs">{metricConfig[trendMetric].label} over time</CardDescription>
            </div>
            <div className="flex gap-1.5">
              {(["weight", "teu", "cbm", "shipments"] as const).map(key => (
                <Button key={key} size="sm" variant={trendMetric === key ? "default" : "outline"} className="h-7 text-xs px-2" onClick={() => setTrendMetric(key)}>
                  {metricConfig[key].label.split(" ")[0]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[260px] pt-0">
             {monthlyTrend.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs><linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickMargin={10} axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="val" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-400">No date data available for these shipments</div>}
          </CardContent>
        </Card>

        {/* Mode Split */}
        <Card className="col-span-1 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Mode Split</CardTitle><CardDescription className="text-xs">By count</CardDescription></CardHeader>
          <CardContent className="h-[260px] pt-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={modeStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {modeStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 flex-wrap">
               {modeStats.map((entry, index) => (
                 <div key={entry.name} className="flex items-center text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full mr-1" style={{background: COLORS[index % COLORS.length]}}/>
                    {entry.name}
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {/* Origins */}
        <Card className="col-span-1 md:col-span-2 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Origins</CardTitle><CardDescription className="text-xs">By Weight</CardDescription></CardHeader>
          <CardContent className="h-[260px] pt-0">
             {originStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={originStats} layout="vertical" margin={{left: 20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="val" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-400">No data available</div>}
          </CardContent>
        </Card>

        {/* Carriers */}
        <Card className="col-span-1 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Carriers</CardTitle></CardHeader>
          <CardContent className="h-[260px] pt-0">
             {carrierStats.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={carrierStats}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} interval={0} />
                   <Tooltip cursor={{fill: '#f8fafc'}} />
                   <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                      {carrierStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-400">No data available</div>}
          </CardContent>
        </Card>

        {/* Mode Over Time */}
        <Card className="col-span-1 md:col-span-2 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Mode Over Time</CardTitle><CardDescription className="text-xs">Stacked by month</CardDescription></CardHeader>
          <CardContent className="h-[260px] pt-0">
            {modeMonthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={modeMonthly} stackOffset="expand">
                  <defs>
                    {modeStats.map((m, idx) => (
                      <linearGradient key={m.name} id={`mode-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.3} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickMargin={10} axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis tickFormatter={(val) => `${Math.round(val * 100)}%`} axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip formatter={(value: any) => `${(value * 100).toFixed(0)}%`} />
                  {modeStats.map((m, idx) => (
                    <Area key={m.name} type="monotone" dataKey={m.name} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={`url(#mode-${idx})`} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No timeline data available</div>}
          </CardContent>
        </Card>

        {/* Destinations */}
        <Card className="col-span-1 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Destinations</CardTitle><CardDescription className="text-xs">By shipments</CardDescription></CardHeader>
          <CardContent className="h-[260px] pt-0">
            {destinationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destinationStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} interval={0} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {destinationStats.map((entry, index) => <Cell key={`dest-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No destination data</div>}
          </CardContent>
        </Card>

        {/* Client Contribution */}
        <Card className="col-span-1 md:col-span-2 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Client Contribution</CardTitle><CardDescription className="text-xs">Shipments and weight</CardDescription></CardHeader>
          <CardContent className="h-[260px] pt-0">
            {clientStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientStats} layout="vertical" margin={{left: 20}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val: any, key) => key === "tons" ? `${val} t` : val} />
                  <Bar dataKey="shipments" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={14} name="Shipments" />
                  <Bar dataKey="tons" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={14} name="Weight (t)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No client data</div>}
          </CardContent>
        </Card>

        {/* Lane Performance */}
        <Card className="col-span-1 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Lanes</CardTitle><CardDescription className="text-xs">By weight (tons)</CardDescription></CardHeader>
          <CardContent className="h-[260px] pt-0">
            {laneStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laneStats} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val: any, key) => key === "shipments" ? `${val} shipments` : `${val} t`} />
                  <Bar dataKey="weight" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} name="Weight (t)" />
                  <Bar dataKey="shipments" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={16} name="Shipments" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No lane data</div>}
          </CardContent>
        </Card>

        {/* Recent Shipments */}
        <Card className="col-span-1 md:col-span-3 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Shipments</CardTitle><CardDescription className="text-xs">Latest records matching filters</CardDescription></CardHeader>
          <CardContent className="pt-0">
            {recentShipments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-left text-slate-600 border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="py-1.5 px-3 font-medium">Date</th>
                      <th className="py-1.5 px-3 font-medium">Mode</th>
                      <th className="py-1.5 px-3 font-medium">Job No</th>
                      <th className="py-1.5 px-3 font-medium">Provider</th>
                      <th className="py-1.5 px-3 font-medium">Route</th>
                      <th className="py-1.5 px-3 text-right font-medium">Weight (t)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentShipments.map((row, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => handleRowClick(row)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-1.5 px-3 text-slate-700">{row._date ? format(row._date, "yyyy-MM-dd") : "N/A"}</td>
                        <td className="py-1.5 px-3">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            row._mode === "SEA" ? "bg-blue-50 text-blue-700" :
                            row._mode === "AIR" ? "bg-purple-50 text-purple-700" :
                            row._mode === "SEA-AIR" ? "bg-orange-50 text-orange-700" :
                            "bg-slate-50 text-slate-700"
                          )}>
                            {row._mode || "Unknown"}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-700">{row.JOBNO || "-"}</td>
                        <td className="py-1.5 px-3 text-slate-700">{row.CONNAME || "Unknown"}</td>
                        <td className="py-1.5 px-3 text-slate-700">{`${row.POL || "?"} → ${row.POD || "?"}`}</td>
                        <td className="py-1.5 px-3 text-right font-medium text-slate-900">{(cleanNum(row.CONT_GRWT) / 1000).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="py-8 text-center text-slate-400">No records found</div>}
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-blue-600" />
              Shipping Routes Map
            </CardTitle>
            <CardDescription className="text-xs">
              {mapMarkers.length > 0 
                ? `${mapMarkers.length} port${mapMarkers.length > 1 ? 's' : ''} mapped` 
                : 'Top lanes origins and destinations'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {mapMarkers.length > 0 ? (
              <Map markers={mapMarkers} height="350px" />
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                <MapPin className="w-12 h-12 text-slate-300 mb-2" />
                <span className="text-slate-500 text-sm font-medium">No port locations found</span>
                <span className="text-slate-400 text-xs mt-1">Port codes may not match known locations</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer for Record Details */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>Shipment Details</DrawerTitle>
                <DrawerDescription>Complete record information</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          {selectedRecord && (
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">Date</label>
                  <div className="text-sm font-semibold mt-1">
                    {selectedRecord._date ? format(selectedRecord._date, "yyyy-MM-dd") : "N/A"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Mode</label>
                  <div className="text-sm font-semibold mt-1">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs",
                      selectedRecord._mode === "SEA" ? "bg-blue-100 text-blue-700" :
                      selectedRecord._mode === "AIR" ? "bg-purple-100 text-purple-700" :
                      selectedRecord._mode === "SEA-AIR" ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {selectedRecord._mode || "Unknown"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Provider</label>
                  <div className="text-sm font-semibold mt-1">{selectedRecord.CONNAME || "Unknown"}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Carrier</label>
                  <div className="text-sm font-semibold mt-1">{selectedRecord.LINER_NAME || "Unknown"}</div>
                </div>
              </div>

              {/* Route */}
              <div className="border-t pt-4">
                <label className="text-xs font-medium text-slate-500">Route</label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="px-3 py-2 bg-blue-50 rounded-md text-sm font-medium">
                    {selectedRecord.POL || "?"}
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="px-3 py-2 bg-green-50 rounded-md text-sm font-medium">
                    {selectedRecord.POD || "?"}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">Weight</label>
                  <div className="text-lg font-bold mt-1">
                    {(cleanNum(selectedRecord.CONT_GRWT) / 1000).toFixed(2)} <span className="text-sm font-normal text-slate-400">tons</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">TEU</label>
                  <div className="text-lg font-bold mt-1">{cleanNum(selectedRecord.CONT_TEU).toFixed(1)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">CBM</label>
                  <div className="text-lg font-bold mt-1">{cleanNum(selectedRecord.CONT_CBM).toFixed(1)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Containers</label>
                  <div className="text-lg font-bold mt-1">{selectedRecord.CONT_QTY || "N/A"}</div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">ETD</label>
                  <div className="text-sm mt-1">{selectedRecord.ETD || "N/A"}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">ATD</label>
                  <div className="text-sm mt-1">{selectedRecord.ATD || "N/A"}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Doc Received</label>
                  <div className="text-sm mt-1">{selectedRecord.DOCRECD || "N/A"}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Doc Date</label>
                  <div className="text-sm mt-1">{selectedRecord.DOCDT || "N/A"}</div>
                </div>
              </div>

              {/* References */}
              {(selectedRecord.BLNO || selectedRecord.CONNO || selectedRecord.BOOKNO) && (
                <div className="border-t pt-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">References</label>
                  <div className="space-y-2">
                    {selectedRecord.BLNO && (
                      <div className="text-sm">
                        <span className="text-slate-500">BL No:</span> <span className="font-mono">{selectedRecord.BLNO}</span>
                      </div>
                    )}
                    {selectedRecord.CONNO && (
                      <div className="text-sm">
                        <span className="text-slate-500">Container No:</span> <span className="font-mono">{selectedRecord.CONNO}</span>
                      </div>
                    )}
                    {selectedRecord.BOOKNO && (
                      <div className="text-sm">
                        <span className="text-slate-500">Booking No:</span> <span className="font-mono">{selectedRecord.BOOKNO}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DrawerFooter className="border-t">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}