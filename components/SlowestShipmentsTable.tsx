'use client'

import { useState, useMemo } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowUpDown, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface SlowestShipmentsTableProps {
  data: any[]
}

type SortField = 'ORDERNO' | 'CONNAME' | 'MODE' | 'POL' | 'POD' | 'LINER_NAME' | 'Transit_Days_Planed' | 'Transit_Days_Actual'
type SortOrder = 'asc' | 'desc'

export function SlowestShipmentsTable({ data }: SlowestShipmentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('Transit_Days_Planed')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Filter by search query
    let filtered = data
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = data.filter((row: any) => {
        return (
          (row.ORDERNO && String(row.ORDERNO).toLowerCase().includes(query)) ||
          (row.CONNAME && String(row.CONNAME).toLowerCase().includes(query)) ||
          (row.MODE && String(row.MODE).toLowerCase().includes(query)) ||
          (row.POL && String(row.POL).toLowerCase().includes(query)) ||
          (row.POD && String(row.POD).toLowerCase().includes(query)) ||
          (row.LINER_NAME && String(row.LINER_NAME).toLowerCase().includes(query)) ||
          (row.CONTMAWB && String(row.CONTMAWB).toLowerCase().includes(query)) ||
          (row.CONT_CONTSIZE && String(row.CONT_CONTSIZE).toLowerCase().includes(query))
        )
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1

      // Convert to strings for comparison if not numbers
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [data, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
    >
      {label}
      <ArrowUpDown className={cn(
        "h-3 w-3",
        sortField === field ? "text-slate-900 dark:text-slate-50" : "text-slate-400 dark:text-slate-500"
      )} />
    </button>
  )

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No slowest shipment data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by order, consignee, mode, origin, destination, liner, container..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
        Showing {processedData.length} {processedData.length === 1 ? 'result' : 'results'}
        {searchQuery && ` for "${searchQuery}"`}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-900 sticky top-0 z-10">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="ORDERNO" label="Order No" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="CONNAME" label="Consignee" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="MODE" label="Mode" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="POL" label="Origin" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="POD" label="Destination" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="LINER_NAME" label="Liner" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                Container
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                Size
              </th>
              <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="Transit_Days_Planed" label="Transit (Planned)" />
              </th>
              <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="Transit_Days_Actual" label="Transit (Actual)" />
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No results found for "{searchQuery}"
                </td>
              </tr>
            ) : (
              processedData.map((row: any, idx: number) => (
                <tr 
                  key={idx}
                  className={cn(
                    "border-t border-slate-100 dark:border-zinc-800",
                    "hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                  )}
                >
                  <td className="p-3 text-slate-900 dark:text-slate-50 font-medium">
                    {row.ORDERNO || 'N/A'}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {row.CONNAME || 'N/A'}
                  </td>
                  <td className="p-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      row.MODE === 'SEA' 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    )}>
                      {row.MODE || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {row.POL || 'N/A'}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {row.POD || 'N/A'}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {row.LINER_NAME || 'N/A'}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {row.CONTMAWB || 'N/A'}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {row.CONT_CONTSIZE || 'N/A'}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    <span className={cn(
                      "font-semibold",
                      row.Transit_Days_Planed > 60 
                        ? "text-red-700 dark:text-red-400"
                        : row.Transit_Days_Planed > 40
                          ? "text-orange-700 dark:text-orange-400"
                          : "text-slate-700 dark:text-slate-300"
                    )}>
                      {row.Transit_Days_Planed != null ? `${row.Transit_Days_Planed} days` : 'N/A'}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    <span className={cn(
                      "font-semibold",
                      row.Transit_Days_Actual > 60 
                        ? "text-red-700 dark:text-red-400"
                        : row.Transit_Days_Actual > 40
                          ? "text-orange-700 dark:text-orange-400"
                          : "text-slate-700 dark:text-slate-300"
                    )}>
                      {row.Transit_Days_Actual != null ? `${row.Transit_Days_Actual} days` : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
