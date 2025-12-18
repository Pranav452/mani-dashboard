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
      clientMap[client] = (clientMap[client] || 0) + r._financials.profit;
    });
    const clientProfitArr = Object.entries(clientMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      kpis: { revenue, profit, cost, margin },
      monthlyTrend: monthlyTrendArr,
      clientProfit: clientProfitArr
    };
  }, [data, filterMode, dateRange, searchQuery]);

  // --- FILTERS COMPONENT ---
  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <Select value={filterMode} onValueChange={setFilterMode}>
        <SelectTrigger className="h-9 text-sm w-[140px] border-slate-200 bg-white">
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
          <Button variant="outline" className={cn("h-9 text-sm px-3 border-slate-200 bg-white hover:bg-slate-50", !dateRange.from && "text-slate-500")}>
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
        className="h-9 text-sm w-[200px] bg-slate-50 border-slate-200" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      <Button 
        variant="outline" 
        size="sm" 
        className="h-9 text-sm border-slate-200"
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-5 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-200">
          <Sparkles className="w-4 h-4" /> Executive overview
        </div>
        <div className="text-2xl font-semibold">Financial posture</div>
        <p className="text-sm text-slate-200 max-w-sm">Revenue, margin, and liquidity pulse for the current period.</p>
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" className="text-slate-900">View P&L</Button>
          <Button size="sm" variant="ghost" className="text-white hover:text-white border-white/30">Export</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HeroStat label="Revenue" value={`$${(kpis.revenue / 1000000).toFixed(2)}M`} trend="+6.1%" positive />
        <HeroStat label="Gross margin" value={`${kpis.margin.toFixed(1)}%`} trend="+1.2%" positive />
        <HeroStat label="Profit" value={`$${(kpis.profit / 1000).toFixed(0)}K`} trend="+4.0%" positive />
        <HeroStat label="Cost" value={`$${(kpis.cost / 1000000).toFixed(2)}M`} trend="-2.0%" />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4">
        <div className="text-xs uppercase text-slate-200 mb-2">Profit Target</div>
        <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-3">
          <div className="h-full w-[68%] bg-emerald-300" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-200">68% of plan</span>
          <span className="font-semibold">$1.5M Goal</span>
        </div>
      </div>
    </div>
  )

  const sections = [
    {
      title: "Revenue & Margin Analysis",
      subtitle: "Monthly performance breakdown",
      content: (
        <div className="grid grid-cols-1 gap-6">
            <div className="h-[450px] w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-semibold mb-4 text-slate-700">Revenue vs Cost Trend</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                    <Legend verticalAlign="top" height={36}/>
                    <Area name="Revenue" type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    <Area name="Cost" type="monotone" dataKey="cost" stroke="#ef4444" fillOpacity={0} strokeDasharray="5 5" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="h-[450px] w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-semibold mb-4 text-slate-700">Top Clients by Profit</h4>
                <div className="h-[380px] w-full">
                    <ChartContainer config={{
                        label: { color: "var(--background)" },
                    }}>
                        <BarChart
                            accessibilityLayer
                            data={clientProfit}
                            layout="vertical"
                            margin={{ right: 50, left: 20 }}
                        >
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                width={120}
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
                                barSize={32}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    offset={8}
                                    className="fill-foreground"
                                    fontSize={12}
                                    formatter={(value: any) => `$${(value / 1000).toFixed(1)}k`}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span>Top contributors to margin this period</span>
                </div>
            </div>
        </div>
      )
    },
    {
      title: "Cash & Payables",
      subtitle: "Working capital view",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Cash on hand</div>
              <div className="text-lg font-semibold text-slate-900">$640K</div>
            </div>
            <Wallet className="w-5 h-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Payables" value="$190K" trend="+2.0%" />
            <StatTile label="Receivables" value="$320K" trend="+4.4%" positive />
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-[62%] bg-emerald-500" />
          </div>
        </div>
      )
    }
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
  const trendColor = positive ? "text-emerald-600" : "text-amber-600"

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500 font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900">{value}</span>
        <span className={`text-xs flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" /> {trend}
        </span>
      </CardContent>
    </Card>
  )
}

function HeroStat({ label, value, trend, positive }: { label: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-200" : "text-amber-200"

  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-3">
      <div className="text-xs uppercase text-slate-200">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" /> {trend}
      </div>
    </div>
  )
}
