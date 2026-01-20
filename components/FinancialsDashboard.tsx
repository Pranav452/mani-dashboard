'use client'

import { useMemo, useState } from 'react'
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowUpRight, ArrowDownRight, Download, Eye, FilterX, Calendar as CalendarIcon } from "lucide-react"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { getComputedMode, generateFinancials, getValidDate } from "@/lib/dashboard-logic"
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
  const { kpis, filteredData } = useMemo(() => {
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
        if (r.DOCRECD) {
            completedRevenue += rev;
        } else {
            pendingRevenue += rev;
        }
    });

    const revenue = enrichedData.reduce((sum, r) => sum + (r._financials?.revenue || 0), 0);

    return {
      kpis: { revenue, pendingRevenue, completedRevenue },
      filteredData: enrichedData
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
        <p className="text-sm text-slate-200 dark:text-zinc-300 max-w-sm">
          Consolidated view of billing volume and invoice status.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:col-span-2">
        <HeroStat
          label="Total Billing Volume"
          value={kpis.revenue > 0 ? `$${(kpis.revenue / 1000000).toFixed(2)}M` : "$0.00M"}
          trend={kpis.revenue > 0 ? `${((kpis.completedRevenue / kpis.revenue) * 100).toFixed(0)}% settled` : "N/A"}
          positive
        />
        {/* Only keeping Total Billing Volume as per requirement */}
      </div>
    </div>
  )

  const sections = [
    {
      title: "Invoice Management",
      subtitle: "List of recent invoices and status",
      content: (
        <div className="w-full">
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="grid grid-cols-6 gap-4 p-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-1">Invoice No</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-2">Job Reference</div>
                    <div className="col-span-1 text-right">Amount</div>
                    <div className="col-span-1 text-center">Action</div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {/* Placeholder for Invoice Data - currently using shipment data to mock the layout */}
                    {filteredData.slice(0, 10).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-6 gap-4 p-4 items-center text-sm hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="font-mono text-slate-900 dark:text-slate-100">INV-{row.JOBNO}</div>
                            <div className="text-slate-500">{row._date ? format(row._date, 'dd MMM yyyy') : 'N/A'}</div>
                            <div className="col-span-2 text-slate-900 dark:text-slate-100 truncate">{row.CONNAME}</div>
                            <div className="text-right font-semibold text-slate-900 dark:text-slate-100">
                                {row._financials.revenue > 0 ? `$${row._financials.revenue.toLocaleString()}` : 'Pending'}
                            </div>
                            <div className="flex justify-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => alert(`View Invoice INV-${row.JOBNO}`)}>
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-emerald-600">
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {filteredData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">No invoices found for the selected period.</div>
                    )}
                </div>
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
      columns={1} // Changed to 1 column layout for the big table
      filters={filters}
    />
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
