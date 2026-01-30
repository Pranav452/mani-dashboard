'use client'

import { Suspense } from 'react'
import Dashboard from '@/components/Dashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { useShipments } from '@/components/ShipmentContext'

function DashboardWrapper() {
  const { data, loading } = useShipments()
  
  if (loading) return <DashboardSkeleton />
  
  return <Dashboard data={data} />
}

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardWrapper />
      </Suspense>
    </main>
  )
}
