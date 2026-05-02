'use client'

import { Suspense, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { validateDevPin } from './actions'

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
]

function DevLoginForm() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/dashboard'

  function handleKey(key: string) {
    if (key === '⌫') {
      setPin(prev => prev.slice(0, -1))
      setError(false)
    } else if (pin.length < 6) {
      setPin(prev => prev + key)
      setError(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return
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

  const pinDots = Array.from({ length: 6 }, (_, i) =>
    i < pin.length ? '●' : '○'
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(val)
    setError(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-8 w-80">
      <div className="text-center">
        <h1 className="text-white text-xl font-semibold">Fastlane Compass</h1>
        <p className="text-slate-400 text-sm mt-1">Acceso de desarrollo</p>
      </div>

      {/* Indicador PIN */}
      <div className="flex gap-3 items-center justify-center">
        {pinDots.map((dot, i) => (
          <span
            key={i}
            className={`text-2xl font-mono transition-colors ${
              i < pin.length ? 'text-white' : 'text-slate-600'
            }`}
          >
            {dot}
          </span>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center -mt-4">PIN incorrecto</p>
      )}

      {/* Input oculto para soportar autofill + teclado físico */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        value={pin}
        onChange={handleInputChange}
        className="absolute opacity-0 pointer-events-none"
        autoFocus
      />

      {/* Teclado numérico */}
      <div className="w-full max-w-[260px]">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-2 mb-2 justify-center">
            {row.map((key) =>
              key === '' ? (
                <div key="empty" className="w-[76px] h-[52px]" />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKey(key)}
                  className={`w-[76px] h-[52px] rounded-xl text-lg font-medium transition-all active:scale-95 ${
                    key === '⌫'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {key}
                </button>
              )
            )}
          </div>
        ))}
      </div>

      {/* Botón entrar */}
      <button
        type="submit"
        disabled={loading || pin.length < 4}
        className="w-full max-w-[260px] bg-[#D4A853] text-[#1A1A2E] font-semibold rounded-xl py-3.5 text-[15px] hover:bg-[#E0B860] active:bg-[#C49A48] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {loading ? 'Verificando...' : 'Entrar'}
      </button>
    </form>
  )
}

export default function DevLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #0F0F1A 100%)' }}>
      <Suspense>
        <DevLoginForm />
      </Suspense>
    </div>
  )
}
