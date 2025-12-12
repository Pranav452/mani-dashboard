import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles } from "lucide-react"

const financialSections = [
  {
    title: "Revenue & Margin",
    subtitle: "Snapshot of monthly performance",
    content: (
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Net revenue" value="$1.24M" trend="+6.1%" positive />
        <StatTile label="Gross margin" value="24.3%" trend="+1.2%" positive />
        <StatTile label="Deductions" value="$82K" trend="-3.4%" />
        <StatTile label="DSO" value="41 days" trend="-2 days" positive />
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

function FinancialsPageContent() {
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
        <HeroStat label="Revenue" value="$1.24M" trend="+6.1%" positive />
        <HeroStat label="Gross margin" value="24.3%" trend="+1.2%" positive />
        <HeroStat label="Cash" value="$640K" trend="+4.0%" positive />
        <HeroStat label="DSO" value="41 days" trend="-2.0" />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4">
        <div className="text-xs uppercase text-slate-200 mb-2">Cash runway</div>
        <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-3">
          <div className="h-full w-[68%] bg-emerald-300" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-200">68% of plan</span>
          <span className="font-semibold">120 days</span>
        </div>
      </div>
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
      subtitle: "Example table to reduce whitespace",
      content: (
        <div className="space-y-2 text-sm">
          {["Q1", "Q2", "Q3", "Q4"].map((q, idx) => (
            <div key={q} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{q}</span>
                <span className="text-slate-500">Plan ${(900 + idx * 80).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Actual ${(880 + idx * 70).toLocaleString()}</span>
                <span className={idx % 2 === 0 ? "text-emerald-600 text-xs" : "text-amber-600 text-xs"}>{idx % 2 === 0 ? "+3.2%" : "-1.4%"}</span>
              </div>
            </div>
          ))}
        </div>
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
