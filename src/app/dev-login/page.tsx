'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { validateDevPin } from './actions'

function DevLoginForm() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const result = await validateDevPin(pin, from)
      if (result.error) {
        setError(true)
        setPin('')
        setLoading(false)
      } else {
        router.push(result.redirectTo)
      }
    } catch {
      setError(true)
      setPin('')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
      <h1 className="text-white text-xl font-semibold text-center">
        Fastlane Compass
      </h1>
      <p className="text-slate-400 text-sm text-center">Acceso de desarrollo</p>
      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={e => { setPin(e.target.value); setError(false) }}
        className="bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-slate-500"
        autoFocus
      />
      {error && <p className="text-red-400 text-sm text-center">PIN incorrecto</p>}
      <button
        type="submit"
        disabled={loading || !pin}
        className="bg-white text-slate-950 font-medium rounded-lg py-3 hover:bg-slate-200 transition-colors disabled:opacity-50"
      >
        {loading ? 'Verificando...' : 'Entrar'}
      </button>
    </form>
  )
}

export default function DevLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Suspense>
        <DevLoginForm />
      </Suspense>
    </div>
  )
}
