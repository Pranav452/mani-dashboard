"use client"

import { ReactNode } from "react"
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, Anchor, ArrowUpRight, ArrowDownRight, Navigation } from "lucide-react"
import { ComingSoonTooltip } from "@/components/ui/tooltip"

const fleetSections = [
  {
    title: "Fleet Utilization",
    subtitle: "Fleet metrics not available in current schema",
    content: (
      <ComingSoonTooltip
        message="Fleet utilization, truck counts, marine capacity, and asset tracking data are not available in the current shipment schema. Fleet management system integration required."
        disabled={true}
      >
        <div className="grid grid-cols-2 gap-3">
          <FleetTile label="Active trucks" value="N/A" trend="-" />
          <FleetTile label="Marine capacity" value="N/A" trend="-" icon={<Anchor className="w-4 h-4 text-slate-500" />} />
          <FleetTile label="Idle assets" value="N/A" trend="-" />
          <FleetTile label="Maintenance" value="N/A" trend="-" />
        </div>
      </ComingSoonTooltip>
    )
  },
  {
    title: "Route Health",
    subtitle: "Operational metrics (Coming Soon)",
    content: (
      <ComingSoonTooltip
        message="Route health, on-time arrivals, dwell times, and operational exceptions require fleet management and GPS tracking system data. Current schema only contains shipment information."
        disabled={true}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">On-time arrivals</div>
              <div className="text-lg font-semibold text-slate-900">N/A</div>
            </div>
            <Truck className="w-5 h-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FleetTile label="Avg dwell" value="N/A" trend="-" />
            <FleetTile label="Open exceptions" value="N/A" trend="-" />
          </div>
        </div>
      </ComingSoonTooltip>
    )
  }
]

function FleetPageContent() {
  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-2xl bg-gradient-to-r from-emerald-900 via-cyan-800 to-sky-700 text-white p-5 shadow-lg">
      <div className="space-y-2 lg:col-span-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-100">
          <Navigation className="w-4 h-4" /> Fleet management
        </div>
        <div className="text-2xl font-semibold">Coming Soon</div>
        <p className="text-sm text-cyan-100 max-w-lg">Fleet tracking, utilization, and operational metrics require fleet management system integration. Current shipment data does not include vehicle or asset information.</p>
        <ComingSoonTooltip message="Dispatch board requires fleet management system with GPS tracking and real-time vehicle data.">
          <Button size="sm" variant="secondary" className="text-slate-900 opacity-50 cursor-not-allowed">Dispatch board</Button>
        </ComingSoonTooltip>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <ComingSoonTooltip message="Active truck counts and utilization require fleet management system integration.">
          <div className="cursor-help">
            <HeroTile label="Active trucks" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="Marine vessel capacity and utilization require maritime fleet management system.">
          <div className="cursor-help">
            <HeroTile label="Marine capacity" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <ComingSoonTooltip message="Idle asset tracking requires fleet management system with asset monitoring.">
          <div className="cursor-help">
            <HeroTile label="Idle assets" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
        <ComingSoonTooltip message="Exception tracking requires operational management system integration.">
          <div className="cursor-help">
            <HeroTile label="Open exceptions" value="N/A" trend="-" />
          </div>
        </ComingSoonTooltip>
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
      subtitle: "Fleet safety metrics (Coming Soon)",
      content: (
        <ComingSoonTooltip
          message="Safety metrics, inspections, incidents, and compliance certifications require fleet management system with safety monitoring and regulatory compliance tracking."
          disabled={true}
        >
          <div className="p-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl text-slate-300">🛡️</div>
              <div className="text-sm text-slate-500">Safety & compliance metrics not available</div>
              <div className="text-xs text-slate-400">Requires fleet management system</div>
            </div>
          </div>
        </ComingSoonTooltip>
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

export default function FleetPage() {
  return <FleetPageContent />
}
