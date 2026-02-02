'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface SlowestShipmentsViewProps {
  data: any[]
}

interface ContainerGroup {
  containerNo: string
  orders: any[]
  containerSize: string
  orderCount: number
  maxTransitPlanned: number
  maxTransitActual: number
  avgTransitPlanned: number
  avgTransitActual: number
}

export function SlowestShipmentsView({ data }: SlowestShipmentsViewProps) {
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Group shipments by container number
  const containerGroups = useMemo<ContainerGroup[]>(() => {
    if (!data || data.length === 0) return []

    const groups = data.reduce((acc: Record<string, any[]>, shipment: any) => {
      const containerNo = shipment.CONTMAWB || shipment.CONNO || 'Unknown'
      if (!acc[containerNo]) {
        acc[containerNo] = []
      }
      acc[containerNo].push(shipment)
      return acc
    }, {})

    // Convert to array and calculate stats
    return Object.entries(groups).map(([containerNo, orders]) => {
      const transitPlannedValues = orders
        .map(o => o.Transit_Days_Planed)
        .filter(v => v != null && !isNaN(v))
      const transitActualValues = orders
        .map(o => o.Transit_Days_Actual)
        .filter(v => v != null && !isNaN(v))

      const maxTransitPlanned = transitPlannedValues.length > 0 
        ? Math.max(...transitPlannedValues) 
        : 0
      const maxTransitActual = transitActualValues.length > 0 
        ? Math.max(...transitActualValues) 
        : 0
      const avgTransitPlanned = transitPlannedValues.length > 0
        ? transitPlannedValues.reduce((a, b) => a + b, 0) / transitPlannedValues.length
        : 0
      const avgTransitActual = transitActualValues.length > 0
        ? transitActualValues.reduce((a, b) => a + b, 0) / transitActualValues.length
        : 0

      return {
        containerNo,
        orders,
        containerSize: orders[0]?.CONT_CONTSIZE || 'N/A',
        orderCount: orders.length,
        maxTransitPlanned,
        maxTransitActual,
        avgTransitPlanned,
        avgTransitActual
      }
    }).sort((a, b) => b.maxTransitPlanned - a.maxTransitPlanned) // Sort by slowest first
  }, [data])

  // Pagination
  const totalPages = Math.ceil(containerGroups.length / itemsPerPage)
  const paginatedContainers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return containerGroups.slice(startIndex, endIndex)
  }, [containerGroups, currentPage])

  const toggleContainer = (containerNo: string) => {
    setExpandedContainers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(containerNo)) {
        newSet.delete(containerNo)
      } else {
        newSet.add(containerNo)
      }
      return newSet
    })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Collapse all when changing pages
    setExpandedContainers(new Set())
  }

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
      {/* Pagination Top */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, containerGroups.length)} of {containerGroups.length} containers
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Container List */}
      <div className="flex-1 overflow-auto space-y-4">
        {paginatedContainers.map((container) => {
          const isExpanded = expandedContainers.has(container.containerNo)
          
          return (
            <Card key={container.containerNo} className="border border-slate-200 dark:border-zinc-800 overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors p-4"
                onClick={() => toggleContainer(container.containerNo)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                        {container.containerNo}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Size: {container.containerSize}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {container.orderCount} {container.orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Max Transit (Planned)</div>
                      <div className="text-lg font-semibold text-red-700 dark:text-red-400 tabular-nums">
                        {container.maxTransitPlanned > 0 ? `${container.maxTransitPlanned} days` : 'N/A'}
                      </div>
                    </div>
                    {container.maxTransitActual > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Max Transit (Actual)</div>
                        <div className="text-lg font-semibold text-orange-700 dark:text-orange-400 tabular-nums">
                          {container.maxTransitActual} days
                        </div>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="ml-2">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
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
                          <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">Transit (Planned)</th>
                          <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">Transit (Actual)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {container.orders.map((order: any, idx: number) => (
                          <tr 
                            key={idx}
                            className={cn(
                              "border-t border-slate-100 dark:border-zinc-800",
                              "hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                            )}
                          >
                            <td className="p-3 text-slate-900 dark:text-slate-50 font-medium">
                              {order.ORDERNO || 'N/A'}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {order.CONNAME || 'N/A'}
                            </td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                order.MODE === 'SEA' 
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                              )}>
                                {order.MODE || 'N/A'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {order.POL || 'N/A'}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {order.POD || 'N/A'}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {order.LINER_NAME || 'N/A'}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {order.CONT_CONTSIZE || 'N/A'}
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              <span className={cn(
                                "font-semibold",
                                order.Transit_Days_Planed > 60 
                                  ? "text-red-700 dark:text-red-400"
                                  : order.Transit_Days_Planed > 40
                                    ? "text-orange-700 dark:text-orange-400"
                                    : "text-slate-700 dark:text-slate-300"
                              )}>
                                {order.Transit_Days_Planed != null ? `${order.Transit_Days_Planed} days` : 'N/A'}
                              </span>
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              <span className={cn(
                                "font-semibold",
                                order.Transit_Days_Actual > 60 
                                  ? "text-red-700 dark:text-red-400"
                                  : order.Transit_Days_Actual > 40
                                    ? "text-orange-700 dark:text-orange-400"
                                    : "text-slate-700 dark:text-slate-300"
                              )}>
                                {order.Transit_Days_Actual != null ? `${order.Transit_Days_Actual} days` : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Pagination Bottom */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
