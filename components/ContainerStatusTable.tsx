'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Package, Search, ArrowUpDown } from 'lucide-react'

interface ContainerStatusTableProps {
  data: any[]
}

type ShipmentStatus = 'late' | 'ontime' | 'early' | 'in-progress'
type SortField =
  | 'CONTAINER'
  | 'ORDERNO'
  | 'CONNAME'
  | 'MODE'
  | 'POL'
  | 'POD'
  | 'LINER_NAME'
  | 'CONT_CONTSIZE'
  | 'Transit_Days_Planed'
  | 'Transit_Days_Actual'
  | 'status'
  | 'variance'
type SortOrder = 'asc' | 'desc'

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  late: 'Late',
  'in-progress': 'In Progress',
  ontime: 'On Time',
  early: 'Early',
}

function getStatus(planned: number, actual: number | null | undefined): ShipmentStatus {
  if (actual == null || Number.isNaN(actual)) return 'in-progress'
  if (actual > planned) return 'late'
  if (actual === planned) return 'ontime'
  return 'early'
}

function getStatusBadgeClass(status: ShipmentStatus) {
  switch (status) {
    case 'late':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    case 'ontime':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    case 'early':
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
    case 'in-progress':
    default:
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
  }
}

export function ContainerStatusTable({ data }: ContainerStatusTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('Transit_Days_Planed')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all')

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const withDerived = data.map(row => {
      const planned = row.Transit_Days_Planed
      const actual = row.Transit_Days_Actual
      const status = getStatus(planned, actual)
      const variance =
        actual == null || Number.isNaN(actual) || planned == null || Number.isNaN(planned)
          ? null
          : actual - planned

      const containerNo = row.CONTMAWB || row.CONNO || 'Unknown'

      return {
        ...row,
        CONTAINER: containerNo,
        _status: status,
        _variance: variance,
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
          String(row.CONTAINER).toLowerCase().includes(q) ||
          String(row.ORDERNO ?? '').toLowerCase().includes(q) ||
          String(row.CONNAME ?? '').toLowerCase().includes(q) ||
          String(row.MODE ?? '').toLowerCase().includes(q) ||
          String(row.POL ?? '').toLowerCase().includes(q) ||
          String(row.POD ?? '').toLowerCase().includes(q) ||
          String(row.LINER_NAME ?? '').toLowerCase().includes(q) ||
          String(row.CONT_CONTSIZE ?? '').toLowerCase().includes(q)
        )
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1

      const getValue = (row: any): any => {
        switch (sortField) {
          case 'status':
            return row._status
          case 'variance':
            return row._variance
          default:
            return row[sortField]
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
      setSortOrder('desc')
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-50 transition-colors text-xs"
    >
      <span>{label}</span>
      <ArrowUpDown
        className={cn(
          'h-3 w-3',
          sortField === field ? 'text-slate-900 dark:text-slate-50' : 'text-slate-400 dark:text-slate-500'
        )}
      />
    </button>
  )

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No container status data available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by container, order, consignee, mode, origin, destination, liner..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400">Status:</span>
          {(['all', 'late', 'ontime', 'early', 'in-progress'] as const).map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() =>
                setStatusFilter(status === 'all' ? 'all' : (status as ShipmentStatus | 'all'))
              }
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status as ShipmentStatus]}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">
        Showing {processedData.length.toLocaleString()}{' '}
        {processedData.length === 1 ? 'shipment' : 'shipments'}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-900 sticky top-0 z-10">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="CONTAINER" label="Container" />
              </th>
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
                <SortButton field="CONT_CONTSIZE" label="Size" />
              </th>
              <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="Transit_Days_Planed" label="Transit (Planned)" />
              </th>
              <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="Transit_Days_Actual" label="Transit (Actual)" />
              </th>
              <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="status" label="Status" />
              </th>
              <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                <SortButton field="variance" label="Days Variance" />
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="p-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              processedData.map((row: any, idx: number) => {
                const planned = row.Transit_Days_Planed
                const actual = row.Transit_Days_Actual
                const status = row._status as ShipmentStatus
                const variance = row._variance as number | null

                return (
                  <tr
                    key={idx}
                    className={cn(
                      'border-t border-slate-100 dark:border-zinc-800',
                      'hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors'
                    )}
                  >
                    <td className="p-3 text-slate-900 dark:text-slate-50 font-medium">
                      {row.CONTAINER}
                    </td>
                    <td className="p-3 text-slate-900 dark:text-slate-50 font-medium">
                      {row.ORDERNO ?? 'N/A'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {row.CONNAME ?? 'N/A'}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          row.MODE === 'SEA'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        )}
                      >
                        {row.MODE ?? 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {row.POL ?? 'N/A'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {row.POD ?? 'N/A'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {row.LINER_NAME ?? 'N/A'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {row.CONT_CONTSIZE ?? 'N/A'}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {planned != null ? `${planned} days` : 'N/A'}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {actual != null ? `${actual} days` : 'N/A'}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                          getStatusBadgeClass(status)
                        )}
                      >
                        <span>{STATUS_LABELS[status]}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {variance == null || Number.isNaN(variance) ? (
                        'N/A'
                      ) : (
                        <span
                          className={cn(
                            'font-semibold',
                            variance > 0
                              ? 'text-red-700 dark:text-red-400'
                              : variance < 0
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {variance > 0 ? '+' : ''}
                          {variance} days
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

