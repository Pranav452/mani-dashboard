import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-slate-50">

      {/* Header */}
      <header className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded bg-slate-200 dark:bg-zinc-800" />
            <div className="flex flex-col">
              <Skeleton className="h-6 w-48 mb-1 bg-slate-200 dark:bg-zinc-800" />
              <Skeleton className="h-3 w-32 bg-slate-200 dark:bg-zinc-800" />
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-zinc-800" />
          </nav>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800 sticky top-16 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-9 w-32 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-9 w-32 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-9 w-32 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-9 w-32 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-9 w-40 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-9 w-24 bg-slate-200 dark:bg-zinc-800" />
            <Skeleton className="h-9 w-20 bg-slate-200 dark:bg-zinc-800" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-9 w-20 bg-slate-200 dark:bg-zinc-800" />
              <Skeleton className="h-9 w-16 bg-slate-200 dark:bg-zinc-800" />
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
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24 bg-slate-200 dark:bg-zinc-800" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 3 Metric Cards */}
                  {Array.from({ length: 3 }, (_, i) => (
                    <Card key={i} className="shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-zinc-800" />
                          <Skeleton className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-zinc-800" />
                        </div>
                        <div className="flex items-end justify-between mb-4">
                          <Skeleton className="h-8 w-12 bg-slate-200 dark:bg-zinc-800" />
                          <Skeleton className="h-3 w-8 bg-slate-200 dark:bg-zinc-800" />
                        </div>
                        <Skeleton className="h-12 w-full bg-slate-200 dark:bg-zinc-800" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: SHIPMENT VOLUME ANALYSIS */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-1 min-h-0 bg-white dark:bg-zinc-900">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <Skeleton className="h-5 w-48 bg-slate-200 dark:bg-zinc-800" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-16 bg-slate-200 dark:bg-zinc-800" />
                  <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-zinc-800" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <Skeleton className="h-80 w-full rounded-none bg-slate-200 dark:bg-zinc-800" />
              </CardContent>
            </Card>

            {/* SECTION 3: RECENT ACTIVITY */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32 bg-slate-200 dark:bg-zinc-800" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1 bg-slate-200 dark:bg-zinc-800" />
                          <Skeleton className="h-3 w-24 bg-slate-200 dark:bg-zinc-800" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-12 mb-1 bg-slate-200 dark:bg-zinc-800" />
                        <Skeleton className="h-3 w-16 bg-slate-200 dark:bg-zinc-800" />
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
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-shrink-0 lg:h-[380px] mb-6 bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-28 bg-slate-200 dark:bg-zinc-800" />
                <Skeleton className="h-3 w-40 bg-slate-200 dark:bg-zinc-800" />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {/* 4 Mini metric cards */}
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <Skeleton className="h-3 w-12 mb-1 bg-slate-200 dark:bg-zinc-800" />
                    <div className="flex items-end justify-between mb-2">
                      <Skeleton className="h-5 w-8 bg-slate-200 dark:bg-zinc-800" />
                      <Skeleton className="h-3 w-8 bg-slate-200 dark:bg-zinc-800" />
                    </div>
                    <Skeleton className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* TOP CLIENTS BY VOLUME */}
            <Card className="shadow-none border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-1 bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-36 bg-slate-200 dark:bg-zinc-800" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-24 mb-1 bg-slate-200 dark:bg-zinc-800" />
                        <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-zinc-800" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Skeleton className="h-4 w-12 mb-1 bg-slate-200 dark:bg-zinc-800" />
                        <Skeleton className="h-3 w-16 bg-slate-200 dark:bg-zinc-800" />
                      </div>
                      <Skeleton className="w-16 h-2 rounded-full bg-slate-200 dark:bg-zinc-800" />
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
