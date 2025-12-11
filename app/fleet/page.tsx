import { ReactNode } from "react"
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, Anchor, ArrowUpRight, ArrowDownRight, Navigation } from "lucide-react"

const fleetSections = [
  {
    title: "Fleet Utilization",
    subtitle: "Example cards with premium styling",
    content: (
      <div className="grid grid-cols-2 gap-3">
        <FleetTile label="Active trucks" value="86%" trend="+3%" positive />
        <FleetTile label="Marine capacity" value="74%" trend="+1%" positive icon={<Anchor className="w-4 h-4 text-slate-500" />} />
        <FleetTile label="Idle assets" value="12" trend="-2" />
        <FleetTile label="Maintenance" value="6 scheduled" trend="+1" />
      </div>
    )
  },
  {
    title: "Route Health",
    subtitle: "Placeholder for charts/mini tables",
    content: (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div className="text-xs text-slate-500">On-time arrivals</div>
            <div className="text-lg font-semibold text-slate-900">91%</div>
          </div>
          <Truck className="w-5 h-5 text-slate-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FleetTile label="Avg dwell" value="9.2 hrs" trend="-0.6" positive />
          <FleetTile label="Open exceptions" value="14" trend="+2" />
        </div>
      </div>
    )
  }
]

export default function FleetPage() {
  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-2xl bg-gradient-to-r from-emerald-900 via-cyan-800 to-sky-700 text-white p-5 shadow-lg">
      <div className="space-y-2 lg:col-span-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-100">
          <Navigation className="w-4 h-4" /> Fleet readiness
        </div>
        <div className="text-2xl font-semibold">Network & utilization</div>
        <p className="text-sm text-cyan-100 max-w-lg">Availability, routes, and maintenance capacity at a glance.</p>
        <Button size="sm" variant="secondary" className="text-slate-900">Dispatch board</Button>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Active trucks" value="86%" trend="+3%" positive />
        <HeroTile label="Marine capacity" value="74%" trend="+1%" positive />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Idle assets" value="12" trend="-2" />
        <HeroTile label="Open exceptions" value="14" trend="+2" />
      </div>
    </div>
  )

  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {["Road", "Sea", "Air"].map(mode => (
        <Button key={mode} variant={mode === "Road" ? "default" : "ghost"} size="sm" className="h-8 text-sm">
          {mode}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 text-xs">Routes</Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs">Export</Button>
      </div>
    </div>
  )

  const extendedSections = [
    ...fleetSections,
    {
      title: "Safety & Compliance",
      subtitle: "Additional rows to keep layout dense",
      content: (
        <div className="space-y-2 text-sm">
          {[
            { name: "Inspections", value: "92% on time", trend: "+2%" },
            { name: "Incidents", value: "3 this month", trend: "-1" },
            { name: "Certifications", value: "78% valid", trend: "-4%" },
          ].map(item => (
            <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div className="font-semibold text-slate-900">{item.name}</div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{item.value}</span>
                <span className={item.trend.startsWith("-") ? "text-amber-600 text-xs" : "text-emerald-600 text-xs"}>{item.trend}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  return (
    <PremiumPageShell
      title="Fleet"
      description="Fleet readiness and utilization placeholders."
      hero={hero}
      filters={filters}
      sections={extendedSections}
      active="fleet"
      columns={3}
    />
  )
}

function FleetTile({ label, value, trend, positive, icon }: { label: string; value: string; trend: string; positive?: boolean; icon?: ReactNode }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-600" : "text-amber-600"

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500 font-medium flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
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
    <div className="rounded-lg bg-white/10 border border-white/10 p-3">
      <div className="text-xs uppercase text-cyan-100">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" /> {trend}
      </div>
    </div>
  )
}
