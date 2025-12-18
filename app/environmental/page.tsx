import { Suspense } from 'react'
import { getShipments } from '../actions'
import EnvironmentalDashboard from '@/components/EnvironmentalDashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'

export default async function EnvironmentalPage() {
  const data = await getShipments()
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EnvironmentalDashboard data={data} />
    </Suspense>
  )
}
