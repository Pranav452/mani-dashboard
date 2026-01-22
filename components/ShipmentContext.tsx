'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { getShipments } from '@/app/actions'

interface ShipmentContextType {
  data: any[]
  monthlyData: any[]
  loading: boolean
  error: any
  refresh: () => Promise<void>
}

const ShipmentContext = createContext<ShipmentContextType | undefined>(undefined)

export function ShipmentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const { data: session, status } = useSession()

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await getShipments()
      // Handle both old format (array) and new format (object with shipments and monthlyData)
      if (Array.isArray(result)) {
        setData(result)
        setMonthlyData([])
      } else {
        setData(result.shipments || [])
        setMonthlyData(result.monthlyData || [])
      }
      setError(null)
    } catch (err) {
      setError(err)
      console.error("Failed to fetch shipment data:", err)
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
      setData([])
    }
    // If status is 'loading', keep loading state as true
  }, [status])

  return (
    <ShipmentContext.Provider value={{ data, monthlyData, loading, error, refresh: fetchData }}>
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

