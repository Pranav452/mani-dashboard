'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, isWithinInterval, parse, isValid, startOfDay, endOfDay } from "date-fns"
import { Calendar as CalendarIcon, FilterX, Ship, Box, Anchor, Layers, Container } from "lucide-react"
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

export default function Dashboard({ data }: { data: any[] }) {
  const [selectedMode, setSelectedMode] = useState<string>("ALL")
  const [selectedClient, setSelectedClient] = useState<string>("ALL")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })

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

  // --- 3. FILTER DATA ---
  const chartData = useMemo(() => {
    return parsedData.filter(row => {
      // Filter by Computed Mode
      if (selectedMode !== "ALL" && row._mode !== selectedMode) return false
      
      if (dateRange.from && dateRange.to) {
        if (!row._date) return false 
        if (!isWithinInterval(row._date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false
      }
      
      if (selectedClient !== "ALL" && row.CONNAME !== selectedClient) return false
      
      return true
    })
  }, [parsedData, selectedMode, selectedClient, dateRange])

  // --- 4. STATS ---
  const kpis = useMemo(() => ({
      shipments: chartData.length,
      weight: chartData.reduce((sum, r) => sum + cleanNum(r.CONT_GRWT), 0),
      teu: chartData.reduce((sum, r) => sum + cleanNum(r.CONT_TEU), 0),
      cbm: chartData.reduce((sum, r) => sum + cleanNum(r.CONT_CBM), 0)
  }), [chartData])

  const monthlyWeight = useMemo(() => {
    const stats: Record<string, number> = {}
    chartData.forEach(row => {
      if (!row._date) return
      const key = format(row._date, 'yyyy-MM')
      stats[key] = (stats[key] || 0) + cleanNum(row.CONT_GRWT)
    })
    return Object.entries(stats)
      .map(([date, val]) => ({ date, val: Math.round(val / 1000) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [chartData])

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

  const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea']

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      
      {/* HEADER & FILTERS */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20">
        <div className="flex gap-3 items-center flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-2 mr-4 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
             <Ship className="text-blue-600" size={18} />
             <span className="font-bold text-blue-900">LogisticsAI</span>
          </div>

          {/* MODE */}
          <Select value={selectedMode} onValueChange={(val) => {
            setSelectedMode(val); setDateRange({ from: undefined, to: undefined }); setSelectedClient("ALL");
          }}>
            <SelectTrigger className="w-[140px] font-medium border-slate-200"><SelectValue placeholder="Mode" /></SelectTrigger>
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
              <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal border-slate-200", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}
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
            <SelectTrigger className="w-[220px] font-medium border-slate-200"><SelectValue placeholder="Select Provider" /></SelectTrigger>
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

        <Button variant="ghost" onClick={() => { setSelectedMode("ALL"); setSelectedClient("ALL"); setDateRange({ from: undefined, to: undefined }) }} className="text-red-500 hover:bg-red-50 hover:text-red-600">
          <FilterX className="w-4 h-4 mr-2" /> Reset
        </Button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-slate-500">Total Shipments</CardTitle><Box className="w-4 h-4 text-blue-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-900">{kpis.shipments}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-slate-500">Gross Weight</CardTitle><Anchor className="w-4 h-4 text-emerald-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(kpis.weight / 1000).toFixed(1)} <span className="text-sm font-normal text-slate-400">Tons</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-slate-500">Total TEUs</CardTitle><Container className="w-4 h-4 text-orange-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.teu.toFixed(1)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-slate-500">Total CBM</CardTitle><Layers className="w-4 h-4 text-purple-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.cbm.toFixed(1)}</div></CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <Card className="col-span-1 md:col-span-2 shadow-sm">
          <CardHeader><CardTitle>Volume Trend</CardTitle><CardDescription>Weight over time</CardDescription></CardHeader>
          <CardContent className="h-[300px]">
             {monthlyWeight.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyWeight}>
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
        <Card className="col-span-1 shadow-sm">
          <CardHeader><CardTitle>Mode Split</CardTitle><CardDescription>By count</CardDescription></CardHeader>
          <CardContent className="h-[300px] relative">
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
        <Card className="col-span-1 md:col-span-2 shadow-sm">
          <CardHeader><CardTitle>Top Origins</CardTitle><CardDescription>By Weight</CardDescription></CardHeader>
          <CardContent className="h-[300px]">
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
        <Card className="col-span-1 shadow-sm">
          <CardHeader><CardTitle>Top Carriers</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
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
      </div>
    </div>
  )
}