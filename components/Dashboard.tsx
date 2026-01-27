'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
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
import { format, isWithinInterval, parse, startOfDay, endOfDay, subDays, startOfYear } from "date-fns"
import { Calendar as CalendarIcon, FilterX, Ship, Box, Anchor, Layers, Container, MapPin, Search, Download, Clock, MessageSquare, Briefcase, LayoutDashboard, FileText, Users, BarChart3, PieChart as PieChartIcon, Settings, MoreVertical, Check, ArrowUpRight, ArrowDownRight, Printer, DollarSign, Leaf, TrendingUp, TrendingDown, Activity, Snowflake, LogOut } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line } from "recharts"
import { cn } from "@/lib/utils"
import Snowfall from 'react-snowfall'

// Import Logic
import { cleanNum, getValidDate, getComputedMode, generateFinancials, generateEmissions, filterData, calculateTransitStats, calculateLinerStats } from "@/lib/dashboard-logic"

// Import Shadcn Chart Components
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ModeToggle } from "@/components/mode-toggle"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/footer"


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

type DashboardProps = {
  data: {
    rawShipments: any[];
    kpiTotals: any;
    monthlyStats: any[];
    avgTransit: any;
    extremes: any;
    median: any;
    onTime: any;
    monthlyOnTime: any[];
    transitBreakdown: any;
  } | null
}

