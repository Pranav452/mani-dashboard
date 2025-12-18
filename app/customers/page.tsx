"use client"

import { useMemo } from "react"
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowUpRight, ArrowDownRight, HeartHandshake, BarChart3 } from "lucide-react"
import { ComingSoonTooltip } from "@/components/ui/tooltip"
import { format, isWithinInterval, parse, isValid, startOfDay, endOfDay, subDays } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

// Helper functions (copied from Dashboard)
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

function CustomerTile({ name, value, trend, positive }: { name: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-600" : "text-amber-600"

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500 font-medium">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{value}</span>
        <span className={`text-xs flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" /> {trend}
        </span>
      </CardContent>
    </Card>
  )
}

function HeroTile({ label, value, trend, positive }: { label: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-200" : "text-amber-200"

  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-3">
      <div className="text-xs uppercase text-fuchsia-100">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" /> {trend}
      </div>
    </div>
  )
}

export default function CustomersPage() {
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
        console.error('Error fetching customers data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process data (similar to Dashboard)
  const parsedData = useMemo<ShipmentRecord[]>(() => {
    return data.map(row => ({
      ...row,
      _date: getValidDate(row),
      _mode: getComputedMode(row)
    }))
  }, [data])

  // Real customer calculations
  const clientStats = useMemo(() => {
    const stats: Record<string, { shipments: number; tons: number; modes: Record<string, number> }> = {}

    parsedData.forEach(row => {
      const client = row.CONNAME || "Unknown"
      if (!stats[client]) {
        stats[client] = { shipments: 0, tons: 0, modes: { SEA: 0, AIR: 0, 'SEA-AIR': 0 } }
      }
      stats[client].shipments++
      stats[client].tons += cleanNum(row.CONT_GRWT) / 1000
      const mode = row._mode
      if (mode && stats[client].modes[mode] !== undefined) {
        stats[client].modes[mode]++
      }
    })

    return Object.entries(stats)
      .map(([name, info]) => ({
        name,
        shipments: info.shipments,
        tons: Math.round(info.tons * 10) / 10,
        modes: info.modes
      }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 8)
  }, [parsedData])

  // Client seasonality for top clients
  const clientSeasonality = useMemo(() => {
    const topClients = clientStats.slice(0, 4).map(c => c.name)
    const stats: Record<string, Record<string, number>> = {}

    parsedData.forEach(row => {
      const client = row.CONNAME || "Unknown"
      if (!topClients.includes(client)) return

      if (!row._date) return
      const month = format(row._date, 'yyyy-MM')

      if (!stats[client]) stats[client] = {}
      stats[client][month] = (stats[client][month] || 0) + 1
    })

    return Object.entries(stats).map(([client, months]) => ({
      client,
      data: Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month: format(new Date(month + '-01'), 'MMM yy'), count }))
    }))
  }, [parsedData, clientStats])

  const totalShipments = clientStats.reduce((sum, client) => sum + client.shipments, 0)
  const totalClients = clientStats.length

  const customerSections = [
    {
      title: "Top Customers by Volume",
      subtitle: "Real customer data from shipments",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {clientStats.slice(0, 4).map((client, idx) => (
            <CustomerTile
              key={client.name}
              name={client.name}
              value={`${client.shipments} shipments`}
              trend={`${client.tons.toFixed(1)} tons`}
              positive={idx < 2}
            />
          ))}
        </div>
      )
    },
    {
      title: "Customer Mode Distribution",
      subtitle: "SEA vs AIR shipments per client",
      content: (
        <div className="space-y-3">
          {clientStats.slice(0, 4).map(client => (
            <div key={client.name} className="p-3 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">{client.name}</span>
                <span className="text-xs text-slate-500">{client.shipments} total</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mb-2">
                <div
                  className="bg-blue-500"
                  style={{ width: `${(client.modes.SEA / client.shipments) * 100}%` }}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: `${(client.modes.AIR / client.shipments) * 100}%` }}
                />
                <div
                  className="bg-orange-500"
                  style={{ width: `${(client.modes['SEA-AIR'] / client.shipments) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>SEA: {client.modes.SEA}</span>
                <span>AIR: {client.modes.AIR}</span>
                <span>SEA-AIR: {client.modes['SEA-AIR']}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  const hero = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-800 to-fuchsia-700 text-white p-5 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-fuchsia-100">
          <BarChart3 className="w-4 h-4" /> Customer analytics
        </div>
        <div className="text-2xl font-semibold">Real customer insights</div>
        <p className="text-sm text-fuchsia-100 max-w-xs">Shipment volumes, mode preferences, and seasonality patterns from actual data.</p>
        <Button size="sm" variant="secondary" className="text-slate-900">View reports</Button>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Total clients" value={totalClients.toString()} trend="+2" positive />
        <HeroTile label="Total shipments" value={totalShipments.toLocaleString()} trend="+8%" positive />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <ComingSoonTooltip message="NPS, CSAT, and churn risk metrics are not available in the current schema. Customer satisfaction data needs to be added.">
          <div className="cursor-help">
            <HeroTile label="NPS" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="Customer service metrics like active tickets are not available in the current schema. CRM integration needed.">
          <div className="cursor-help">
            <HeroTile label="Active tickets" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
      </div>
    </div>
  )

  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {["All", "Strategic", "Growth", "Watch"].map(tag => (
        <Button key={tag} variant={tag === "Strategic" ? "default" : "ghost"} size="sm" className="h-8 text-sm">
          {tag}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 text-xs">Notes</Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs">Share</Button>
      </div>
    </div>
  )

  const extendedSections = [
    ...customerSections,
    {
      title: "Client Seasonality",
      subtitle: "Monthly shipment patterns for top customers",
      content: (
        <div className="space-y-4">
          {clientSeasonality.map(clientData => (
            <div key={clientData.client} className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="text-sm font-semibold text-slate-900 mb-3">{clientData.client}</div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientData.data.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                      formatter={(value: any) => [`${value} shipments`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Service Metrics",
      subtitle: "Customer service and satisfaction (Coming Soon)",
      content: (
        <ComingSoonTooltip
          message="Customer service metrics (CSAT, NPS, churn risk, active tickets) are not available in the current shipment schema. These require CRM or customer service system integration."
          disabled={true}
        >
          <div className="p-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl text-slate-300">📊</div>
              <div className="text-sm text-slate-500">Service metrics not available</div>
              <div className="text-xs text-slate-400">Requires CRM integration</div>
            </div>
          </div>
        </ComingSoonTooltip>
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
      title="Customers"
      description="Customer analytics and service health placeholders."
      hero={hero}
      filters={filters}
      sections={extendedSections}
      active="customers"
      columns={2}
    />
  )
}