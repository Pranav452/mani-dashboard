'use client'

import { Suspense } from 'react'
import EnvironmentalDashboard from '@/components/EnvironmentalDashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { useShipments } from '@/components/ShipmentContext'

export default function EnvironmentalPage() {
  const { data, loading } = useShipments()

  if (loading) return <DashboardSkeleton />

  // Extract rawShipments from the new data structure
  const shipments = data?.rawShipments || []

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EnvironmentalDashboard data={shipments} />
    </Suspense>
  )
}
