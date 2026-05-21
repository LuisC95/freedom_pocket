'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/actions/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn({ email, password })
    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 font-bold text-white text-lg"
          style={{ backgroundColor: 'var(--fc-accent)', fontFamily: 'IBM Plex Mono, monospace' }}
        >
          FC
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--fc-text-primary)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
          Fastlane Compass
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fc-text-secondary)' }}>
          Inicia sesión en tu cuenta
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          background: 'var(--fc-surface-white)',
          borderColor: 'var(--fc-border-light)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--fc-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--fc-border-light)',
                color: 'var(--fc-text-primary)',
                fontFamily: 'IBM Plex Sans, sans-serif',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--fc-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--fc-border-light)'}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: 'var(--fc-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs transition-colors"
                style={{ color: 'var(--fc-accent)' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--fc-border-light)',
                color: 'var(--fc-text-primary)',
                fontFamily: 'IBM Plex Sans, sans-serif',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--fc-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--fc-border-light)'}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--fc-danger)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            style={{
              backgroundColor: 'var(--fc-accent)',
              color: '#fff',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs mt-4" style={{ color: 'var(--fc-text-muted)' }}>
        ¿Tienes un código de invitación?{' '}
        <Link href="/register" className="transition-colors" style={{ color: 'var(--fc-accent)' }}>
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}
