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
    co2Summary: any[];
    monthlyCO2: any[];
    originCO2: any[];
    routeCO2: any[];
    clientCO2: any[];
    statusCO2: any[];
    topCO2Shipments: any[];
    metadata: any;
    clientGroups: any[];
  } | null
  loading: boolean
  error: any
  filters: DashboardFilters
  setFilters: (filters: DashboardFilters) => void
  applyFilters: (customFilters?: DashboardFilters) => Promise<void>
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
  const requestSeq = useRef(0)

  const fetchData = useCallback(async (currentFilters: DashboardFilters) => {
    const seq = ++requestSeq.current
    try {
      setLoading(true)
      const result = await getShipments(currentFilters)
      if (seq !== requestSeq.current) return
      setData(result)
      setError(null)
    } catch (err) {
      if (seq !== requestSeq.current) return
      setError(err)
      console.error("Failed to fetch shipment data:", err)
      setData(null)
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(async (customFilters?: DashboardFilters) => {
    await fetchData(customFilters || filters)
  }, [filters, fetchData])

  const refresh = useCallback(async () => {
    await fetchData(filters)
  }, [filters, fetchData])

  const setFilters = useCallback((newFilters: DashboardFilters) => {
    setFiltersState(newFilters)
  }, [])

  // Identity of the signed-in user. Data and filters belong to exactly one user:
  // whenever this changes (logout, or logging in as someone else without a
  // logout in between) everything held in memory is wiped before refetching,
  // so one client can never see another client's cached data or client list.
  const userKey = status === 'authenticated'
    ? `${(session?.user as any)?.name ?? ''}|${(session?.user as any)?.cmpid ?? ''}|${(session?.user as any)?.role ?? ''}`
    : null
  useEffect(() => {
    const emptyFilters: DashboardFilters = { mode: null, client: null, dateFrom: null, dateTo: null, office: null }
    requestSeq.current++ // invalidate any in-flight request for the previous user
    setData(null)
    setError(null)
    setFiltersState(emptyFilters)

    if (status === 'loading') {
      setLoading(true)
      return
    }
    if (!userKey) {
      setLoading(false)
      return
    }

    const seq = requestSeq.current
    setLoading(true)
    getShipments(emptyFilters)
      .then((result) => { if (seq === requestSeq.current) { setData(result); setError(null) } })
      .catch((err) => { if (seq === requestSeq.current) { setError(err); setData(null) } })
      .finally(() => { if (seq === requestSeq.current) setLoading(false) })
  }, [userKey, status])

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

