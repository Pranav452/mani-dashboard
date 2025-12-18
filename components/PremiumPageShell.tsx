import Link from "next/link"
import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon, FilterX } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

type PremiumSection = {
  title: string
  subtitle?: string
  content: ReactNode
  className?: string
}

type PremiumPageShellProps = {
  title: string
  description: string
  sections: PremiumSection[]
  active?: "dashboard" | "financials" | "customers" | "fleet" | "reports"
  hero?: ReactNode
  filters?: ReactNode
  columns?: 1 | 2 | 3
}

export function PremiumPageShell({ title, description, sections, active = "financials", hero, filters, columns = 2 }: PremiumPageShellProps) {
  const gridCols = columns === 3 ? "lg:grid-cols-3" : columns === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white/90 border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className={`font-medium ${active === "dashboard" ? "text-slate-900 bg-slate-100" : "text-slate-500 hover:text-slate-900"}`}>
              <Link href="/">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={`font-medium ${active === "financials" ? "text-slate-900 bg-slate-100" : "text-slate-500 hover:text-slate-900"}`}>
              <Link href="/financials">Financials</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={`font-medium ${active === "customers" ? "text-slate-900 bg-slate-100" : "text-slate-500 hover:text-slate-900"}`}>
              <Link href="/environmental">Environmental Impact</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={`font-medium ${active === "fleet" ? "text-slate-900 bg-slate-100" : "text-slate-500 hover:text-slate-900"}`}>
              <Link href="/fleet">Fleet</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={`font-medium ${active === "reports" ? "text-slate-900 bg-slate-100" : "text-slate-500 hover:text-slate-900"}`}>
              <Link href="/reports">Reports</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-5 space-y-5">
        {hero}

        {filters ?? (
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <Select defaultValue="ytd">
              <SelectTrigger className="h-9 text-sm w-[140px] border-slate-200 bg-white">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 text-sm px-3 border-slate-200 bg-white hover:bg-slate-50">
                  <CalendarIcon className="w-4 h-4 mr-2" /> Date range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" numberOfMonths={2} />
              </PopoverContent>
            </Popover>
            <Input placeholder="Filter..." className="h-9 text-sm w-[200px] bg-slate-50 border-slate-200" />
            <Button variant="outline" size="sm" className="h-9 text-sm border-slate-200">
              <FilterX className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        )}

        <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
          {sections.map(section => (
            <Card key={section.title} className={`border border-slate-200 shadow-sm ${section.className || ""}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">{section.title}</CardTitle>
                {section.subtitle && <CardDescription className="text-xs text-slate-500">{section.subtitle}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">{section.content}</CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
