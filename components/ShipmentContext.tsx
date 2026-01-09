'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getShipments } from '@/app/actions'

interface ShipmentContextType {
  data: any[]
  loading: boolean
  error: any
  refresh: () => Promise<void>
}

const ShipmentContext = createContext<ShipmentContextType | undefined>(undefined)

export function ShipmentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await getShipments()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err)
      console.error("Failed to fetch shipment data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch only once on mount
  useEffect(() => {
    fetchData()
  }, [])

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

