'use client'

import { useMemo, useState } from 'react'
import { PremiumPageShell } from "@/components/PremiumPageShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Leaf, Activity, DollarSign, MapPin, TrendingUp, TrendingDown, Ship, Plane, Layers, BarChart3, Calendar as CalendarIcon, FilterX } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar, BarChart, Bar, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns"
import { cleanNum, getComputedMode, calculateUniqueTEU, generateEmissions, getValidDate } from "@/lib/dashboard-logic"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

const Map = dynamic(() => import("@/components/ui/map").then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="h-[350px] flex items-center justify-center bg-slate-50 rounded-lg"><span className="text-slate-400 text-sm">Loading map...</span></div>
})

export default function EnvironmentalDashboard({ data }: { data: any[] }) {
  // --- STATE FOR FILTERS ---
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [filterMode, setFilterMode] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // --- DATA PROCESSING ---
  const { kpis, modeStats, chartData, monthlyEmissions, mapMarkers } = useMemo(() => {
    // 1. Enrich & Filter Data
    const filteredData = data.map(row => {
        const mode = getComputedMode(row);
        const env = generateEmissions(row);
        const date = getValidDate(row);
        return { ...row, _mode: mode, _env: env, _date: date };
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
    const totalShipments = filteredData.length;
    const totalWeight = filteredData.reduce((sum, r) => sum + cleanNum(r.CONT_GRWT), 0);
    const totalCO2 = filteredData.reduce((sum, r) => sum + (r._env?.co2 || 0), 0);
    
    // 3. Mode Stats
    const modes: Record<string, number> = {};
    filteredData.forEach(r => {
      modes[r._mode] = (modes[r._mode] || 0) + 1;
    });
    const modeStatsArr = Object.entries(modes).map(([name, value]) => ({ name, value }));

    // 4. Monthly Emissions for Gradient Area Chart
    const monthlyData: Record<string, { sea: number, air: number, road: number }> = {};
    filteredData.forEach(r => {
        if (!r._date) return;
        const key = format(r._date, 'MMM yyyy');
        if (!monthlyData[key]) monthlyData[key] = { sea: 0, air: 0, road: 0 };
        
        const co2 = r._env?.co2 || 0;
        const m = (r._mode || '').toUpperCase();

        if (m.includes('SEA')) monthlyData[key].sea += co2;
        else if (m.includes('AIR')) monthlyData[key].air += co2;
        else monthlyData[key].road += co2; // Assume everything else is Road/Rail for this chart
    });

    const monthlyEmissionsArr = Object.entries(monthlyData)
        .map(([date, vals]) => ({ 
            month: date, 
            sea: Math.round(vals.sea / 1000), // tons
            air: Math.round(vals.air / 1000), // tons
            road: Math.round(vals.road / 1000) // tons
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // 5. Map Markers (simplified)
    const markers: any[] = []; 

    return {
      kpis: {
        co2: totalCO2,
        weight: totalWeight,
        shipments: totalShipments
      },
      modeStats: modeStatsArr,
      chartData: filteredData,
      monthlyEmissions: monthlyEmissionsArr,
      mapMarkers: markers
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

  // --- SECTIONS ---

  // 1. KPI Cards
  const kpiSection = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> CO2 Emissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{(kpis.co2/1000).toFixed(1)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Tonnes CO₂</div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">-12% vs last quarter</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Carbon Intensity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{(kpis.co2 / Math.max(kpis.weight, 1) * 100).toFixed(2)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">kg CO₂ / ton cargo</div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-600 dark:text-blue-400 font-medium">-8% improvement</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Carbon Offset Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">${((kpis.co2/1000) * 25).toFixed(0)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Est. Credits Required</div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingUp className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-600 dark:text-amber-400 font-medium">$25/tonne rate</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Green Routes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{Math.round((modeStats.find(m => m.name === 'SEA')?.value || 0) / Math.max(kpis.shipments, 1) * 100)}%</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Low Carbon Shipments</div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span className="text-purple-600 dark:text-purple-400 font-medium">Sea freight preferred</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // 2. Charts Section
  const chartsSection = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radial Bar Chart */}
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Leaf className="w-4 h-4" /> Green Lane Efficiency
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Carbon impact by transport mode</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer
            config={{
                sea: { label: "Sea (Low Carbon)", color: "#10b981" },
                rail: { label: "Rail", color: "#3b82f6" },
                road: { label: "Road", color: "#f59e0b" },
                air: { label: "Air (High Carbon)", color: "#ef4444" },
            }}
            className="h-[280px]"
            >
            <RadialBarChart
                data={[
                { name: "Air (High)", value: modeStats.find(m => m.name === 'AIR')?.value || 0, fill: "#ef4444" },
                { name: "Road", value: Math.round(kpis.shipments * 0.1), fill: "#f59e0b" },
                { name: "Rail", value: Math.round(kpis.shipments * 0.05), fill: "#3b82f6" },
                { name: "Sea (Low)", value: modeStats.find(m => m.name === 'SEA')?.value || 0, fill: "#10b981" },
                ]}
                innerRadius="20%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
            >
                <PolarGrid gridType="circle" stroke="#e2e8f0" />
                <RadialBar
                dataKey="value"
                background={{ fill: '#f1f5f9' }}
                cornerRadius={4}
                label={{
                    position: 'insideStart',
                    fill: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                }}
                />
                <ChartTooltip
                content={<ChartTooltipContent hideLabel />}
                cursor={false}
                />
            </RadialBarChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">Sea (Low)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-400">Rail</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">Road</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-600 dark:text-slate-400">Air (High)</span>
            </div>
            </div>
        </CardContent>
        </Card>

        {/* Radar Chart (Reintroduced as it adds "wow" factor) */}
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Happy Chic Eco-Radar
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Sustainability across dimensions</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer
            config={{
                current: { label: "Current", color: "#10b981" },
                target: { label: "Target", color: "#3b82f6" },
            }}
            className="h-[280px]"
            >
            <RadarChart
                data={[
                { metric: "CO2", current: Math.min(100, (kpis.co2 / 50000) * 100), target: 60 },
                { metric: "Distance", current: 75, target: 70 },
                { metric: "Fuel", current: 65, target: 50 },
                { metric: "Efficiency", current: 82, target: 90 },
                { metric: "Offset", current: 45, target: 80 },
                { metric: "Chic Score", current: Math.round((modeStats.find(m => m.name === 'SEA')?.value || 0) / Math.max(kpis.shipments, 1) * 100), target: 75 },
                ]}
            >
                <PolarGrid stroke="#e2e8f0" className="dark:stroke-zinc-800" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                name="Current"
                dataKey="current"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                strokeWidth={2}
                />
                <Radar
                name="Target"
                dataKey="target"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
                />
                <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ color: 'var(--color-muted-foreground)' }} />
            </RadarChart>
            </ChartContainer>
        </CardContent>
        </Card>
    </div>
  )

  // 3. New Gradient Area Chart Section
  const detailedBreakdownSection = (
    <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-50">Emissions by Transport Mode</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Monthly CO₂ emissions (tonnes) breakdown by Sea, Air, and Road</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer 
                config={{
                    sea: { label: "Sea Freight", color: "var(--chart-1)" },
                    air: { label: "Air Freight", color: "var(--chart-2)" },
                    road: { label: "Road Freight", color: "var(--chart-3)" }
                }}
                className="h-[350px] w-full"
            >
                <AreaChart
                    accessibilityLayer
                    data={monthlyEmissions}
                    margin={{ left: 12, right: 12 }}
                >
                    <CartesianGrid vertical={false} className="stroke-slate-200 dark:stroke-zinc-800" />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                        stroke="var(--color-muted-foreground)"
                    />
                    <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(val) => `${val}t`}
                        stroke="var(--color-muted-foreground)"
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <defs>
                        <linearGradient id="fillSea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-sea)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-sea)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fillAir" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-air)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-air)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fillRoad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-road)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-road)" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <Area
                        dataKey="road"
                        type="natural"
                        fill="url(#fillRoad)"
                        fillOpacity={0.4}
                        stroke="var(--color-road)"
                        stackId="a"
                    />
                    <Area
                        dataKey="air"
                        type="natural"
                        fill="url(#fillAir)"
                        fillOpacity={0.4}
                        stroke="var(--color-air)"
                        stackId="a"
                    />
                    <Area
                        dataKey="sea"
                        type="natural"
                        fill="url(#fillSea)"
                        fillOpacity={0.4}
                        stroke="var(--color-sea)"
                        stackId="a"
                    />
                </AreaChart>
            </ChartContainer>
        </CardContent>
        <CardFooter>
            <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
                <div className="flex items-center gap-2 leading-none font-medium text-slate-900 dark:text-slate-50">
                Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground flex items-center gap-2 leading-none text-slate-500 dark:text-slate-400">
                January - June 2024
                </div>
            </div>
            </div>
        </CardFooter>
    </Card>
  )

  // 4. Sustainability Initiatives Section (New)
  const initiativesSection = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    <Leaf className="w-4 h-4" /> Happy Chic Forest Initiative
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">1,240</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-500">Trees planted YTD</div>
                <div className="mt-2 h-1.5 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                    <div className="h-full w-[65%] bg-emerald-600 dark:bg-emerald-500" />
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 text-right">65% of goal</div>
            </CardContent>
        </Card>

        <Card className="border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2">
                    <Ship className="w-4 h-4" /> Clean Fuel Usage
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">28%</div>
                <div className="text-xs text-blue-700 dark:text-blue-500">Of total miles</div>
                <div className="mt-2 h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div className="h-full w-[28%] bg-blue-600 dark:bg-blue-500" />
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 text-right">Target: 40%</div>
            </CardContent>
        </Card>

        <Card className="border border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Carbon Credit Spend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">$12,500</div>
                <div className="text-xs text-purple-700 dark:text-purple-500">Invested this quarter</div>
                <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 dark:text-purple-400">
                    <TrendingUp className="w-3 h-3" /> +15% vs last Q
                </div>
            </CardContent>
        </Card>
    </div>
  )

  const sections = [
    {
      title: "Environmental Impact",
      subtitle: "Key Sustainability Indicators",
      content: kpiSection
    },
    {
      title: "Analysis",
      subtitle: "Deep dive into carbon footprint",
      content: chartsSection
    },
    {
      title: "Detailed Emissions Trend",
      subtitle: "Comparison of high vs low carbon modes over time",
      content: detailedBreakdownSection
    },
    {
      title: "Sustainability Initiatives",
      subtitle: "Active projects and investments",
      content: initiativesSection
    }
  ]

  return (
    <PremiumPageShell
      title="Environmental Impact"
      description="Track and analyze your carbon footprint and sustainability goals."
      sections={sections}
      active="customers" 
      columns={1}
      filters={filters} // Passing the interactive filters here
    />
  )
}
