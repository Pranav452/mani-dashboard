"use client"

import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles } from "lucide-react"
import { ComingSoonTooltip } from "@/components/ui/tooltip"

const financialSections = [
  {
    title: "Revenue & Margin",
    subtitle: "Financial metrics not available in current schema",
    content: (
      <ComingSoonTooltip
        message="Revenue, margin, deductions, and DSO metrics are not available in the current shipment schema. Financial data fields need to be added to enable financial reporting."
        disabled={true}
      >
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Net revenue" value="N/A" trend="-" />
          <StatTile label="Gross margin" value="N/A" trend="-" />
          <StatTile label="Deductions" value="N/A" trend="-" />
          <StatTile label="DSO" value="N/A" trend="-" />
        </div>
      </ComingSoonTooltip>
    )
  },
  {
    title: "Cash & Payables",
    subtitle: "Working capital view (Coming Soon)",
    content: (
      <ComingSoonTooltip
        message="Cash, payables, receivables, and working capital metrics are not available in the current shipment schema. Accounting system integration required."
        disabled={true}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Cash on hand</div>
              <div className="text-lg font-semibold text-slate-900">N/A</div>
            </div>
            <Wallet className="w-5 h-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Payables" value="N/A" trend="-" />
            <StatTile label="Receivables" value="N/A" trend="-" />
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-[0%] bg-slate-300" />
          </div>
        </div>
      </ComingSoonTooltip>
    )
  }
]

function FinancialsPageContent() {
  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-5 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-200">
          <Sparkles className="w-4 h-4" /> Financial analytics
        </div>
        <div className="text-2xl font-semibold">Coming Soon</div>
        <p className="text-sm text-slate-200 max-w-sm">Financial metrics and reporting require accounting system integration. Current shipment data does not include revenue, costs, or profitability information.</p>
        <ComingSoonTooltip message="P&L and detailed financial reports require accounting system data integration.">
          <Button size="sm" variant="secondary" className="text-slate-900 opacity-50 cursor-not-allowed">View P&L</Button>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="Financial data export requires accounting system integration.">
          <Button size="sm" variant="ghost" className="text-white hover:text-white border-white/30 opacity-50 cursor-not-allowed">Export</Button>
        </ComingSoonTooltip>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ComingSoonTooltip message="Revenue data not available in current schema. Requires accounting system integration.">
          <div className="cursor-help">
            <HeroStat label="Revenue" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="Margin calculations require revenue and cost data from accounting system.">
          <div className="cursor-help">
            <HeroStat label="Gross margin" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="Cash balance data requires accounting system integration.">
          <div className="cursor-help">
            <HeroStat label="Cash" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="DSO calculation requires accounts receivable data from accounting system.">
          <div className="cursor-help">
            <HeroStat label="DSO" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
      </div>
      <ComingSoonTooltip message="Cash runway analysis requires cash flow data from accounting system.">
        <div className="rounded-xl bg-white/10 border border-white/10 p-4 cursor-help">
          <div className="text-xs uppercase text-slate-200 mb-2">Cash runway</div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-3">
            <div className="h-full w-[0%] bg-slate-400" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-200">Not available</span>
            <span className="font-semibold">N/A days</span>
          </div>
        </div>
      </ComingSoonTooltip>
    </div>
  )

  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {["This month", "Quarter", "YTD"].map(label => (
        <Button key={label} variant={label === "This month" ? "default" : "ghost"} size="sm" className="h-8 text-sm">
          {label}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 text-xs">Refresh</Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs">Share</Button>
      </div>
    </div>
  )

  const extendedSections = [
    ...financialSections,
    {
      title: "Forecast vs Actuals",
      subtitle: "Financial forecasting requires accounting system data",
      content: (
        <ComingSoonTooltip
          message="Forecast vs actuals analysis requires budget/forecast data and actual financial results from accounting system. Current shipment schema only contains operational data."
          disabled={true}
        >
          <div className="p-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl text-slate-300">📈</div>
              <div className="text-sm text-slate-500">Financial forecasting not available</div>
              <div className="text-xs text-slate-400">Requires accounting system integration</div>
            </div>
          </div>
        </ComingSoonTooltip>
      )
    }
  ]

  return (
    <PremiumPageShell
      title="Financials"
      description="Premium financial workspace with quick filters and cards."
      hero={hero}
      filters={filters}
      sections={extendedSections}
      active="financials"
      columns={3}
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

export default function FinancialsPage() {
  return <FinancialsPageContent />
}