export default function Dashboard({ data }: DashboardProps) {
  // If data is null (loading or error), handle gracefully
  if (!data) return <div className="p-10 text-center">Loading Data...</div>

  const { 
    rawShipments, 
    kpiTotals, 
    monthlyStats, 
    avgTransit, 
    extremes, 
    median,
    onTime, 
    monthlyOnTime,
    transitBreakdown 
  } = data

  const { data: session } = useSession()
  const username = session?.user?.email || session?.user?.name || 'User'
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
  const [showSnow, setShowSnow] = useState(false)
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
    // Safety check if rawShipments is missing
    if (!rawShipments || !Array.isArray(rawShipments)) return [];

    return rawShipments.map(row => {
      const mode = getComputedMode(row);
      const financials = generateFinancials(row); // Inject Mock Money
      const environment = generateEmissions(row); // Inject Mock CO2

      return {
        ...row,
        // FIX: Trim the provider name to ensure matching works
        CONNAME: (row.CONNAME || "Unknown").trim(),
        _date: getValidDate(row),
        _mode: mode, // We use this new _mode for everything
        _carrier: getCarrier(row), // NEW: Uses smart fallback
        _office: getOffice(row.POL),
        _teu: cleanNum(row.CONT_TEU) || 0, // Use direct TEU from database
        _financials: financials,
        _env: environment
      }
    })
  }, [rawShipments])

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

  // Auto-select single provider if only one exists
  useEffect(() => {
    if (allProviders.length === 1 && selectedClient === "ALL") {
      setSelectedClient(allProviders[0]);
    }
  }, [allProviders, selectedClient]);

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
      
      // FIX: Robust Provider Check with defensive trim
      if (selectedClient !== "ALL" && row.CONNAME?.trim() !== selectedClient.trim()) return false
      
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

  // --- 4. CHART DATA GENERATORS ---
  const getTrend = (key: string, accessor: (r: any) => number) => {
    const map: Record<string, number> = {}
    chartData.forEach(r => {
      if (!r._date) return
      const k = format(r._date, 'MMM yyyy')
      map[k] = (map[k] || 0) + accessor(r)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }

  // --- 5. EXPORT FUNCTION ---
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
    const uniqueJobs = new globalThis.Map<string, ShipmentRecord>()
    chartData.forEach((r, idx) => {
      const key = r.JOBNO ? String(r.JOBNO) : `__${idx}`
      if (!uniqueJobs.has(key)) uniqueJobs.set(key, r)
    })
    const uniqueRows = Array.from(uniqueJobs.values()) as ShipmentRecord[]

    const transitStats = calculateTransitStats(uniqueRows)
    const linerStats = calculateLinerStats(chartData)

    // BACKEND BINDING: Use backend values when no filters are applied
    // Otherwise calculate from filtered chartData
    const hasFilters = dateRange.from || dateRange.to || selectedMode !== "ALL" || selectedClient !== "ALL" || selectedOffice !== "ALL"
    
    let totalWeight: number
    let totalTEU: number
    let totalCBM: number
    let totalShipments: number
    let displayTransit: number
    let displayOnTime: number
    let displayMedian: number
    let displayFastest: number
    let displaySlowest: number

    if (!hasFilters) {
      // Use backend calculated values (divide weight by 1000 for tons, assuming SP returns KG)
      totalWeight = (kpiTotals.CONT_GRWT || 0) / 1000
      totalShipments = kpiTotals.TOTAL_SHIPMENT || 0
      displayTransit = avgTransit.Avg_Pickup_To_Arrival_Days || 0
      displayOnTime = onTime.OnTime_Percentage || 0
      displayMedian = median.Median_TT || 0
      displayFastest = extremes.Fastest_TT || 0
      displaySlowest = extremes.Slowest_TT || 0
      
      // Calculate TEU and CBM from filtered data (not provided by SP)
      totalTEU = uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_TEU), 0)
      totalCBM = uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_CBM), 0)
    } else {
      // Calculate from filtered data when filters are applied
      totalWeight = uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_GRWT), 0) / 1000
      totalTEU = uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_TEU), 0)
      totalCBM = uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + cleanNum(r.CONT_CBM), 0)
      totalShipments = uniqueRows.length
      displayTransit = transitStats.avg
      displayOnTime = transitStats.onTimePct
      displayMedian = transitStats.median
      displayFastest = transitStats.min
      displaySlowest = transitStats.max
    }

    return {
      shipments: totalShipments,
      weight: totalWeight, // In tons
      teu: totalTEU,
      cbm: totalCBM,
      
      // Transit KPIs (Use backend values when no filters, otherwise calculated)
      avgTransit: displayTransit,
      minTransit: displayFastest,
      maxTransit: displaySlowest,
      medianTransit: displayMedian,
      stddevTransit: transitStats.stddev,
      transitShipmentCount: transitStats.transitShipmentCount,
      
      // On-Time KPIs
      onTimeShipments: transitStats.onTimeShipments,
      onTimeBase: transitStats.onTimeBase,
      onTimePct: displayOnTime,
      
      // Transit Legs (Use backend breakdown when no filters)
      // Backend provides: Avg_Pickup_Arrival, Avg_Departure_Delivery, Avg_Arrival_Departure
      // Frontend expects: pickupToArrival, pickupToDelivery, depToArrival, depToDelivery
      legs: !hasFilters && transitBreakdown ? {
        pickupToArrival: transitBreakdown.Avg_Pickup_Arrival || 0,
        depToArrival: transitBreakdown.Avg_Arrival_Departure || 0,
        depToDelivery: transitBreakdown.Avg_Departure_Delivery || 0,
        // Calculate pickupToDelivery from other legs if possible, otherwise use calculated value
        pickupToDelivery: transitStats.legs.pickupToDelivery
      } : transitStats.legs,
      
      // Change KPIs (MoM/YoY for all legs)
      changes: transitStats.changes,
      
      // Liner KPIs
      liner: linerStats,
      
      revenue: uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + (r._financials?.revenue || 0), 0),
      profit: uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + (r._financials?.profit || 0), 0),
      co2: uniqueRows.reduce((sum: number, r: ShipmentRecord) => sum + (r._env?.co2 || 0), 0)
    }
  }, [chartData, kpiTotals, avgTransit, extremes, median, onTime, transitBreakdown, dateRange, selectedMode, selectedClient, selectedOffice])

  const metricConfig = {
    weight: { label: "Weight (Tons)", accessor: (row: any) => cleanNum(row.CONT_GRWT) / 1000 }, // Convert KG to tons
    teu: { label: "TEU", accessor: (row: any) => cleanNum(row.CONT_TEU) || 0 }, // Use direct TEU from database
    cbm: { label: "CBM", accessor: (row: any) => cleanNum(row.CONT_CBM) },
    shipments: { label: "Shipments", accessor: () => 1 }
  } as const

  const monthlyTrend = useMemo(() => {
    // Use backend monthlyStats directly
    if (monthlyStats && monthlyStats.length > 0) {
      const monthMap: Record<string, number> = {}
      
      monthlyStats.forEach((row: any) => {
        const month = String(row.MONTH || row.Month || '')
        if (!month) return
        
        // Convert YYYYMM format to YYYY-MM format
        let monthKey = month
        if (month.length === 6 && /^\d{6}$/.test(month)) {
          monthKey = `${month.substring(0, 4)}-${month.substring(4, 6)}`
        }
        
        // Map based on selected trend metric
        let value = 0
        if (trendMetric === 'teu') {
          value = cleanNum(row.TOTAL_TEU || row.Total_TEU || 0)
        } else if (trendMetric === 'cbm') {
          value = cleanNum(row.TOTAL_CBM || row.Total_CBM || 0)
        } else if (trendMetric === 'weight') {
          // Convert weight from KG to tons (consistent with KPI display)
          value = cleanNum(row.TOTAL_WEIGHT_KG || row.Total_Weight_KG || 0) / 1000
        } else if (trendMetric === 'shipments') {
          value = cleanNum(row.TOTAL_SHIPMENT || row.Total_Shipment || 0)
        }
        
        monthMap[monthKey] = value
      })
      
      return Object.entries(monthMap)
        .map(([date, val]) => ({ date, val: Math.round(val * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }
    
    // Fallback to calculating from individual rows if monthly data not available
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
  }, [monthlyStats, chartData, trendMetric])

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
      .map(([name, val]) => ({ name, val: Math.round(val) }))
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
      stats[client].tons += cleanNum(row.CONT_GRWT)
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
      stats[key].weight += cleanNum(row.CONT_GRWT)
      stats[key].shipments += 1
    })
    return Object.entries(stats)
      .map(([name, info]) => ({ name, weight: Math.round(info.weight * 10) / 10, shipments: info.shipments }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
  }, [chartData])

  const statusStats = useMemo(() => {
      const stats: Record<string, number> = {}
      chartData.forEach(row => {
          let s = (row.CONT_CONTSTATUS || 'Unknown').toUpperCase()
          // Simplify statuses
          if (s.includes('FCL')) s = 'FCL'
          else if (s.includes('LCL')) s = 'LCL'
          else if (s.includes('MTY')) s = 'Empty'
          else s = 'Other'
          stats[s] = (stats[s] || 0) + 1
      })
      return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
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

  const formatCompactNumber = (val: number) => {
    if (val >= 1000000000) {
      return `${(val / 1000000000).toFixed(1)}B`
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`
    }
    return formatNumber(val)
  }

  const hasData = chartData.length > 0

  // --- QUICK SNAPSHOT CALCULATIONS ---
  const quickSnapshot = useMemo(() => {
    const uniqueJobs = new globalThis.Map<string, ShipmentRecord>()
    chartData.forEach((r, idx) => {
      const key = r.JOBNO ? String(r.JOBNO) : `__${idx}`
      if (!uniqueJobs.has(key)) uniqueJobs.set(key, r)
    })
    const uniqueRows = Array.from(uniqueJobs.values())

    // On-Time %: Shipments where ATD <= ETD (or ATA <= ETA)
    let onTimeCount = 0
    let totalWithDates = 0
    uniqueRows.forEach((r: ShipmentRecord) => {
      const etd = getValidDate({ ETD: r.ETD })
      const atd = getValidDate({ ATD: r.ATD })
      const eta = getValidDate({ ETA: r.ETA })
      const ata = getValidDate({ ATA: r.ATA })
      
      if (atd && etd) {
        totalWithDates++
        if (atd <= etd) onTimeCount++
      } else if (ata && eta) {
        totalWithDates++
        if (ata <= eta) onTimeCount++
      }
    })
    const onTimePercent = totalWithDates > 0 ? Math.round((onTimeCount / totalWithDates) * 100) : 0

    // Exceptions: Shipments with delays or status issues
    const exceptions = uniqueRows.filter((r: ShipmentRecord) => {
      const atd = getValidDate({ ATD: r.ATD })
      const etd = getValidDate({ ETD: r.ETD })
      if (atd && etd && atd > etd) return true
      const status = (r.SHPTSTATUS || '').toUpperCase()
      return status.includes('DELAY') || status.includes('EXCEPTION') || status.includes('ISSUE')
    }).length

    // Fleet Utilization: Based on container utilization percentage
    let totalUtilization = 0
    let utilizationCount = 0
    uniqueRows.forEach((r: ShipmentRecord) => {
      const util = cleanNum(r.CONT_UTILIZATION || r.CONT_UTILIZEDPER)
      if (util > 0) {
        totalUtilization += util
        utilizationCount++
      }
    })
    const avgUtilization = utilizationCount > 0 ? Math.round(totalUtilization / utilizationCount) : 0

    // Sea Freight Yield: Revenue per TEU for SEA shipments
    let seaRevenue = 0
    let seaTEU = 0
    uniqueRows.forEach((r: ShipmentRecord) => {
      if (r._mode === 'SEA' || r._mode === 'SEA-AIR') {
        seaRevenue += (r._financials?.revenue || 0)
        seaTEU += r._teu || 0
      }
    })
    const seaFreightYield = seaTEU > 0 ? Math.round(seaRevenue / seaTEU) : 0

    return {
      onTime: onTimePercent,
      exceptions: exceptions,
      utilization: avgUtilization,
      yield: seaFreightYield
    }
  }, [chartData])

  // --- INVOICE TOTALS ---
  const invoiceTotals = useMemo(() => {
    const uniqueJobs = new globalThis.Map<string, ShipmentRecord>()
    chartData.forEach((r, idx) => {
      const key = r.JOBNO ? String(r.JOBNO) : `__${idx}`
      if (!uniqueJobs.has(key)) uniqueJobs.set(key, r)
    })
    const uniqueRows = Array.from(uniqueJobs.values())

    let paid = 0
    let pending = 0
    let unpaid = 0

    uniqueRows.forEach((r: ShipmentRecord) => {
      const revenue = r._financials?.revenue || 0
      const status = (r.SHPTSTATUS || '').toUpperCase()
      const docRecd = getValidDate({ DOCRECD: r.DOCRECD })
      const approval = getValidDate({ APPROVAL: r.APPROVAL })

      // Simple logic: If approved and docs received, consider paid
      // If docs received but not approved, pending
      // Otherwise unpaid
      if (approval && docRecd && revenue > 0) {
        paid += revenue
      } else if (docRecd && revenue > 0) {
        pending += revenue
      } else if (revenue > 0) {
        unpaid += revenue
      }
    })

    return { paid, pending, unpaid }
  }, [chartData])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-slate-50">
      
      {/* 1. TOP NAVBAR */}
      <Navbar />

      {/* 2. FILTERS BAR */}
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800 sticky top-16 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Filter */}
            <Select value={selectedMode} onValueChange={(val) => {
              setSelectedMode(val); setDateRange({ from: undefined, to: undefined }); setSelectedClient("ALL");
            }}>
              <SelectTrigger className="h-9 text-sm w-[130px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800">
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
              <SelectTrigger className="h-9 text-sm w-[130px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800">
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
                    "h-9 text-sm w-[240px] justify-start text-left font-normal border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800",
                    !dateRange.from && "text-slate-500 dark:text-slate-400"
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

            {/* Provider Filter - Only show if there is more than 1 provider */}
            {allProviders.length > 1 && (
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-9 text-sm w-[180px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Providers</SelectItem>
                  {allProviders.map(provider => (
                    <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search shipments..." 
                className="pl-9 h-9 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-950"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Reset Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-red-200 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 hover:text-red-700 dark:text-red-400" 
                onClick={() => {
                  setSelectedMode("ALL")
                  setSelectedOffice("ALL")
                  setSelectedClient("ALL")
                  setSearchQuery("")
                  setDateRange({ from: undefined, to: undefined })
                }}
              >
                <FilterX className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" /> Reset
              </Button>

              {/* Export Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800" 
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 p-0"
                onClick={() => setShowSnow(!showSnow)}
              >
                <Snowflake className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showSnow && (
        <Snowfall
          style={{
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
          }}
          snowflakeCount={200}
        />
      )}

      {/* MAIN DASHBOARD CONTENT */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-5">

        {/* MAIN LAYOUT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5 items-stretch">
          
          {/* LEFT COLUMN (MAIN CONTENT) */}
          <div className="flex flex-col space-y-6 min-h-0">
            
            {/* SECTION 1: DELIVERIES (METRICS) */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* METRIC 1: TOTAL WEIGHT */}
                 <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-zinc-950">
                   <CardContent className="p-6">
                     <div className="flex items-center justify-between mb-3">
                       <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Weight</div>
                       <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                         <Box className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                       </div>
                     </div>
                     <div className="flex items-end justify-between mb-4">
                       <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{kpis.weight.toFixed(1)}</div>
                       <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mb-1">tons</div>
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

                {/* METRIC 2: TRANSIT PERFORMANCE */}
                 <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-zinc-950">
                   <CardContent className="p-6">
                     <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transit Performance</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                              View legs
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3" align="end">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Transit by leg (avg days)</div>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 dark:text-slate-400">Pickup → Arrival</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.legs.pickupToArrival.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 dark:text-slate-400">Pickup → Delivery</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.legs.pickupToDelivery.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 dark:text-slate-400">Departure → Arrival</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.legs.depToArrival.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600 dark:text-slate-400">Departure → Delivery</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.legs.depToDelivery.toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-slate-400">
                                On-time logic: <span className="font-medium text-slate-700 dark:text-slate-300">ATA ≤ ETA</span>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                     </div>
                     <div className="flex items-end justify-between mb-4">
                       <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{kpis.avgTransit.toFixed(1)}</div>
                       <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mb-1">days</div>
                     </div>
                     <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                       <span>MoM change</span>
                       {kpis.changes.depToArrival.hasMom ? (
                         <span className={cn(
                           "inline-flex items-center gap-1 font-medium tabular-nums",
                           kpis.changes.depToArrival.momDays > 0 ? "text-red-600 dark:text-red-400" : kpis.changes.depToArrival.momDays < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"
                         )}>
                           {kpis.changes.depToArrival.momDays > 0 ? <ArrowUpRight className="w-3 h-3" /> : kpis.changes.depToArrival.momDays < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                           {kpis.changes.depToArrival.momDays >= 0 ? "+" : ""}{kpis.changes.depToArrival.momDays.toFixed(1)}d
                         </span>
                       ) : (
                         <span className="font-medium text-slate-500 dark:text-slate-400">N/A</span>
                       )}
                     </div>
                     <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Fastest</span>
                          <span className="font-medium text-slate-900 dark:text-slate-50 tabular-nums">{kpis.minTransit > 0 ? `${kpis.minTransit} days` : "N/A"}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Slowest</span>
                          <span className="font-medium text-slate-900 dark:text-slate-50 tabular-nums">{kpis.maxTransit > 0 ? `${kpis.maxTransit} days` : "N/A"}</span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 {/* METRIC 3: TOTAL SHIPMENTS */}
                 <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-zinc-950">
                   <CardContent className="p-6">
                     <div className="flex items-center justify-between mb-3">
                       <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Shipments</div>
                       <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                         <Ship className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                       </div>
                     </div>
                     <div className="flex items-end justify-between mb-4">
                       <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{kpis.shipments.toLocaleString()}</div>
                       <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mb-1">files</div>
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
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-1 min-h-0 bg-white dark:bg-zinc-900">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Shipment Volume Analysis</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                      {(["weight", "teu", "cbm"] as const).map(key => (
                        <button 
                          key={key} 
                          className={cn("text-xs font-medium px-3 py-1.5 rounded-md transition-all", trendMetric === key ? "bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-50 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                          onClick={() => setTrendMetric(key)}
                        >
                          {metricConfig[key].label}
                        </button>
                      ))}
                   </div>
                   <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200" onClick={() => toggleDrilldown('shipment-volume')}>
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
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
                          backgroundColor: 'var(--color-card)', 
                          borderRadius: '12px', 
                          border: '1px solid var(--color-border)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: 'var(--color-card-foreground)'
                        }} 
                        itemStyle={{color: 'var(--color-foreground)', fontWeight: 600}}
                        cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ color: 'var(--color-muted-foreground)' }} />
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
                
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pending Invoices</span>
                  </div>
                   <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Expenses</span>
                  </div>


                   <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-slate-100" />
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Air Invoices Pending</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Vs previous period</span>
                    <button
                      aria-label="Toggle compare previous period"
                      onClick={() => setCompareEnabled(v => !v)}
                      className={cn(
                        "w-9 h-5 rounded-full relative transition-colors",
                        compareEnabled ? "bg-emerald-500" : "bg-slate-200 dark:bg-zinc-700"
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
                  <div className="mt-4 border border-slate-100 dark:border-zinc-800 rounded-lg p-4 bg-slate-50 dark:bg-zinc-950">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Monthly detail</div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Last 6 months</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {monthlyTrend.slice(-6).map(entry => (
                        <div key={entry.date} className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {entry.date.includes('-') 
                              ? format(new Date(entry.date + '-01'), 'MMM yyyy')
                              : entry.date.length === 6 
                                ? format(new Date(`${entry.date.substring(0, 4)}-${entry.date.substring(4, 6)}-01`), 'MMM yyyy')
                                : entry.date}
                          </div>
                          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatNumber(entry.val)}</div>
                          <div className="mt-2 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(entry.val / (monthlyTrend[monthlyTrend.length -1]?.val || 1) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* REPLACED SECTION: Tonnage by Origin (Was Mode & Costs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tonnage by Origin Chart */}
              <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Tonnage by Origin</CardTitle>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={originStats} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#64748b'}}
                        width={60}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'var(--color-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-card-foreground)'
                        }}
                        cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      />
                      <Bar dataKey="val" radius={[0, 4, 4, 0]} barSize={20}>
                        {originStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Lane Stats (Keep or repurpose "Costs by category" to just "Top Lanes") */}
              <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Top Lanes</CardTitle>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-6" />
                  
                  <div className="space-y-3">
                    {laneStats.slice(0, 7).map((lane, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-slate-800 dark:bg-slate-600" : idx === 2 ? "bg-yellow-400" : "bg-slate-300 dark:bg-zinc-700")} />
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{lane.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-50">{lane.weight.toFixed(1)}t</span>
                          <span className="text-slate-400 text-xs w-8 text-right">
                            {kpis.weight > 0 ? Math.round((lane.weight / kpis.weight) * 100) : 0}%
                          </span>
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
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-shrink-0 mb-2 bg-white dark:bg-zinc-900">
              <CardHeader className="pb-2.5">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">Quick Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 min-w-0">
                  <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold mb-1 truncate">On-Time</div>
                  <div className="flex items-end justify-between gap-1 min-w-0">
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
                      {hasData ? `${Math.round(kpis.onTimePct)}%` : "N/A"}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0">
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">ATA ≤ ETA</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(Math.max(kpis.onTimePct, 0), 100)}%` }} />
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 min-w-0">
                  <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold mb-1 truncate">Exceptions</div>
                  <div className="flex items-end justify-between gap-1 min-w-0">
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">{hasData ? quickSnapshot.exceptions : "N/A"}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0">
                      <ArrowDownRight className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">{hasData ? "Issues" : "N/A"}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${hasData && kpis.shipments > 0 ? Math.min((quickSnapshot.exceptions / kpis.shipments) * 100, 100) : 0}%` }} />
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 min-w-0">
                  <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold mb-1 truncate">Total Weight</div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">{hasData ? formatCompactNumber(kpis.weight) : "N/A"}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0">
                        <Box className="w-2.5 h-2.5" />
                        <span>Tons</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${hasData ? 75 : 0}%` }} />
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 min-w-0">
                  <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold mb-1 truncate">CO2 Emissions</div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">{hasData ? formatCompactNumber(kpis.co2) : "N/A"}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0">
                        <Leaf className="w-2.5 h-2.5" />
                        <span>Tons</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${hasData ? 70 : 0}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* REMOVED: INVOICES LIST */}
            {/* Replaced with: Recent Activity / Shipments (Simplified) */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 flex-1">
              <CardHeader className="pb-3 px-6">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Recent Shipments</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto min-h-0 max-h-[600px]">
                <div className="divide-y divide-slate-50 dark:divide-zinc-800">
                   {recentShipments.map((row, idx) => (
                     <div key={idx} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors flex items-center justify-between group" onClick={() => handleRowClick(row)}>
                        <div className="flex items-center gap-3">
                           <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", row._mode === "SEA" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600")}>
                             {row._mode === "SEA" ? <Ship className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                           </div>
                           <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">{row.CONNAME || "Unknown"}</div>
                              <div className="text-xs text-slate-500">{row.JOBNO}</div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{cleanNum(row.CONT_GRWT).toFixed(1)}t</div>
                           <div className="text-xs text-slate-500">{row.POL}</div>
                        </div>
                     </div>
                   ))}
                </div>
              </CardContent>
            </Card>

            {/* CO2 EMISSIONS OVERVIEW */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                   <Leaf className="w-4 h-4 text-emerald-500" /> CO2 Emissions Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={monthlyTrend}>
                     <defs>
                       <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => val.split('-')[1]} />
                     <Tooltip contentStyle={{ borderRadius: '8px' }} />
                     {/* Approximating CO2 trend based on volume trend for visual consistency until real CO2 data */}
                     <Area type="monotone" dataKey="val" name="Est. CO2 (Tons)" stroke="#10b981" fill="url(#co2Gradient)" />
                   </AreaChart>
                 </ResponsiveContainer>
                 <div className="text-center text-xs text-slate-500 -mt-3">Total estimated emissions based on shipment weight & distance</div>
              </CardContent>
            </Card>

          </div>

        </div>

        {/* COMPREHENSIVE KPI SECTIONS */}
        
        {/* SECTION 1: TRANSIT PERFORMANCE (OVERALL) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Transit Performance (ATD → ATA)</h2>
            {/* <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{kpis.transitShipmentCount} valid shipments</span> */}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* AVG TRANSIT */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Avg Transit</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.avgTransit.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">days</div>
              </CardContent>
            </Card>
            
            {/* MIN TRANSIT */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Fastest</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{kpis.minTransit > 0 ? kpis.minTransit : 'N/A'}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">days</div>
              </CardContent>
            </Card>
            
            {/* MAX TRANSIT */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Slowest</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{kpis.maxTransit > 0 ? kpis.maxTransit : 'N/A'}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">days</div>
              </CardContent>
            </Card>
            
            {/* MEDIAN TRANSIT */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Median</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.medianTransit.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">days</div>
              </CardContent>
            </Card>
            
            {/* STDDEV */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Std Dev</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.stddevTransit.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">days</div>
              </CardContent>
            </Card>
            
            {/* MOM CHANGE */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">MoM Change</div>
                {kpis.changes.depToArrival.hasMom ? (
                  <>
                    <div className={cn("text-2xl font-bold tabular-nums", kpis.changes.depToArrival.momDays > 0 ? "text-red-600 dark:text-red-400" : kpis.changes.depToArrival.momDays < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-50")}>
                      {kpis.changes.depToArrival.momDays >= 0 ? '+' : ''}{kpis.changes.depToArrival.momDays.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{kpis.changes.depToArrival.momPct.toFixed(1)}%</div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-slate-400 dark:text-slate-500">N/A</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: ON-TIME PERFORMANCE */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">On-Time Performance (ATA ≤ ETA)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ON-TIME SHIPMENTS */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">On-Time Shipments</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{kpis.onTimeShipments}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">shipments</div>
              </CardContent>
            </Card>
            
            {/* ON-TIME BASE */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">On-Time Base</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.onTimeBase}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">shipments</div>
              </CardContent>
            </Card>
            
            {/* ON-TIME % */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">On-Time %</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.onTimePct.toFixed(1)}%</div>
                <div className="mt-1.5 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(Math.max(kpis.onTimePct, 0), 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 3: TRANSIT LEGS - BAR CHART */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Transit by Leg</h2>
          <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Average Transit Days by Journey Leg</CardTitle>
            </CardHeader>
            <CardContent className="p-6 min-h-0">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { 
                        leg: 'Pickup → Arrival', 
                        days: kpis.legs.pickupToArrival,
                        mom: kpis.changes.pickupToArrival.hasMom ? kpis.changes.pickupToArrival.momDays : 0,
                        momPct: kpis.changes.pickupToArrival.hasMom ? kpis.changes.pickupToArrival.momPct : 0,
                      },
                      { 
                        leg: 'Pickup → Delivery', 
                        days: kpis.legs.pickupToDelivery,
                        mom: kpis.changes.pickupToDelivery.hasMom ? kpis.changes.pickupToDelivery.momDays : 0,
                        momPct: kpis.changes.pickupToDelivery.hasMom ? kpis.changes.pickupToDelivery.momPct : 0,
                      },
                      { 
                        leg: 'Departure → Arrival', 
                        days: kpis.legs.depToArrival,
                        mom: kpis.changes.depToArrival.hasMom ? kpis.changes.depToArrival.momDays : 0,
                        momPct: kpis.changes.depToArrival.hasMom ? kpis.changes.depToArrival.momPct : 0,
                      },
                      { 
                        leg: 'Departure → Delivery', 
                        days: kpis.legs.depToDelivery,
                        mom: kpis.changes.depToDelivery.hasMom ? kpis.changes.depToDelivery.momDays : 0,
                        momPct: kpis.changes.depToDelivery.hasMom ? kpis.changes.depToDelivery.momPct : 0,
                      },
                    ]}
                    margin={{ top: 40, right: 30, bottom: 80, left: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                    <XAxis 
                      dataKey="leg" 
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 12, fill: '#64748b'}}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 12, fill: '#64748b'}}
                      dx={-10}
                      label={{ value: 'Transit Days', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12, fontWeight: 600 } }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-card)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        color: 'var(--color-card-foreground)'
                      }}
                      itemStyle={{color: 'var(--color-foreground)', fontWeight: 600}}
                      cursor={false}
                      formatter={(value: any, name: any, props: any) => {
                        const data = props.payload
                        return [
                          <div key="content" className="space-y-1">
                            <div className="font-semibold tabular-nums">{value.toFixed(1)} days</div>
                            {data.mom !== 0 && (
                              <div className={cn("text-xs tabular-nums flex items-center gap-1", data.mom > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                                {data.mom > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                MoM: {data.mom >= 0 ? '+' : ''}{data.mom.toFixed(1)}d ({data.momPct.toFixed(1)}%)
                              </div>
                            )}
                          </div>
                        ]
                      }}
                      labelFormatter={(label) => label}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ color: 'var(--color-muted-foreground)', paddingBottom: '10px' }}
                      payload={[
                        { value: 'Pickup → Arrival', type: 'circle', color: '#3b82f6' },
                        { value: 'Pickup → Delivery', type: 'circle', color: '#8b5cf6' },
                        { value: 'Departure → Arrival', type: 'circle', color: '#10b981' },
                        { value: 'Departure → Delivery', type: 'circle', color: '#f59e0b' },
                      ]}
                    />
                    <Bar dataKey="days" radius={[8, 8, 0, 0]} maxBarSize={80}>
                      {[
                        { color: '#3b82f6' },
                        { color: '#8b5cf6' },
                        { color: '#10b981' },
                        { color: '#f59e0b' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 4: LINER PERFORMANCE */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Liner Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* BEST LINER */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Best Liner (Min Avg TT)</div>
                {kpis.liner.bestLiner ? (
                  <>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">{kpis.liner.bestLiner.liner}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.liner.bestLiner.avgTransit.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{kpis.liner.bestLiner.shipments} shipments</div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-slate-400 dark:text-slate-500">N/A</div>
                )}
              </CardContent>
            </Card>
            
            {/* WORST LINER */}
            <Card className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">Worst Liner (Max Avg TT)</div>
                {kpis.liner.worstLiner ? (
                  <>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400 truncate">{kpis.liner.worstLiner.liner}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{kpis.liner.worstLiner.avgTransit.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{kpis.liner.worstLiner.shipments} shipments</div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-slate-400 dark:text-slate-500">N/A</div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* LINER BAR CHART */}
          <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Top Liners by Average Transit Time</CardTitle>
            </CardHeader>
            <CardContent className="p-6 min-h-0">
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpis.liner.topLiners.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 20, right: 30, bottom: 20, left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                    <XAxis 
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 12, fill: '#64748b'}}
                      label={{ value: 'Average Transit Days', position: 'insideBottom', offset: -10, style: { fill: '#64748b', fontSize: 12, fontWeight: 600 } }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="liner"
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 12, fill: '#64748b'}}
                      width={90}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-card)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        color: 'var(--color-card-foreground)'
                      }}
                      itemStyle={{color: 'var(--color-foreground)', fontWeight: 600}}
                      cursor={false}
                      formatter={(value: any, name: any, props: any) => {
                        const data = props.payload
                        return [
                          <div key="content" className="space-y-1">
                            <div className="font-semibold tabular-nums">{value.toFixed(1)} days avg</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">{data.shipments} shipments</div>
                          </div>,
                          'Transit Time'
                        ]
                      }}
                      labelFormatter={(label) => label}
                    />
                    <Bar dataKey="avgTransit" radius={[0, 8, 8, 0]} maxBarSize={40}>
                      {kpis.liner.topLiners.slice(0, 8).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#10b981' : index === kpis.liner.topLiners.slice(0, 8).length - 1 ? '#ef4444' : '#3b82f6'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

                {/* MODE INSIGHTS WIDE CARD */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4" /> Mode insights
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Distribution, trends, and top lanes</CardDescription>
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
                            backgroundColor: 'var(--color-card)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            color: 'var(--color-card-foreground)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={modeMonthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
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
                            backgroundColor: 'var(--color-card)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            color: 'var(--color-card-foreground)'
                          }}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend wrapperStyle={{ color: 'var(--color-muted-foreground)' }} />
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
                    <div key={`mode-summary-${stat.name}`} className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{stat.name}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {stat.value} ({Math.round((stat.value / Math.max(totalModes, 1)) * 100)}%)
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Top lanes by weight</div>
                    <div className="space-y-2 text-sm">
                      {laneStats.slice(0, 5).map((lane, idx) => (
                        <div key={`lane-wide-${idx}`} className="flex items-center justify-between">
                          <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{lane.name}</span>
                          <span className="text-slate-900 dark:text-slate-100 font-semibold">{lane.weight}t</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Container Status</div>
                    <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                        {statusStats.slice(0, 3).map((s, i) => (
                            <div key={s.name} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {s.name}
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
                "shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all bg-white dark:bg-zinc-900",
                hoveredChart === 'carriers' && "shadow-lg border-slate-300 dark:border-zinc-700"
              )}
              onMouseEnter={() => setHoveredChart('carriers')}
              onMouseLeave={() => setHoveredChart(null)}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Ship className="w-4 h-4" /> Top Carriers
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200" onClick={() => toggleDrilldown('carriers')}>
                    {drilldowns['carriers'] ? 'Hide drilldown' : 'Show drilldown'}
                  </Button>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={carrierStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
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
                          backgroundColor: 'var(--color-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: 'var(--color-card-foreground)'
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
                  <div className="mt-4 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-4">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Carrier detail</div>
                    <div className="grid grid-cols-2 gap-3">
                      {carrierStats.slice(0, 6).map((carrier, idx) => (
                        <div key={carrier.name} className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{carrier.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{carrier.value} loads</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
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
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-zinc-900">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Top Clients by Volume
                </CardTitle>
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientStats.map((client, idx) => (
                    <div key={client.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{client.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{client.shipments} shipments</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{client.tons.toFixed(1)} tons</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Total weight</div>
                        </div>
                        <div className="w-24 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
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

            {/* MAP SECTION - Renamed to Shipment Routing */}
             <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-zinc-900">
                <CardHeader className="pb-0 pt-4 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2"><MapPin className="w-4 h-4" /> Shipment Routing</CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">Full Screen</Button>
                </CardHeader>
                <CardContent className="p-0 h-[300px]">
                   {mapMarkers.length > 0 ? (
                      <Map markers={mapMarkers} height="300px" />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-400">No map data</div>
                    )}
                </CardContent>
             </Card>

          </main>

      {/* Shipment Detail Drawer */}
      <ShipmentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={selectedRecord}
      />

      {/* Footer */}
      <Footer />
    </div>
    
  )
}

// --- SUB-COMPONENTS ---
function KPICard({ title, value, unit, sub, icon }: any) {
  return (
    <Card className="shadow-sm border-l-4 border-l-slate-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium text-slate-500 uppercase">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value} <span className="text-sm font-normal text-slate-400">{unit}</span></div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children }: any) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </CardContent>
    </Card>
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