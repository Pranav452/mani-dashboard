'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { getShipments } from '@/app/actions'

interface ShipmentContextType {
  data: {
    rawShipments: any[];
    kpiTotals: any;
    monthlyStats: any[];
    avgTransit: any;
    extremes: any;
    median: any;
    onTime: any;
    monthlyOnTime: any[];
    transitBreakdown: any;
  } | null
  loading: boolean
  error: any
  refresh: () => Promise<void>
}

const ShipmentContext = createContext<ShipmentContextType | undefined>(undefined)

export function ShipmentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ShipmentContextType['data']>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const { data: session, status } = useSession()

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await getShipments()
      // New format: structured object with all SP result sets
      setData(result)
      setError(null)
    } catch (err) {
      setError(err)
      console.error("Failed to fetch shipment data:", err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // Wait for session to be ready before fetching data
  useEffect(() => {
    // Only fetch if session is authenticated, or if status is not loading
    if (status === 'authenticated') {
      fetchData()
    } else if (status === 'unauthenticated') {
      // If not authenticated, set loading to false and empty data
      setLoading(false)
      setData(null)
    }
    // If status is 'loading', keep loading state as true
  }, [status])

  return (
    <ShipmentContext.Provider value={{ data, loading, error, refresh: fetchData }}>
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

