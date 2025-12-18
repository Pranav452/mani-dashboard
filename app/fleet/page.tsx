'use client'

import { ReactNode, useState } from "react"
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, Anchor, ArrowUpRight, ArrowDownRight, Navigation, Plane, Activity, AlertTriangle } from "lucide-react"

// --- MOCK DATA FOR FLEET ---
const fleetData = {
  ALL: {
    active: { label: "Active Assets", value: "245", trend: "+12%", positive: true },
    capacity: { label: "Total Capacity", value: "88%", trend: "+4%", positive: true },
    idle: { label: "Idle Assets", value: "18", trend: "-5", positive: true },
    maintenance: { label: "In Maintenance", value: "12", trend: "+2", positive: false },
    ontime: "92%",
    dwell: "14.5 hrs",
    exceptions: "24",
    inspections: "96%",
    incidents: "0",
    certifications: "100%"
  },
  ROAD: {
    active: { label: "Active Trucks", value: "156", trend: "+8%", positive: true },
    capacity: { label: "Fleet Usage", value: "94%", trend: "+6%", positive: true },
    idle: { label: "Parked", value: "8", trend: "-2", positive: true },
    maintenance: { label: "Shop", value: "6", trend: "0", positive: true },
    ontime: "95%",
    dwell: "4.2 hrs",
    exceptions: "12",
    inspections: "98%",
    incidents: "1",
    certifications: "99%"
  },
  SEA: {
    active: { label: "Active Vessels", value: "42", trend: "+2%", positive: true },
    capacity: { label: "Container Slots", value: "76%", trend: "-3%", positive: false },
    idle: { label: "Anchored", value: "5", trend: "+1", positive: false },
    maintenance: { label: "Dry Dock", value: "3", trend: "+1", positive: false },
    ontime: "78%",
    dwell: "48.0 hrs",
    exceptions: "8",
    inspections: "100%",
    incidents: "0",
    certifications: "100%"
  },
  AIR: {
    active: { label: "Active Aircraft", value: "28", trend: "+15%", positive: true },
    capacity: { label: "Cargo Hold", value: "82%", trend: "+8%", positive: true },
    idle: { label: "Grounded", value: "2", trend: "-1", positive: true },
    maintenance: { label: "Hangar", value: "1", trend: "0", positive: true },
    ontime: "98%",
    dwell: "2.5 hrs",
    exceptions: "2",
    inspections: "100%",
    incidents: "0",
    certifications: "100%"
  }
}

export default function FleetPage() {
  const [activeMode, setActiveMode] = useState<"ALL" | "ROAD" | "SEA" | "AIR">("ALL")
  const currentData = fleetData[activeMode]

  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-2xl bg-gradient-to-r from-emerald-900 via-cyan-800 to-sky-700 text-white p-5 shadow-lg">
      <div className="space-y-2 lg:col-span-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-100">
          <Navigation className="w-4 h-4" /> Fleet readiness
        </div>
        <div className="text-2xl font-semibold">Network & utilization</div>
        <p className="text-sm text-cyan-100 max-w-lg">
          Real-time availability, route health, and maintenance status for {activeMode === 'ALL' ? 'global fleet' : activeMode.toLowerCase() + ' operations'}.
        </p>
        <Button size="sm" variant="secondary" className="text-slate-900">Dispatch board</Button>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label={currentData.active.label} value={currentData.active.value} trend={currentData.active.trend} positive={currentData.active.positive} />
        <HeroTile label={currentData.capacity.label} value={currentData.capacity.value} trend={currentData.capacity.trend} positive={currentData.capacity.positive} />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label={currentData.idle.label} value={currentData.idle.value} trend={currentData.idle.trend} positive={currentData.idle.positive} />
        <HeroTile label={currentData.maintenance.label} value={currentData.maintenance.value} trend={currentData.maintenance.trend} positive={currentData.maintenance.positive} />
      </div>
    </div>
  )

  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {(["ALL", "ROAD", "SEA", "AIR"] as const).map(mode => (
        <Button 
          key={mode} 
          variant={activeMode === mode ? "default" : "ghost"} 
          size="sm" 
          className="h-8 text-sm"
          onClick={() => setActiveMode(mode)}
        >
          {mode === "ALL" ? "All Fleets" : mode}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 text-xs">Routes</Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs">Export</Button>
      </div>
    </div>
  )

  const fleetSections = [
    {
      title: "Fleet Utilization",
      subtitle: "Asset performance and allocation",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <FleetTile 
            label="Utilization Rate" 
            value={currentData.capacity.value} 
            trend={currentData.capacity.trend} 
            positive={currentData.capacity.positive} 
            icon={<Activity className="w-4 h-4 text-slate-500" />} 
          />
          <FleetTile 
            label="Maintenance" 
            value={currentData.maintenance.value} 
            trend={currentData.maintenance.trend} 
            positive={currentData.maintenance.positive}
            icon={<AlertTriangle className="w-4 h-4 text-slate-500" />}
          />
          <FleetTile label="Total Assets" value={currentData.active.value} trend={currentData.active.trend} />
          <FleetTile label="Idle / Parked" value={currentData.idle.value} trend={currentData.idle.trend} />
        </div>
      )
    },
    {
      title: "Route Health",
      subtitle: "Efficiency and reliability metrics",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">On-time arrivals</div>
              <div className="text-lg font-semibold text-slate-900">{currentData.ontime}</div>
            </div>
            <Truck className="w-5 h-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FleetTile label="Avg dwell" value={currentData.dwell} trend="-0.6" positive />
            <FleetTile label="Open exceptions" value={currentData.exceptions} trend="+2" />
          </div>
        </div>
      )
    },
    {
      title: "Safety & Compliance",
      subtitle: "Regulatory status and incidents",
      content: (
        <div className="space-y-2 text-sm">
          {[
            { name: "Inspections", value: currentData.inspections, trend: "+2%" },
            { name: "Incidents", value: currentData.incidents, trend: "-1" },
            { name: "Certifications", value: currentData.certifications, trend: "0%" },
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
    },
    {
      title: "Active Assets",
      subtitle: "Live tracking of key resources",
      className: "lg:col-span-3",
      content: (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden col-span-6">
          <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
            <div>Asset ID</div>
            <div>Status</div>
            <div>Location</div>
            <div className="text-right">Est. Arrival</div>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="grid grid-cols-4 gap-4 p-3 text-sm items-center hover:bg-slate-50 transition-colors">
                <div className="font-medium text-slate-900">
                  {activeMode === 'AIR' ? `AC-${900+i}` : activeMode === 'SEA' ? `VS-${400+i}` : `TR-${200+i}`}
                </div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${i % 3 === 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {i % 3 === 0 ? 'Delayed' : 'In Transit'}
                  </span>
                </div>
                <div className="text-slate-500 truncate">
                  {activeMode === 'AIR' ? 'Enroute to DXB' : activeMode === 'SEA' ? 'Pacific Ocean' : 'I-95 Northbound'}
                </div>
                <div className="text-right text-slate-900">
                  {i * 2 + 4}h remaining
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
      title="Fleet Management"
      description="Real-time tracking of asset utilization, maintenance, and route efficiency."
      hero={hero}
      filters={filters}
      sections={fleetSections}
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
