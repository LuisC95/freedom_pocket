import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { getMapaData } from '@/modules/ideas/actions/mapa'
import { MapaPage } from '@/modules/ideas/components/MapaPage'
import { MiniChat } from '@/modules/ideas/components/MiniChat'

export default async function IdeasPageRoute() {
  await requireAdmin()
  const result = await getMapaData()
  const data   = result.ok ? result.data : {
    hourly_rate: 15, free_hours_week: 20, monthly_gap: 1000, occupation: null,
    caminos: [{ id: 'servicios', match: 94 }, { id: 'problemas', match: 78 }, { id: 'contenido', match: 61 }],
  }

  return (
    <>
      <div className="ideas-v2-page">
        <MapaPage data={data} />
      </div>
      <MiniChat context={{ screen: 'mapa' }} />
    </>
  )
}
