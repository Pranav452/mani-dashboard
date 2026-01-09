'use client'

import { useMemo, useState } from 'react'
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Sparkles, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, FilterX, Calendar as CalendarIcon } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cleanNum, getComputedMode, generateFinancials, getValidDate } from "@/lib/dashboard-logic"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function FinancialsDashboard({ data }: { data: any[] }) {
  // --- STATE FOR FILTERS ---
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [filterMode, setFilterMode] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // --- DATA PROCESSING ---
  const { kpis, monthlyTrend, clientProfit } = useMemo(() => {
    // 1. Enrich & Filter Data
    const enrichedData = data.map(row => {
      const mode = getComputedMode(row);
      const fin = generateFinancials(row);
      const date = getValidDate(row);
      return { ...row, _mode: mode, _financials: fin, _date: date };
    }).filter(row => {
        if (filterMode !== "ALL" && row._mode !== filterMode) return false;
        if (dateRange.from && dateRange.to && row._date) {
            if (!isWithinInterval(row._date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                row.JOBNO?.toString().toLowerCase().includes(q) ||
                row.CONNAME?.toString().toLowerCase().includes(q)
            );
        }
        return true;
    });

    // 2. KPIs
    let pendingRevenue = 0;
    let completedRevenue = 0;

    enrichedData.forEach(r => {
        const rev = r._financials?.revenue || 0;
        // Logic: If DOCRECD is present, assume invoice is processed/completed. Otherwise pending.
        if (r.DOCRECD) {
            completedRevenue += rev;
        } else {
            pendingRevenue += rev;
        }
    });

    const revenue = enrichedData.reduce((sum, r) => sum + (r._financials?.revenue || 0), 0);
    const profit = enrichedData.reduce((sum, r) => sum + (r._financials?.profit || 0), 0);
    const cost = revenue - profit;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // 3. Trends
    const monthly: Record<string, { revenue: number, profit: number, cost: number }> = {};
    enrichedData.forEach(r => {
      if (!r._date) return;
      const key = format(r._date, 'MMM yyyy');
      if (!monthly[key]) monthly[key] = { revenue: 0, profit: 0, cost: 0 };
      monthly[key].revenue += r._financials.revenue;
      monthly[key].profit += r._financials.profit;
      monthly[key].cost += r._financials.cost;
    });
    
    const monthlyTrendArr = Object.entries(monthly)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Client Profit
    const clientMap: Record<string, number> = {};
    enrichedData.forEach(r => {
      const client = r.CONNAME || 'Unknown';
      clientMap[client] = (clientMap[client] || 0) + r._financials.revenue; // Changed to Revenue based on user asking for "Volume" chart revamping
    });
    const clientProfitArr = Object.entries(clientMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8

    return {
      kpis: { revenue, profit, cost, margin, pendingRevenue, completedRevenue },
      monthlyTrend: monthlyTrendArr,
      clientProfit: clientProfitArr
    };
  }, [data, filterMode, dateRange, searchQuery]);

  // --- FILTERS COMPONENT ---
  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
      <Select value={filterMode} onValueChange={setFilterMode}>
        <SelectTrigger className="h-9 text-sm w-[140px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-800">
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Modes</SelectItem>
          <SelectItem value="SEA">Sea</SelectItem>
          <SelectItem value="AIR">Air</SelectItem>
          <SelectItem value="SEA-AIR">Sea-Air</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("h-9 text-sm px-3 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-800", !dateRange.from && "text-slate-500 dark:text-slate-400")}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            {dateRange.from ? (
                dateRange.to ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}` : format(dateRange.from, "MMM dd")
            ) : "Date range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange.from}
            selected={dateRange}
            onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Input 
        placeholder="Filter..." 
        className="h-9 text-sm w-[200px] bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      <Button 
        variant="outline" 
        size="sm" 
        className="h-9 text-sm border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-800"
        onClick={() => {
            setFilterMode("ALL");
            setDateRange({ from: undefined, to: undefined });
            setSearchQuery("");
        }}
      >
        <FilterX className="w-4 h-4 mr-2" /> Reset
      </Button>
    </div>
  )

  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-700 text-white p-5 shadow-lg">
      <div className="space-y-2 lg:col-span-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-200 dark:text-zinc-300">
          <Sparkles className="w-4 h-4" /> Executive overview
        </div>
        <div className="text-2xl font-semibold">Financial activity overview</div>
        <p className="text-sm text-slate-200 dark:text-zinc-300 max-w-sm">Billing, freight, and payment status snapshot for the current period.</p>
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" className="text-slate-900 dark:text-zinc-900">View statement</Button>
          <Button size="sm" variant="ghost" className="text-white hover:text-white border-white/30 hover:bg-white/10">Export</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:col-span-2">
        <HeroStat
          label="Total Billing Volume"
          value={kpis.revenue > 0 ? `$${(kpis.revenue / 1000000).toFixed(2)}M` : "$0.00M"}
          trend={kpis.revenue > 0 ? `${((kpis.completedRevenue / kpis.revenue) * 100).toFixed(0)}% settled` : "N/A"}
          positive
        />
        {/* <HeroStat label="Total Profit" value={`$${(kpis.profit / 1000000).toFixed(2)}M`} trend={`${kpis.margin.toFixed(1)}% margin`} positive /> */}
        <HeroStat
          label="Unsettled Billing"
          value={kpis.pendingRevenue > 0 ? `$${(kpis.pendingRevenue / 1000000).toFixed(2)}M` : "$0.00M"}
          trend={kpis.revenue > 0 ? `${((kpis.pendingRevenue / kpis.revenue) * 100).toFixed(0)}%` : "N/A"}
          positive
        />
        <HeroStat
          label="Settled Billing"
          value={kpis.completedRevenue > 0 ? `$${(kpis.completedRevenue / 1000000).toFixed(2)}M` : "$0.00M"}
          trend={kpis.revenue > 0 ? `${((kpis.completedRevenue / kpis.revenue) * 100).toFixed(0)}%` : "N/A"}
          positive
        />
      </div>
    </div>
  )

  const sections = [
    {
      title: "Client Analysis",
      subtitle: "Overview by billing volume",
      content: (
        <div className="w-full">
            <div className="w-full bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <h4 className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-200">Top Client Accounts by Billing Volume</h4>
                <div className="h-[400px] w-full">
                    <ChartContainer config={{
                        label: { color: "var(--background)" },
                    }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                accessibilityLayer
                                data={clientProfit}
                                layout="vertical"
                                margin={{ right: 50, left: 20, top: 10, bottom: 10 }}
                            >
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    width={150}
                                    tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}}
                                />
                                <XAxis dataKey="value" type="number" hide />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="line" />}
                                />
                                <Bar
                                    dataKey="value"
                                    layout="vertical"
                                    fill="#3b82f6"
                                    radius={4}
                                    barSize={40}
                                >
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        offset={8}
                                        className="fill-foreground dark:fill-slate-200"
                                        fontSize={12}
                                        formatter={(value: any) => `$${(value / 1000).toFixed(1)}k`}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500 dark:text-slate-400">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Key account billing distribution for this period</span>
                </div>
            </div>
        </div>
      )
    },
    {
      title: "Monthly Trends",
      subtitle: "Revenue over time",
      content: (
        <div className="w-full">
          <div className="w-full bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
            <h4 className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-200">
              Financial Performance Trends
            </h4>
            <div className="h-[400px] w-full">
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyTrend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      className="dark:stroke-zinc-800"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-slate-500 dark:text-slate-400">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Monthly billing volume trend</span>
            </div>
          </div>
        </div>
      )
    },
    
  ]

  return (
    <PremiumPageShell
      title="Financials"
      description="Premium financial workspace with quick filters and cards."
      hero={hero}
      sections={sections}
      active="financials"
      columns={2}
      filters={filters}
    />
  )
}

function StatTile({ label, value, trend, positive }: { label: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"

  return (
    <Card className="border border-slate-200 dark:border-zinc-800 shadow-none bg-white dark:bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</span>
        <span className={`text-xs flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" /> {trend}
        </span>
      </CardContent>
    </Card>
  )
}

function HeroStat({ label, value, trend, positive }: { label: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-200 dark:text-emerald-300" : "text-amber-200 dark:text-amber-300"

  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-3">
      <div className="text-xs uppercase text-slate-200 dark:text-zinc-300">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" /> {trend}
      </div>
    </div>
  )
}
