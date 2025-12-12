'use client'

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type PremiumPageShellSkeletonProps = {
  active?: "dashboard" | "financials" | "customers" | "fleet" | "reports"
  showHero?: boolean
  showFilters?: boolean
  columns?: 1 | 2 | 3
  sectionsCount?: number
  delay?: number // Delay in ms before showing skeleton (default 200ms)
}

export function PremiumPageShellSkeleton({
  active = "financials",
  showHero = true,
  showFilters = true,
  columns = 2,
  sectionsCount = 3,
  delay = 200 // Default 200ms delay to avoid flash
}: PremiumPageShellSkeletonProps) {
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const gridCols = columns === 3 ? "lg:grid-cols-3" : columns === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2"

  if (!showSkeleton) {
    return null // Don't show anything until delay passes
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white/90 border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {["Dashboard", "Financials", "Customers", "Fleet", "Reports"].map((tab) => (
              <Skeleton key={tab} className="h-8 w-20" />
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* Hero Section */}
        {showHero && (
          <div className="rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 p-5 shadow-lg animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        )}

        {/* Sections Grid */}
        <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
          {Array.from({ length: sectionsCount }, (_, i) => (
            <Card key={i} className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Content varies by section, using generic skeleton blocks */}
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-8 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
