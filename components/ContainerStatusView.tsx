'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Package } from 'lucide-react'

interface ContainerStatusViewProps {
  data: any[]
}

type ShipmentStatus = 'late' | 'ontime' | 'early' | 'in-progress'

interface ContainerGroup {
  containerNo: string
  orders: any[]
  overallStatus: ShipmentStatus
  containerSize: string
  orderCount: number
}

const STATUS_ORDER: ShipmentStatus[] = ['late', 'in-progress', 'ontime', 'early']

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  late: 'Late',
  'in-progress': 'In Progress',
  ontime: 'On Time',
  early: 'Early',
}

export function ContainerStatusView({ data }: ContainerStatusViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'all'>('late')
  const [expandedContainer, setExpandedContainer] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const { containersWithStatus, statusCounts } = useMemo(() => {
    if (!data || data.length === 0) {
      return { containersWithStatus: [] as ContainerGroup[], statusCounts: { late: 0, ontime: 0, early: 0, 'in-progress': 0 } }
    }

    const shipmentsWithStatus = data.map(shipment => {
      const planned = shipment.Transit_Days_Planed
      const actual = shipment.Transit_Days_Actual

      let status: ShipmentStatus

      if (actual == null || Number.isNaN(actual)) {
        status = 'in-progress'
      } else if (actual > planned) {
        status = 'late'
      } else if (actual === planned) {
        status = 'ontime'
      } else {
        status = 'early'
      }

      return { ...shipment, status }
    })

    const containerGroups: Record<string, any[]> = shipmentsWithStatus.reduce((acc, shipment) => {
      const containerNo = shipment.CONTMAWB || shipment.CONNO || 'Unknown'
      if (!acc[containerNo]) {
        acc[containerNo] = []
      }
      acc[containerNo].push(shipment)
      return acc
    }, {} as Record<string, any[]>)

    const counts: Record<ShipmentStatus, number> = {
      late: 0,
      ontime: 0,
      early: 0,
      'in-progress': 0,
    }

    const containers: ContainerGroup[] = Object.entries(containerGroups).map(([containerNo, orders]) => {
      const hasLate = orders.some(o => o.status === 'late')
      const hasInProgress = orders.some(o => o.status === 'in-progress')
      const hasOnTime = orders.some(o => o.status === 'ontime')

      const overallStatus: ShipmentStatus =
        (hasLate && 'late') ||
        (hasInProgress && 'in-progress') ||
        (hasOnTime && 'ontime') ||
        'early'

      counts[overallStatus] += 1

      return {
        containerNo,
        orders,
        overallStatus,
        containerSize: orders[0]?.CONT_CONTSIZE || 'N/A',
        orderCount: orders.length,
      }
    })

    const sorted = containers.sort((a, b) => {
      const statusDiff = STATUS_ORDER.indexOf(a.overallStatus) - STATUS_ORDER.indexOf(b.overallStatus)
      if (statusDiff !== 0) return statusDiff
      return b.orderCount - a.orderCount
    })

    return { containersWithStatus: sorted, statusCounts: counts }
  }, [data])

  const filteredContainers = useMemo(() => {
    const base = selectedStatus === 'all'
      ? containersWithStatus
      : containersWithStatus.filter(c => c.overallStatus === selectedStatus)

    const start = (currentPage - 1) * itemsPerPage
    return base.slice(start, start + itemsPerPage)
  }, [containersWithStatus, selectedStatus, currentPage])

  const totalContainers =
    selectedStatus === 'all'
      ? containersWithStatus.length
      : containersWithStatus.filter(c => c.overallStatus === selectedStatus).length

  const totalPages = Math.max(1, Math.ceil(totalContainers / itemsPerPage))

  const handleStatusChange = (status: ShipmentStatus | 'all') => {
    setSelectedStatus(status)
    setCurrentPage(1)
    setExpandedContainer(null)
  }

  const handlePageChange = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(clamped)
    setExpandedContainer(null)
  }

  const getStatusBadgeClass = (status: ShipmentStatus) => {
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
      {/* Status filters */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {(['late', 'ontime', 'early', 'in-progress'] as ShipmentStatus[]).map(status => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'text-xs',
                selectedStatus === status ? 'bg-slate-900 dark:bg-slate-50 text-slate-50 dark:text-slate-900' : ''
              )}
              onClick={() => handleStatusChange(status)}
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  getStatusBadgeClass(status)
                )}
              >
                <span>{STATUS_LABELS[status]}</span>
                <span className="tabular-nums">{statusCounts[status]}</span>
              </span>
            </Button>
          ))}
          <Button
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => handleStatusChange('all')}
          >
            All
          </Button>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Showing {totalContainers} containers
        </div>
      </div>

      {/* Container list */}
      <div className="flex-1 overflow-auto space-y-4">
        {filteredContainers.map(container => {
          const isExpanded = expandedContainer === container.containerNo

          return (
            <Card
              key={container.containerNo}
              className="border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <CardHeader
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors p-4"
                onClick={() =>
                  setExpandedContainer(prev => (prev === container.containerNo ? null : container.containerNo))
                }
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                        {container.containerNo}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Size: {container.containerSize}</span>
                        <span>
                          {container.orderCount} {container.orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                        getStatusBadgeClass(container.overallStatus)
                      )}
                    >
                      <span>{STATUS_LABELS[container.overallStatus]}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      {isExpanded ? 'Hide orders' : 'View orders'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-0 border-t border-slate-200 dark:border-zinc-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-zinc-900">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Order No</th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Consignee</th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Mode</th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Origin</th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Destination</th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Liner</th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Container Size</th>
                          <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                            Transit (Planned)
                          </th>
                          <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
                            Transit (Actual)
                          </th>
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {container.orders.map((order: any, idx: number) => {
                          const planned = order.Transit_Days_Planed
                          const actual = order.Transit_Days_Actual

                          let status: ShipmentStatus

                          if (actual == null || Number.isNaN(actual)) {
                            status = 'in-progress'
                          } else if (actual > planned) {
                            status = 'late'
                          } else if (actual === planned) {
                            status = 'ontime'
                          } else {
                            status = 'early'
                          }

                          return (
                            <tr
                              key={idx}
                              className={cn(
                                'border-t border-slate-100 dark:border-zinc-800',
                                'hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors'
                              )}
                            >
                              <td className="p-3 text-slate-900 dark:text-slate-50 font-medium">
                                {order.ORDERNO || 'N/A'}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {order.CONNAME || 'N/A'}
                              </td>
                              <td className="p-3">
                                <span
                                  className={cn(
                                    'px-2 py-1 rounded text-xs font-medium',
                                    order.MODE === 'SEA'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                  )}
                                >
                                  {order.MODE || 'N/A'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{order.POL || 'N/A'}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{order.POD || 'N/A'}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {order.LINER_NAME || 'N/A'}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {order.CONT_CONTSIZE || 'N/A'}
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
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

