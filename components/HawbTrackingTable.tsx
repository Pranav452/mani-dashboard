'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Package, Search, ArrowUpDown, Plane } from 'lucide-react'

interface HawbTrackingTableProps {
  data: any[]
}

type SortField =
  | 'HAWB'
  | 'ORDERNO'
  | 'POL'
  | 'POD'
  | 'WEIGHT'
  | 'STATUS'

type SortOrder = 'asc' | 'desc'

export function HawbTrackingTable({ data }: HawbTrackingTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('HAWB')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const withDerived = data.map(row => {
      const hawbRaw = String(row.CONTMAWB || row.MAWB || 'Pending')
      let hawbDisplay = hawbRaw
      if (hawbRaw !== 'Pending') {
        if (hawbRaw.includes(',')) {
          const parts = hawbRaw.split(',').map(p => p.trim())
          hawbDisplay = Array.from(new Set(parts)).join(', ')
        } else if (hawbRaw.length % 2 === 0) {
          const half = hawbRaw.length / 2
          if (hawbRaw.substring(0, half) === hawbRaw.substring(half)) {
            hawbDisplay = hawbRaw.substring(0, half)
          }
        }
      }

      return {
        ...row,
        HAWB_DISPLAY: hawbDisplay,
        WEIGHT_TONS: row.CONT_GRWT ? (Number(row.CONT_GRWT) / 1000) : 0,
        _status: row.SHPTSTATUS || 'In Transit'
      }
    })

    let filtered = withDerived

    if (statusFilter !== 'all') {
      filtered = filtered.filter(row => row._status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(row => {
        return (
          String(row.HAWB_DISPLAY).toLowerCase().includes(q) ||
          String(row.ORDERNO ?? '').toLowerCase().includes(q) ||
          String(row.POL ?? '').toLowerCase().includes(q) ||
          String(row.POD ?? '').toLowerCase().includes(q) ||
          String(row._status).toLowerCase().includes(q)
        )
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1

      const getValue = (row: any): any => {
        switch (sortField) {
          case 'HAWB': return row.HAWB_DISPLAY
          case 'ORDERNO': return row.ORDERNO
          case 'POL': return row.POL
          case 'POD': return row.POD
          case 'WEIGHT': return row.WEIGHT_TONS
          case 'STATUS': return row._status
          default: return row.HAWB_DISPLAY
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
  }, [data, searchQuery, sortField, sortOrder, statusFilter])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
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

  const allStatuses = useMemo(() => {
    if (!data) return []
    const statuses = new Set(data.map(r => r.SHPTSTATUS || 'In Transit'))
    return Array.from(statuses).sort()
  }, [data])

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by HAWB, order, origin, destination..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
          <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                statusFilter === 'all' 
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-50 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              All
            </button>
            {allStatuses.map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  statusFilter === status 
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-50 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-4 px-2">
            Showing {processedData.length} air waybills
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-zinc-900/80 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="HAWB" label="HAWB No." />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="ORDERNO" label="Order No." />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="POL" label="Origin" />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="POD" label="Destination" />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <SortButton field="WEIGHT" label="Weight (Tons)" />
                    </th>
                    <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                      <div className="flex justify-end"><SortButton field="STATUS" label="Status" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {processedData.length > 0 ? (
                    processedData.map((row, i) => (
                      <tr key={i} className="hover:bg-sky-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-6 py-3 font-medium text-sky-600 dark:text-sky-400">{row.HAWB_DISPLAY}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300 font-medium">{row.ORDERNO || 'N/A'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300 font-semibold">{row.POL || 'Unknown'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300 font-semibold">{row.POD || 'Unknown'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300 tabular-nums">
                          {row.WEIGHT_TONS.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 shadow-sm">
                            {row._status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500 bg-slate-50/50 dark:bg-zinc-900/30">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Plane className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                          <p className="font-medium text-slate-600 dark:text-slate-400">No waybills found matching your criteria.</p>
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
