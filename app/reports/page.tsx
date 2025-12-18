import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, ArrowUpRight, ArrowDownRight, CalendarClock } from "lucide-react"

const reportSections = [
  {
    title: "Report Library",
    subtitle: "Placeholder tiles to illustrate layout",
    content: (
      <div className="grid grid-cols-2 gap-3">
        <ReportTile title="Monthly P&L" badge="Updated" trend="+1.2%" positive />
        <ReportTile title="Lane Profitability" badge="Draft" trend="-0.6%" />
        <ReportTile title="Customer Scorecards" badge="Updated" trend="+2.0%" positive />
        <ReportTile title="Carrier Performance" badge="Planned" trend="-" />
      </div>
    )
  },
  {
    title: "Scheduled Exports",
    subtitle: "Sample schedule list",
    content: (
      <div className="space-y-2">
        {["Daily ops pack", "Weekly exec brief", "Customer CSAT", "Exception log"].map((item, idx) => (
          <div key={item} className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">{item}</div>
            <div className="text-xs text-slate-500">{idx % 2 === 0 ? "6am UTC" : "Fridays"}</div>
          </div>
        ))}
      </div>
    )
  }
]

function ReportsPageContent() {
  const hero = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-indigo-700 text-white p-5 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-indigo-100">
          <CalendarClock className="w-4 h-4" /> Reporting workspace
        </div>
        <div className="text-2xl font-semibold">Stories & exports</div>
        <p className="text-sm text-indigo-100 max-w-sm">Curate weekly briefs and schedule recurring exports.</p>
        <Button size="sm" variant="secondary" className="text-slate-900">Create report</Button>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Scheduled" value="12" trend="+2" positive />
        <HeroTile label="Last run" value="2h ago" trend="+1h" />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Libraries" value="18" trend="+3" positive />
        <HeroTile label="Owners" value="7" trend="-" />
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
      title: "Recent runs",
      subtitle: "Archive of generated reports",
      content: (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
             <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <div className="col-span-2">Report Name</div>
                <div>Generated</div>
                <div className="text-right">Action</div>
             </div>
             <div className="divide-y divide-slate-100">
                {[
                  { name: "Global Logistics Summary Q3", date: "Today, 10:00 AM", type: "PDF" },
                  { name: "Carrier Performance Scorecard", date: "Yesterday", type: "XLSX" },
                  { name: "Cost Analysis - SEA Freight", date: "Oct 24, 2024", type: "PDF" },
                  { name: "Carbon Footprint Disclosure", date: "Oct 22, 2024", type: "PDF" },
                  { name: "Weekly Operations Brief", date: "Oct 20, 2024", type: "PPTX" }
                ].map((report, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-4 p-3 text-sm items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {report.type}
                        </div>
                        <span className="font-medium text-slate-900">{report.name}</span>
                    </div>
                    <div className="text-slate-500">{report.date}</div>
                    <div className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">Download</Button>
                    </div>
                  </div>
                ))}
             </div>
        </div>
      )
    }
  ]

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
  return <ReportsPageContent />
}
