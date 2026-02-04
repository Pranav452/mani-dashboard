'use client'

import { useMemo, useState, useEffect } from 'react'
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowUpRight, ArrowDownRight, Download, Eye, FilterX, Calendar as CalendarIcon } from "lucide-react"
import { format, isWithinInterval, startOfDay, endOfDay, parse } from "date-fns"
import { getComputedMode, generateFinancials, getValidDate, parseDateValue } from "@/lib/dashboard-logic"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getInvoices } from "@/app/actions"

export default function FinancialsDashboard({ data }: { data: any[] }) {
  const [invoiceData, setInvoiceData] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  // --- STATE FOR FILTERS ---
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [filterMode, setFilterMode] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // --- FETCH INVOICE DATA ---
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingInvoices(true)
      try {
        const invoices = await getInvoices()
        setInvoiceData(invoices || [])
      } catch (error) {
        console.error("Failed to fetch invoices:", error)
        setInvoiceData([])
      } finally {
        setLoadingInvoices(false)
      }
    }
    fetchInvoices()
  }, [])

  // --- DATA PROCESSING ---
  const { kpis, filteredInvoices } = useMemo(() => {
    if (loadingInvoices) {
      return {
        kpis: { totalBilling: 0 },
        filteredInvoices: []
      };
    }

    // Filter invoice data based on filters
    const filtered = invoiceData.filter(row => {
      if (filterMode !== "ALL" && row.MODE !== filterMode) return false;
      
      if (dateRange.from && dateRange.to) {
        const invDate = parseDateValue(row.INVDT);
        if (!invDate || !isWithinInterval(invDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          row.INVNO?.toString().toLowerCase().includes(q) ||
          row.CLIENTNAME?.toString().toLowerCase().includes(q)
        );
      }
      return true;
    });

    const totalBilling = filtered.reduce((sum, r) => sum + (parseFloat(r.AMTEURO) || 0), 0);

    return {
      kpis: { totalBilling },
      filteredInvoices: filtered
    };
  }, [invoiceData, filterMode, dateRange, searchQuery, loadingInvoices]);

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
          value={kpis.totalBilling > 0 ? `€${(kpis.totalBilling / 1000).toFixed(2)}K` : "€0.00"}
          trend={`${filteredInvoices.length} invoices`}
          positive
        />
      </div>
    </div>
  )

  const handleViewInvoice = (invno: string) => {
    const url = `http://180.179.207.163/erp-ng/#/popup/AccountFra-Invoice-View-Print/${invno}?Printeuro=Y&CMPID=1885`;
    window.open(url, '_blank');
  };

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
                    <div className="col-span-2">Client Name</div>
                    <div className="col-span-1 text-center">Mode</div>
                    <div className="col-span-1 text-right">Amount (EUR)</div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {loadingInvoices ? (
                        <div className="p-8 text-center text-slate-500">Loading invoices...</div>
                    ) : filteredInvoices.length > 0 ? (
                        filteredInvoices.map((row, idx) => {
                            const invDate = parseDateValue(row.INVDT);
                            return (
                                <div key={row.PKID || idx} className="grid grid-cols-6 gap-4 p-4 items-center text-sm hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="font-mono text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        {row.INVNO}
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6 text-slate-500 hover:text-blue-600" 
                                            onClick={() => handleViewInvoice(row.INVNO)}
                                            title="View Invoice"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="text-slate-500">
                                        {invDate ? format(invDate, 'dd MMM yyyy') : row.INVDT || 'N/A'}
                                    </div>
                                    <div className="col-span-2 text-slate-900 dark:text-slate-100 truncate">
                                        {row.CLIENTNAME || 'N/A'}
                                    </div>
                                    <div className="text-center">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {row.MODE || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="text-right font-semibold text-slate-900 dark:text-slate-100">
                                        €{parseFloat(row.AMTEURO || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
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
