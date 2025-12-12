import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowUpRight, ArrowDownRight, HeartHandshake } from "lucide-react"

const customerSections = [
  {
    title: "Top Customers",
    subtitle: "Illustrative cards to show design language",
    content: (
      <div className="grid grid-cols-2 gap-3">
        <CustomerTile name="Acme Retail" value="312 shipments" trend="+12%" positive />
        <CustomerTile name="Northwind Imports" value="245 shipments" trend="+4%" positive />
        <CustomerTile name="Oceanic Foods" value="210 shipments" trend="-2%" />
        <CustomerTile name="BlueJet Air" value="188 shipments" trend="+6%" positive />
      </div>
    )
  },
  {
    title: "Engagement & CSAT",
    subtitle: "Sample placeholders",
    content: (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div className="text-xs text-slate-500">CSAT</div>
            <div className="text-lg font-semibold text-slate-900">4.6 / 5</div>
          </div>
          <Users className="w-5 h-5 text-slate-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CustomerTile name="Open cases" value="8" trend="+1" />
          <CustomerTile name="Resolved this week" value="42" trend="+5" positive />
        </div>
      </div>
    )
  }
]

function CustomersPageContent() {
  const hero = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-800 to-fuchsia-700 text-white p-5 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-fuchsia-100">
          <HeartHandshake className="w-4 h-4" /> Customer health
        </div>
        <div className="text-2xl font-semibold">Engagement pulse</div>
        <p className="text-sm text-fuchsia-100 max-w-xs">Service quality, satisfaction, and retention indicators.</p>
        <Button size="sm" variant="secondary" className="text-slate-900">View playbooks</Button>
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="NPS" value="62" trend="+4" positive />
        <HeroTile label="CSAT" value="4.6 / 5" trend="+0.2" positive />
      </div>
      <div className="rounded-xl bg-white/10 border border-white/10 p-4 space-y-3">
        <HeroTile label="Churn risk" value="3.1%" trend="-0.4" positive />
        <HeroTile label="Active tickets" value="18" trend="+2" />
      </div>
    </div>
  )

  const filters = (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {["All", "Strategic", "Growth", "Watch"].map(tag => (
        <Button key={tag} variant={tag === "Strategic" ? "default" : "ghost"} size="sm" className="h-8 text-sm">
          {tag}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 text-xs">Notes</Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs">Share</Button>
      </div>
    </div>
  )

  const extendedSections = [
    ...customerSections,
    {
      title: "Segments",
      subtitle: "Illustrative rows to fill space",
      content: (
        <div className="space-y-2 text-sm">
          {[
            { name: "Enterprise", size: "24 accounts", trend: "+2" },
            { name: "Mid-market", size: "46 accounts", trend: "+5" },
            { name: "SMB", size: "81 accounts", trend: "-3" },
          ].map(seg => (
            <div key={seg.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div className="font-semibold text-slate-900">{seg.name}</div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{seg.size}</span>
                <span className={seg.trend.startsWith("-") ? "text-amber-600 text-xs" : "text-emerald-600 text-xs"}>{seg.trend}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  return (
    <PremiumPageShell
      title="Customers"
      description="Customer analytics and service health placeholders."
      hero={hero}
      filters={filters}
      sections={extendedSections}
      active="customers"
      columns={2}
    />
  )
}

function CustomerTile({ name, value, trend, positive }: { name: string; value: string; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  const trendColor = positive ? "text-emerald-600" : "text-amber-600"

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500 font-medium">{name}</CardTitle>
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
      <div className="text-xs uppercase text-fuchsia-100">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" /> {trend}
      </div>
    </div>
  )
}

export default function CustomersPage() {
  return <CustomersPageContent />
}
