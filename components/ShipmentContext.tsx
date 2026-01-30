'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getShipments, DashboardFilters } from '@/app/actions'

interface ShipmentContextType {
  data: {
    rawShipments: any[];
    kpiTotals: any;
    monthlyStats: any[];
    avgTransit: any;
    extremes: any;
    onTime: any;
    monthlyOnTime: any[];
    transitBreakdown: any;
    originModeTEU: any[];
    linerBreakdown: any[];
    departToLastDelivery: any;
    monthlyDepartToLastDelivery: any[];
    linerOnTimePerformance: any[];
    routePerformance: any[];
    delayDistribution: any[];
    containerSizeImpact: any[];
    clientPerformance: any[];
    weekOfMonthPattern: any[];
    shipmentStatusBreakdown: any[];
    metadata: any;
    clientGroups: any[];
  } | null
  loading: boolean
  error: any
  filters: DashboardFilters
  setFilters: (filters: DashboardFilters) => void
  applyFilters: () => Promise<void>
  refresh: () => Promise<void>
}

const ShipmentContext = createContext<ShipmentContextType | undefined>(undefined)

export function ShipmentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ShipmentContextType['data']>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [filters, setFiltersState] = useState<DashboardFilters>({
    mode: null,
    client: null,
    dateFrom: null,
    dateTo: null,
    office: null,
  })
  const { data: session, status } = useSession()

  const fetchData = useCallback(async (currentFilters: DashboardFilters) => {
    try {
      setLoading(true)
      const result = await getShipments(currentFilters)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err)
      console.error("Failed to fetch shipment data:", err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(async () => {
    await fetchData(filters)
  }, [filters, fetchData])

  const refresh = useCallback(async () => {
    await fetchData(filters)
  }, [filters, fetchData])

  const setFilters = useCallback((newFilters: DashboardFilters) => {
    setFiltersState(newFilters)
  }, [])

  // Debounce timer ref for auto-apply
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-apply filters when they change (debounced by 500ms)
  useEffect(() => {
    if (status !== 'authenticated') return

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchData(filters)
    }, 500)

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [filters, status, fetchData])

  // Initial data fetch on authentication
  useEffect(() => {
    if (status === 'authenticated') {
      fetchData(filters)
    } else if (status === 'unauthenticated') {
      setLoading(false)
      setData(null)
    }
  }, [status])

  return (
    <ShipmentContext.Provider value={{ 
      data, 
      loading, 
      error, 
      filters, 
      setFilters, 
      applyFilters,
      refresh 
    }}>
      {children}
    </ShipmentContext.Provider>
  )
}

export function useShipments() {
  const context = useContext(ShipmentContext)
  if (context === undefined) {
    throw new Error('useShipments must be used within a ShipmentProvider')
  }
  return context
}

