'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, ArrowUpDown, MapPin, Plane } from 'lucide-react'

interface AirLanesTableProps {
  data: {
    laneStats: {
      name: string
      weight: number
      shipments: number
    }[]
  }
}

type SortField = 'ROUTE' | 'ORIGIN' | 'DEST' | 'WEIGHT' | 'FLIGHTS'
type SortOrder = 'asc' | 'desc'

export function AirLanesTable({ data }: AirLanesTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('FLIGHTS')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const processedData = useMemo(() => {
    if (!data?.laneStats || data.laneStats.length === 0) return []

    const withDerived = data.laneStats.map(row => {
      const parts = row.name.split(' → ')
      const origin = parts[0] || 'Unknown'
      const dest = parts[1] || 'Unknown'

      return {
        ...row,
        ORIGIN: origin,
        DEST: dest,
      }
    })

    let filtered = withDerived

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(row => {
        return (
          row.ORIGIN.toLowerCase().includes(q) ||
          row.DEST.toLowerCase().includes(q) ||
          row.name.toLowerCase().includes(q)
        )
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1

      const getValue = (row: any): any => {
        switch (sortField) {
          case 'ROUTE': return row.name
          case 'ORIGIN': return row.ORIGIN
          case 'DEST': return row.DEST
          case 'WEIGHT': return row.weight
          case 'FLIGHTS': return row.shipments
          default: return row.shipments
        }
      }

      let av = getValue(a)
      let bv = getValue(b)

      if (av == null && bv == null) return 0
      if (av == null) return 1 * dir
      if (bv == null) return -1 * dir

      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()

      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })

    return sorted
  }, [data.laneStats, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
    >
      {label}
      <ArrowUpDown className="w-3 h-3 text-slate-400" />
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by origin or destination port..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-4 px-2">
            Showing {processedData.length} routing paths
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-zinc-900/80 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="ORIGIN" label="Origin" />
                    </th>
                    <th className="w-[100px] text-center px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="DEST" label="Destination" />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="WEIGHT" label="Total Weight (Tons)" />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                      <div className="flex justify-end"><SortButton field="FLIGHTS" label="Total Flights" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {processedData.length > 0 ? (
                    processedData.map((row, i) => (
                      <tr key={i} className="hover:bg-sky-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-base">{row.ORIGIN}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Origin</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center text-sky-400 opacity-80">
                            <Plane className="w-5 h-5 mb-1.5" />
                            <div className="h-px w-12 bg-sky-200 dark:bg-sky-800" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-base">{row.DEST}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Destination</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 tabular-nums font-semibold">
                          {row.weight.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-base font-bold text-sky-600 dark:text-sky-400 tabular-nums">{row.shipments}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500 bg-slate-50/50 dark:bg-zinc-900/30">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                          <p className="font-medium text-slate-600 dark:text-slate-400">No routings found matching your criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
