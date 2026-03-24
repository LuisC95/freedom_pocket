'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DevLogin() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    document.cookie = `dev_access=${pin}; path=/`
    router.push(from)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
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
        />
        {error && <p className="text-red-400 text-sm text-center">PIN incorrecto</p>}
        <button
          type="submit"
          className="bg-white text-slate-950 font-medium rounded-lg py-3 hover:bg-slate-200 transition-colors"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}