import { getMiRealidadData } from '@/modules/mi-realidad/actions'
import { MiRealidadClient } from '@/modules/mi-realidad/components/MiRealidadClient'

export default async function MiRealidadPage() {
  const data = await getMiRealidadData()

  return (
    <div className="p-4 pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#141F19] leading-tight">Mi Realidad</h1>
        {data.periodo_activo ? (
          <p className="text-[12px] text-[#7A9A8A] mt-0.5">
            Período activo · desde{' '}
            {new Date(data.periodo_activo.start_date).toLocaleDateString('es', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        ) : (
          <p className="text-[12px] text-[#E84434] mt-0.5">Sin período activo configurado</p>
        )}
      </div>

      {!data.periodo_activo ? (
        <div className="bg-[#EAF0EC] rounded-2xl p-6 text-center">
          <p className="text-[14px] text-[#7A9A8A]">
            Necesitas un período activo para registrar datos.
          </p>
        </div>
      ) : (
        <MiRealidadClient data={data} />
      )}
    </div>
  )
}
