'use client'

import { Suspense } from 'react'
import FinancialsDashboard from '@/components/FinancialsDashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { useShipments } from '@/components/ShipmentContext'

export default function FinancialsPage() {
  const { data, loading } = useShipments()

  if (loading) return <DashboardSkeleton />

  // Extract rawShipments from the new data structure
  const shipments = data?.rawShipments || []

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <FinancialsDashboard data={shipments} />
    </Suspense>
  )
}
