'use client'

import { Suspense } from 'react'
import EnvironmentalDashboard from '@/components/EnvironmentalDashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { useShipments } from '@/components/ShipmentContext'

export default function EnvironmentalPage() {
  const { data, loading, applyFilters } = useShipments()

  if (loading) return <DashboardSkeleton />

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EnvironmentalDashboard
        co2Summary={data?.co2Summary || []}
        monthlyCO2={data?.monthlyCO2 || []}
        originCO2={data?.originCO2 || []}
        routeCO2={data?.routeCO2 || []}
        clientCO2={data?.clientCO2 || []}
        statusCO2={data?.statusCO2 || []}
        topCO2Shipments={data?.topCO2Shipments || []}
        rawShipments={data?.rawShipments || []}
        applyFilters={applyFilters}
      />
    </Suspense>
  )
}
