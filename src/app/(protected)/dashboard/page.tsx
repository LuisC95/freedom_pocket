import { getDashboardData } from '@/modules/dashboard/actions'
import { DashboardClient } from '@/modules/dashboard/components/DashboardClient'

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
