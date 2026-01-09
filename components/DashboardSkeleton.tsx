import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex flex-col">
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </nav>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Matching the actual grid layout */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-5">

        {/* MAIN LAYOUT GRID - Left column main content, right column sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5 items-stretch">

          {/* LEFT COLUMN (MAIN CONTENT) */}
          <div className="flex flex-col space-y-6 min-h-0">

            {/* SECTION 1: DELIVERIES (METRICS) */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 3 Metric Cards */}
                  {Array.from({ length: 3 }, (_, i) => (
                    <Card key={i} className="shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="w-10 h-10 rounded-lg" />
                        </div>
                        <div className="flex items-end justify-between mb-4">
                          <Skeleton className="h-8 w-12" />
                          <Skeleton className="h-3 w-8" />
                        </div>
                        <Skeleton className="h-12 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: SHIPMENT VOLUME ANALYSIS */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden flex-1 min-h-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <Skeleton className="h-5 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <Skeleton className="h-80 w-full rounded-none" />
              </CardContent>
            </Card>

            {/* SECTION 3: RECENT ACTIVITY */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-12 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (SIDE PANEL) */}
          <div className="flex flex-col space-y-4 lg:space-y-1.5 min-h-0 lg:w-[340px]">

            {/* QUICK SNAPSHOT */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 lg:h-[380px] mb-6">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {/* 4 Mini metric cards */}
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border border-slate-100">
                    <Skeleton className="h-3 w-12 mb-1" />
                    <div className="flex items-end justify-between mb-2">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* TOP CLIENTS BY VOLUME */}
            <Card className="shadow-none border border-slate-200 rounded-xl overflow-hidden flex-1">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Skeleton className="h-4 w-12 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="w-16 h-2 rounded-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
