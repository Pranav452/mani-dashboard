"use client"

import { useMemo } from "react"
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, ArrowUpRight, ArrowDownRight, CalendarClock, BarChart3, Users, Ship, MapPin, Clock } from "lucide-react"
import { ComingSoonTooltip } from "@/components/ui/tooltip"
import { format, isWithinInterval, parse, isValid, startOfDay, endOfDay, subDays } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

// Helper functions
const cleanNum = (val: any) => {
  if (typeof val === 'number') return val
  if (!val) return 0
  const str = String(val).replace(/,/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

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

const getComputedMode = (row: any) => {
  const isDiffAir = String(row.ISDIFFAIR);
  if (isDiffAir === '2' || isDiffAir === 'YES' || isDiffAir === '1') {
    return 'SEA-AIR';
  }
  return row.MODE || 'Unknown';
}

type ShipmentRecord = {
  [key: string]: any;
  _date?: Date | null;
  _mode?: string;
}

function ReportTile({ title, badge, trend, positive }: { title: string; badge: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = trend === "-" ? "text-slate-400" : positive ? "text-emerald-600" : "text-amber-600"

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{badge}</span>
        <span className={`text-xs flex items-center gap-1 ${trendColor}`}>
          {trend === "-" ? "Pending" : <><TrendIcon className="w-3 h-3" /> {trend}</>}
        </span>
      </CardContent>
    </Card>
  )
}

function HeroTile({ label, value, trend, positive }: { label: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = trend === "-" ? "text-slate-200" : positive ? "text-emerald-200" : "text-amber-200"

  return (
    <div className="rounded-lg bg-white/10 border border-white/10 p-3">
      <div className="text-xs uppercase text-indigo-100">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${trendColor}`}>
        {trend === "-" ? "Pending" : <><TrendIcon className="w-3 h-3" /> {trend}</>}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState<ShipmentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.warn("Supabase env vars missing. Returning empty data set.")
          setData([])
          return
        }

        const { supabase } = await import('@/lib/supabase')

        let allRows: any[] = []
        let from = 0
        const batchSize = 1000
        let keepFetching = true

        while (keepFetching) {
          const to = from + batchSize - 1

          try {
            const { data: batchData, error } = await supabase
              .from('shipments')
              .select('*')
              .range(from, to)

            if (error) {
              console.error('Fetch Error:', error)
              break
            }

            if (batchData && batchData.length > 0) {
              allRows = [...allRows, ...batchData]
              from += batchSize

              if (batchData.length < batchSize) {
                keepFetching = false
              }
            } else {
              keepFetching = false
            }
          } catch (err) {
            console.error("Fetch Error: Unexpected failure", err)
            break
          }
        }

        // Normalize to Uppercase
        const normalizedData = allRows.map(row => {
          const newRow: any = {}
          Object.keys(row).forEach(key => {
            newRow[key.toUpperCase()] = row[key]
          })
          return newRow
        })

        setData(normalizedData)
      } catch (error) {
        console.error('Error fetching reports data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process data
  const parsedData = useMemo<ShipmentRecord[]>(() => {
    return data.map(row => ({
      ...row,
      _date: getValidDate(row),
      _mode: getComputedMode(row)
    }))
  }, [data])

  // Real report calculations
  const monthlyShipments = useMemo(() => {
    const stats: Record<string, number> = {}
    parsedData.forEach(row => {
      if (row._date) {
        const month = format(row._date, 'yyyy-MM')
        stats[month] = (stats[month] || 0) + 1
      }
    })
    return Object.entries(stats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month: format(new Date(month + '-01'), 'MMM yyyy'), count }))
      .slice(-6) // Last 6 months
  }, [parsedData])

  const clientPerformance = useMemo(() => {
    const stats: Record<string, { shipments: number; tons: number; onTimeCount: number; total: number }> = {}

    parsedData.forEach(row => {
      const client = row.CONNAME || "Unknown"
      if (!stats[client]) {
        stats[client] = { shipments: 0, tons: 0, onTimeCount: 0, total: 0 }
      }
      stats[client].shipments++
      stats[client].tons += cleanNum(row.CONT_GRWT) / 1000

      // On-time calculation
      const ata = getValidDate({ ATA: row.ATA })
      const eta = getValidDate({ ETA: row.ETA })
      if (ata && eta) {
        stats[client].total++
        if (ata <= eta) stats[client].onTimeCount++
      }
    })

    return Object.entries(stats)
      .map(([client, data]) => ({
        client,
        shipments: data.shipments,
        tons: Math.round(data.tons * 10) / 10,
        onTimeRate: data.total > 0 ? Math.round((data.onTimeCount / data.total) * 100) : 0
      }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 8)
  }, [parsedData])

  const modeDistribution = useMemo(() => {
    const stats: Record<string, number> = {}
    parsedData.forEach(row => {
      const mode = row._mode || "Unknown"
      stats[mode] = (stats[mode] || 0) + 1
    })
    return Object.entries(stats).map(([mode, count]) => ({ mode, count }))
  }, [parsedData])

  const officePerformance = useMemo(() => {
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

    const stats: Record<string, { shipments: number; clients: Set<string> }> = {}
    parsedData.forEach(row => {
      const office = getOffice(row.POL)
      if (!stats[office]) {
        stats[office] = { shipments: 0, clients: new Set() }
      }
      stats[office].shipments++
      if (row.CONNAME) stats[office].clients.add(row.CONNAME)
    })

    return Object.entries(stats)
      .map(([office, data]) => ({
        office,
        shipments: data.shipments,
        clients: data.clients.size
      }))
      .sort((a, b) => b.shipments - a.shipments)
  }, [parsedData])

  const transitTimeReport = useMemo(() => {
    const parseDate = (dateStr: any) => {
      if (!dateStr) return null
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        return parse(dateStr, 'dd-MM-yyyy', new Date())
      }
      return null
    }

    const legs = { pickupToArrival: [] as number[], pickupToDelivery: [] as number[], departureToArrival: [] as number[], departureToDelivery: [] as number[] }

    parsedData.forEach(row => {
      const cargoRecpt = parseDate(row.CARGORECPT)
      const atd = parseDate(row.ATD)
      const ata = parseDate(row.ATA)
      const delivery = parseDate(row.DELIVERY)

      if (cargoRecpt && ata && isValid(cargoRecpt) && isValid(ata) && ata >= cargoRecpt) {
        const days = Math.round((ata.getTime() - cargoRecpt.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0 && days < 150) legs.pickupToArrival.push(days)
      }

      if (cargoRecpt && delivery && isValid(cargoRecpt) && isValid(delivery) && delivery >= cargoRecpt) {
        const days = Math.round((delivery.getTime() - cargoRecpt.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0 && days < 150) legs.pickupToDelivery.push(days)
      }

      if (atd && ata && isValid(atd) && isValid(ata) && ata >= atd) {
        const days = Math.round((ata.getTime() - atd.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0 && days < 150) legs.departureToArrival.push(days)
      }

      if (atd && delivery && isValid(atd) && isValid(delivery) && delivery >= atd) {
        const days = Math.round((delivery.getTime() - atd.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0 && days < 150) legs.departureToDelivery.push(days)
      }
    })

    const calculateStats = (arr: number[]) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0, median: 0, count: 0 }
      const sorted = [...arr].sort((a, b) => a - b)
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]

      return { avg: Math.round(avg * 10) / 10, min, max, median, count: arr.length }
    }

    return {
      pickupToArrival: calculateStats(legs.pickupToArrival),
      pickupToDelivery: calculateStats(legs.pickupToDelivery),
      departureToArrival: calculateStats(legs.departureToArrival),
      departureToDelivery: calculateStats(legs.departureToDelivery)
    }
  }, [parsedData])

  const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea']
  const totalShipments = parsedData.length
  const totalClients = clientPerformance.length
  const activeReports = 4

  const reportSections = [
    {
      title: "Operational Reports",
      subtitle: "Real-time shipment analytics from database",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <ReportTile title="Monthly Shipments" badge="Live" trend={`${monthlyShipments.length} months`} positive />
          <ComingSoonTooltip message="Profitability analysis requires revenue and cost data from accounting system. Current schema only contains shipment volumes.">
            <div className="cursor-help">
              <ReportTile title="Lane Profitability" badge="N/A" trend="-" />
            </div>
          </ComingSoonTooltip>
          <ReportTile title="Client Performance" badge="Live" trend={`${clientPerformance.length} clients`} positive />
          <ReportTile title="Mode Distribution" badge="Live" trend={`${modeDistribution.length} modes`} positive />
        </div>
      )
    },
    {
      title: "Report Exports",
      subtitle: "Automated report generation and scheduling",
      content: (
        <div className="space-y-2">
          {[
            { name: "Monthly Operations Summary", schedule: "1st of month", status: "Active" },
            { name: "Client Performance Report", schedule: "Weekly", status: "Active" },
            { name: "Transit Time Analysis", schedule: "Daily", status: "Active" },
            { name: "Office Performance Report", schedule: "Monthly", status: "Active" }
          ].map((item, idx) => (
            <div key={item.name} className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{item.name}</div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500">{item.schedule}</div>
                <div className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  const hero = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-indigo-700 text-white p-5 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-indigo-100">
          <BarChart3 className="w-4 h-4" /> Analytics reports
        </div>
        <div className="text-2xl font-semibold">Real shipment insights</div>
        <p className="text-sm text-indigo-100 max-w-sm">Automated reports with live data from your shipment database.</p>
        <Button size="sm" variant="secondary" className="text-slate-900">Export data</Button>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Total shipments" value={totalShipments.toLocaleString()} trend="+8%" positive />
        <HeroTile label="Active reports" value={activeReports.toString()} trend="+2" positive />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Data sources" value="Live" trend="Real-time" positive />
        <HeroTile label="Report owners" value={totalClients.toString()} trend="clients" positive />
      </div>
    </div>
  )

  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {["All", "Scheduled", "Library"].map(tag => (
        <Button key={tag} variant={tag === "Scheduled" ? "default" : "ghost"} size="sm" className="h-8 text-sm">
          {tag}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 text-xs">History</Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs">Export CSV</Button>
      </div>
    </div>
  )

  const extendedSections = [
    ...reportSections,
    {
      title: "Monthly Shipment Trends",
      subtitle: "Shipment volume over the last 6 months",
      content: (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyShipments}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <Tooltip
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                formatter={(value: any) => [`${value} shipments`, 'Count']}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    {
      title: "Client Performance Analysis",
      subtitle: "Top clients by shipment volume and on-time performance",
      content: (
        <div className="space-y-4">
          {clientPerformance.slice(0, 6).map((client, idx) => (
            <div key={client.client} className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">{client.client}</span>
                <span className="text-xs text-slate-500">{client.shipments} shipments</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Volume:</span>
                  <span className="font-semibold text-slate-900 ml-2">{client.tons} tons</span>
                </div>
                <div>
                  <span className="text-slate-500">On-time:</span>
                  <span className="font-semibold text-slate-900 ml-2">{client.onTimeRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Mode Distribution & Office Performance",
      subtitle: "Shipment modes and office-wise breakdown",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border border-slate-200 bg-white">
            <div className="text-sm font-semibold text-slate-900 mb-3">Shipment Modes</div>
            <div className="space-y-2">
              {modeDistribution.map((mode, idx) => (
                <div key={mode.mode} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", COLORS[idx % COLORS.length])} />
                    <span className="text-slate-700">{mode.mode}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{mode.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 bg-white">
            <div className="text-sm font-semibold text-slate-900 mb-3">Office Performance</div>
            <div className="space-y-2">
              {officePerformance.slice(0, 4).map((office, idx) => (
                <div key={office.office} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", COLORS[idx % COLORS.length])} />
                    <span className="text-slate-700">{office.office}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">{office.shipments}</div>
                    <div className="text-xs text-slate-500">{office.clients} clients</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Transit Time Analysis",
      subtitle: "End-to-end transit times across all shipment legs",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { leg: 'Pickup → Arrival', data: transitTimeReport.pickupToArrival },
            { leg: 'Pickup → Delivery', data: transitTimeReport.pickupToDelivery },
            { leg: 'Departure → Arrival', data: transitTimeReport.departureToArrival },
            { leg: 'Departure → Delivery', data: transitTimeReport.departureToDelivery }
          ].map((item, idx) => (
            <div key={item.leg} className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="text-sm font-semibold text-slate-900 mb-2">{item.leg}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Average:</span>
                  <span className="font-semibold text-slate-900">{item.data.avg} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Median:</span>
                  <span className="font-semibold text-slate-900">{item.data.median} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Range:</span>
                  <span className="font-semibold text-slate-900">{item.data.min}-{item.data.max} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Samples:</span>
                  <span className="font-semibold text-slate-900">{item.data.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-5">
          <div className="animate-pulse">
            <div className="h-16 bg-white rounded-xl mb-5"></div>
            <div className="h-12 bg-white rounded-xl mb-5"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-80 bg-white rounded-xl"></div>
              <div className="h-80 bg-white rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PremiumPageShell
      title="Reports"
      description="Reporting workspace scaffolding with premium styling."
      hero={hero}
      filters={filters}
      sections={extendedSections}
      active="reports"
      columns={2}
    />
  )
}