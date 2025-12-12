import { Suspense } from 'react'
import { getShipments } from './actions'
import Dashboard from '@/components/Dashboard'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'

async function DashboardWrapper() {
  const data = await getShipments()
  return <Dashboard data={data} />
}

export default function Home() {
  return (
    <main>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardWrapper />
      </Suspense>
    </main>
  )
}