'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon, FilterX, Search, Download, Snowflake } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DashboardFilters } from "@/app/actions"

interface DashboardFilterPanelProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  onApply: () => void
  onExport?: () => void
  clientGroups?: Array<{ label: string; value: string }>
  offices?: string[]
  loading?: boolean
  showSnow?: boolean
  onToggleSnow?: () => void
}

export function DashboardFilterPanel({
  filters,
  onFiltersChange,
  onApply,
  onExport,
  clientGroups = [],
  offices = [],
  loading = false,
  showSnow = false,
  onToggleSnow
}: DashboardFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: localFilters.dateFrom ? parseYYYYMMDD(localFilters.dateFrom) : undefined,
    to: localFilters.dateTo ? parseYYYYMMDD(localFilters.dateTo) : undefined
  })

  // Helper to parse YYYYMMDD string to Date
  function parseYYYYMMDD(dateStr: string): Date | undefined {
    if (!dateStr || dateStr.length !== 8) return undefined
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))
    return new Date(year, month, day)
  }

  // Helper to format Date to YYYYMMDD
  function formatYYYYMMDD(date: Date | undefined): string | null {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  // Update local filters when date range changes
  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      dateFrom: formatYYYYMMDD(dateRange.from),
      dateTo: formatYYYYMMDD(dateRange.to)
    }))
  }, [dateRange])

  const handleModeChange = (mode: string) => {
    const newFilters = {
      ...localFilters,
      mode: mode === 'ALL' ? null : mode
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClientChange = (client: string) => {
    const newFilters = {
      ...localFilters,
      client: client === 'ALL' ? null : client
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleOfficeChange = (office: string) => {
    const newFilters = {
      ...localFilters,
      office: office === 'ALL' ? null : office
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters: DashboardFilters = {
      mode: null,
      client: null,
      dateFrom: null,
      dateTo: null,
      office: null
    }
    setLocalFilters(resetFilters)
    setDateRange({ from: undefined, to: undefined })
    setSearchQuery("")
    onFiltersChange(resetFilters)
    onApply()
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    onApply()
  }

  // List of unique offices from POL codes
  const officeOptions = ['NH1', 'BOM', 'MAA', 'BLR', 'CCU', 'KH1', 'DEL', 'JNPT', 'CHN', ...offices]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

  return (
    <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800 sticky top-16 z-30">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Filter */}
          <Select 
            value={localFilters.mode || 'ALL'} 
            onValueChange={handleModeChange}
            disabled={loading}
          >
            <SelectTrigger className="h-9 text-sm w-[130px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Modes</SelectItem>
              <SelectItem value="SEA">Sea</SelectItem>
              <SelectItem value="AIR">Air</SelectItem>
              <SelectItem value="SEA-AIR">Sea-Air</SelectItem>
            </SelectContent>
          </Select>

          {/* Office Filter */}
          <Select 
            value={localFilters.office || 'ALL'} 
            onValueChange={handleOfficeChange}
            disabled={loading}
          >
            <SelectTrigger className="h-9 text-sm w-[130px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800">
              <SelectValue placeholder="Office" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Offices</SelectItem>
              {officeOptions.map(office => (
                <SelectItem key={office} value={office}>{office}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={loading}
                className={cn(
                  "h-9 text-sm w-[240px] justify-start text-left font-normal border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800",
                  !dateRange.from && "text-slate-500 dark:text-slate-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  <span>Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Client Filter - Only show if there are multiple clients */}
          {clientGroups.length > 1 && (
            <Select 
              value={localFilters.client || 'ALL'} 
              onValueChange={handleClientChange}
              disabled={loading}
            >
              <SelectTrigger className="h-9 text-sm w-[180px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Clients</SelectItem>
                {clientGroups.map(group => (
                  <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search shipments..." 
              className="pl-9 h-9 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-950"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Apply Button */}
            <Button 
              variant="default" 
              size="sm" 
              className="h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>

            {/* Reset Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 text-sm border-red-200 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 hover:text-red-700 dark:text-red-400" 
              onClick={handleReset}
              disabled={loading}
            >
              <FilterX className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" /> Reset
            </Button>

            {/* Export Button */}
            {onExport && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800" 
                onClick={onExport}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            )}

            {/* Snow Toggle */}
            {onToggleSnow && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 p-0"
                onClick={onToggleSnow}
                disabled={loading}
              >
                <Snowflake className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
