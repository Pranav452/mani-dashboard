'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Leaf, Activity, DollarSign, Trees, Ship, Plane, MapPin, BarChart3 } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { RadialBarChart, RadialBar, PolarGrid, BarChart, Bar, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface EnvironmentalDashboardProps {
  co2Summary: any[]
  monthlyCO2: any[]
  originCO2: any[]
  routeCO2: any[]
  clientCO2: any[]
  statusCO2: any[]
  topCO2Shipments: any[]
  rawShipments: any[]
  applyFilters: (filters: any) => Promise<void>
}

export default function EnvironmentalDashboard({
  co2Summary,
  monthlyCO2,
  originCO2,
  routeCO2,
  clientCO2,
  statusCO2,
  topCO2Shipments,
  rawShipments,
  applyFilters,
}: EnvironmentalDashboardProps) {
  const { data: session } = useSession()
  const clientName = (session?.user as any)?.name || 'Client'

  const [filterMode, setFilterMode] = useState<string>('ALL')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [listPage, setListPage] = useState(0)

  const {
    totalCO2Tonnes,
    totalCO2KG,
    totalWeight,
    totalShipments,
    offsetCost,
    treesToOffset,
    seaMode,
    airMode,
    monthlyChartData,
    radialData,
  } = useMemo(() => {
    const totalCO2KG = co2Summary.reduce((s, r) => s + (r.Total_CO2_KG || 0), 0)
    const totalCO2Tonnes = co2Summary.reduce((s, r) => s + (r.Total_CO2_Tonnes || 0), 0)
    const totalWeight = co2Summary.reduce((s, r) => s + (r.Total_CO2_KG / Math.max(r.CO2_Per_KG_Shipped || 1, 0.0001)), 0)
    const totalShipments = co2Summary.reduce((s, r) => s + (r.Total_Shipments || 0), 0)
    const offsetCost = Math.round(totalCO2Tonnes * 25)
    const treesToOffset = clientCO2.reduce((s, r) => s + (r.Trees_To_Offset || 0), 0)

    const seaMode = co2Summary.find(r => r.MODE === 'SEA')
    const airMode = co2Summary.find(r => r.MODE === 'AIR')
    const seaAirMode = co2Summary.find(r => r.MODE === 'SEA-AIR')

    // Build monthly chart: pivot monthlyCO2 rows into {month, SEA, AIR, 'SEA-AIR'} objects
    const monthMap: Record<string, any> = {}
    monthlyCO2.forEach(r => {
      const key = String(r.Month)
      if (!monthMap[key]) monthMap[key] = { month: key, SEA: 0, AIR: 0, 'SEA-AIR': 0 }
      monthMap[key][r.MODE] = (monthMap[key][r.MODE] || 0) + (r.Total_CO2_Tonnes || 0)
    })
    const monthlyChartData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))

    const radialData = co2Summary.map(r => ({
      name: r.MODE,
      value: Math.round(r.Total_CO2_Tonnes || 0),
      fill: r.MODE === 'AIR' ? '#ef4444' : r.MODE === 'SEA' ? '#10b981' : '#f59e0b',
    }))

    return { totalCO2Tonnes, totalCO2KG, totalWeight, totalShipments, offsetCost, treesToOffset, seaMode, airMode, monthlyChartData, radialData }
  }, [co2Summary, monthlyCO2, clientCO2])

  const hasData = co2Summary.length > 0

  // --- KPI CARDS ---
  const kpiSection = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Total CO₂ Emissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {hasData ? totalCO2Tonnes.toFixed(1) : '—'}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Tonnes CO₂</div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Carbon Intensity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {hasData
              ? (co2Summary[0]?.CO2_Per_KG_Shipped
                  ? (co2Summary.reduce((s, r) => s + (r.CO2_Per_KG_Shipped || 0), 0) / co2Summary.length * 1000).toFixed(2)
                  : '—')
              : '—'}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">g CO₂ / kg shipped</div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Carbon Offset Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {hasData ? `$${offsetCost.toLocaleString()}` : '—'}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Est. at $25/tonne</div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" /> Trees to Offset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {hasData ? treesToOffset.toLocaleString() : '—'}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">@ 21 kg CO₂/tree/yr</div>
        </CardContent>
      </Card>
    </div>
  )

  // --- MODE BREAKDOWN CARDS ---
  const modeSection = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {co2Summary.map(r => (
        <Card key={r.MODE} className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
              {r.MODE === 'AIR' ? <Plane className="w-4 h-4 text-red-500" /> : <Ship className="w-4 h-4 text-emerald-500" />}
              {r.MODE} Freight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{Number(r.Total_CO2_Tonnes).toFixed(1)} t CO₂</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{r.Total_Shipments} shipments</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Avg {Number(r.Avg_CO2_Per_Order_KG).toFixed(1)} kg CO₂/order</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // --- CHARTS: Radial + Monthly Trend ---
  const chartsSection = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Leaf className="w-4 h-4" /> CO₂ by Transport Mode
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Total emissions in tonnes</CardDescription>
        </CardHeader>
        <CardContent>
          {radialData.length > 0 ? (
            <ChartContainer
              config={{
                SEA: { label: "Sea", color: "#10b981" },
                AIR: { label: "Air", color: "#ef4444" },
                'SEA-AIR': { label: "Sea-Air", color: "#f59e0b" },
              }}
              className="h-[280px]"
            >
              <RadialBarChart
                data={radialData}
                innerRadius="20%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
              >
                <PolarGrid gridType="circle" stroke="#e2e8f0" />
                <RadialBar
                  dataKey="value"
                  background={{ fill: '#f1f5f9' }}
                  cornerRadius={4}
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 10, fontWeight: 600 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
              </RadialBarChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No CO₂ data available</div>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {radialData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-slate-600 dark:text-slate-400">{d.name} ({d.value.toLocaleString()} t)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Monthly CO₂ Trend
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">CO₂ tonnes per month by mode</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length > 0 ? (
            <ChartContainer
              config={{
                SEA: { label: "Sea", color: "#10b981" },
                AIR: { label: "Air", color: "#ef4444" },
                'SEA-AIR': { label: "Sea-Air", color: "#f59e0b" },
              }}
              className="h-[280px] w-full"
            >
              <AreaChart data={monthlyChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} className="stroke-slate-200 dark:stroke-zinc-800" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={v => String(v).slice(4)} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={v => `${v}t`} stroke="var(--color-muted-foreground)" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <defs>
                  <linearGradient id="fillSea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillAir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillSeaAir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area dataKey="SEA" type="natural" fill="url(#fillSea)" stroke="#10b981" fillOpacity={0.4} stackId="a" />
                <Area dataKey="AIR" type="natural" fill="url(#fillAir)" stroke="#ef4444" fillOpacity={0.4} stackId="a" />
                <Area dataKey="SEA-AIR" type="natural" fill="url(#fillSeaAir)" stroke="#f59e0b" fillOpacity={0.4} stackId="a" />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No monthly data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // --- CLIENT CO2 FOOTPRINT ---
  const clientSection = (
    <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Client CO₂ Footprint
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">Total emissions per client (tonnes)</CardDescription>
      </CardHeader>
      <CardContent>
        {clientCO2.length > 0 ? (
          <ChartContainer
            config={{ Total_CO2_Tonnes: { label: "CO₂ Tonnes", color: "#10b981" } }}
            className="h-[350px] w-full"
          >
            <BarChart data={clientCO2.slice(0, 15)} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} className="stroke-slate-200 dark:stroke-zinc-800" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={v => `${v}t`} stroke="var(--color-muted-foreground)" />
              <YAxis type="category" dataKey="Client_Name" tickLine={false} axisLine={false} width={120} tick={{ fontSize: 11, fill: '#64748b' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="Total_CO2_Tonnes" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm">No client data available</div>
        )}
      </CardContent>
    </Card>
  )

  // --- ROUTE CO2 ---
  const routeSection = (
    <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Route CO₂ Emissions
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">Top trade lanes by carbon footprint</CardDescription>
      </CardHeader>
      <CardContent>
        {routeCO2.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Route</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Mode</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Shipments</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">CO₂ (t)</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Avg CO₂/order (kg)</th>
                </tr>
              </thead>
              <tbody>
                {routeCO2.slice(0, 15).map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">{r.Route}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{r.MODE}</td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{r.Total_Shipments}</td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900 dark:text-slate-100">{Number(r.Total_CO2_Tonnes).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{Number(r.Avg_CO2_Per_Order_KG).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No route data available</div>
        )}
      </CardContent>
    </Card>
  )

  // --- TOP 10 HIGH EMISSION SHIPMENTS ---
  const topShipmentsSection = (
    <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-slate-50">Top 10 High-Emission Shipments</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">Shipments flagged for review based on CO₂ output</CardDescription>
      </CardHeader>
      <CardContent>
        {topCO2Shipments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">MP Ref No</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Order No</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Client</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Mode</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Route</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Weight (kg)</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">CO₂ (kg)</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">ATD</th>
                </tr>
              </thead>
              <tbody>
                {topCO2Shipments.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="py-2 px-2 font-mono text-xs text-slate-700 dark:text-slate-300">{r.JOBNO}</td>
                    <td className="py-2 px-2 font-mono text-xs text-slate-600 dark:text-slate-400">{r.ORDERNO || '—'}</td>
                    <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{r.CONNAME}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{r.MODE}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{r.POL} → {r.POD}</td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{Number(r.Weight_KG).toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-semibold text-red-600 dark:text-red-400">{Number(r.CO2_KG).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">{r.ATD_Date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No shipment data available</div>
        )}
      </CardContent>
    </Card>
  )

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={filterMode} onValueChange={setFilterMode}>
        <SelectTrigger className="h-9 text-sm w-[140px]">
          <SelectValue placeholder="All Modes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Modes</SelectItem>
          <SelectItem value="SEA">Sea</SelectItem>
          <SelectItem value="AIR">Air</SelectItem>
          <SelectItem value="SEA-AIR">Sea-Air</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="date"
        className="h-9 text-sm w-[150px]"
        value={filterDateFrom}
        onChange={e => setFilterDateFrom(e.target.value)}
        placeholder="Date from"
      />
      <Input
        type="date"
        className="h-9 text-sm w-[150px]"
        value={filterDateTo}
        onChange={e => setFilterDateTo(e.target.value)}
        placeholder="Date to"
      />
      <Button
        size="sm"
        className="h-9"
        onClick={() => {
          applyFilters({
            mode: (filterMode && filterMode !== 'ALL') ? filterMode : null,
            dateFrom: filterDateFrom ? filterDateFrom.replace(/-/g, '') : null,
            dateTo: filterDateTo ? filterDateTo.replace(/-/g, '') : null,
          })
        }}
      >
        Apply Filters
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => {
          setFilterMode('ALL')
          setFilterDateFrom('')
          setFilterDateTo('')
          applyFilters({ mode: null, dateFrom: null, dateTo: null })
        }}
      >
        Reset
      </Button>
    </div>
  )

  const co2Shipments = rawShipments.filter(r => (r.CO2_ORDER || 0) > 0).sort((a, b) => (b.CO2_ORDER || 0) - (a.CO2_ORDER || 0))
  const pageSize = 20
  const totalPages = Math.ceil(co2Shipments.length / pageSize)
  const pagedShipments = co2Shipments.slice(listPage * pageSize, (listPage + 1) * pageSize)

  const listSection = (
    <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
      <CardContent className="p-0">
        {co2Shipments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800">
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Order No</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">MP Ref No</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Client</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Mode</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">POL</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">POD</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Weight (kg)</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">CO₂ (kg)</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">CO₂ (t)</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">ATD</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedShipments.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                      <td className="py-2 px-2 font-mono text-xs text-slate-700 dark:text-slate-300">{r.ORDERNO}</td>
                      <td className="py-2 px-2 font-mono text-xs text-slate-600 dark:text-slate-400">{r.JOBNO}</td>
                      <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{r.CONNAME}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{r.MODE}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{r.POL}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{r.POD}</td>
                      <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{Number(r.ORD_GRWT || 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-semibold text-red-600 dark:text-red-400">{Number(r.CO2_ORDER || 0).toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{(Number(r.CO2_ORDER || 0) / 1000).toFixed(3)}</td>
                      <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">{r.ATD ? new Date(r.ATD).toLocaleDateString('en-GB') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-xs text-slate-500">Page {listPage + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={listPage === 0} onClick={() => setListPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={listPage >= totalPages - 1} onClick={() => setListPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No CO₂ shipment data available</div>
        )}
      </CardContent>
    </Card>
  )

  const sections = [
    { title: "Filters", subtitle: "Re-fetch data with filters applied at source", content: filterBar },
    { title: "Environmental KPIs", subtitle: "Key sustainability indicators from shipment data", content: kpiSection },
    { title: "Mode Breakdown", subtitle: "CO₂ emissions by transport mode", content: modeSection },
    { title: "Analysis", subtitle: "CO₂ by mode and monthly trend", content: chartsSection },
    { title: "Client Footprint", subtitle: "CO₂ emissions per client", content: clientSection },
    { title: "Route Emissions", subtitle: "Trade lane carbon footprint", content: routeSection },
    { title: "High-Emission Shipments", subtitle: "Flagged for review", content: topShipmentsSection },
    { title: `CO₂ Shipment Detail (${co2Shipments.length} shipments)`, subtitle: "Individual shipment CO₂ breakdown sorted by highest emitter", content: listSection },
  ]

  return (
    <PremiumPageShell
      title="Environmental Impact"
      description="Carbon footprint and sustainability metrics from live shipment data."
      sections={sections}
      active="customers"
      columns={1}
      filters={null}
    />
  )
}
