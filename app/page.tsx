import { getShipments } from './actions'
import Dashboard from '@/components/Dashboard'

export default async function Home() {
  const data = await getShipments()

  return (
    <main>
      <Dashboard data={data} />
    </main>
  )
}