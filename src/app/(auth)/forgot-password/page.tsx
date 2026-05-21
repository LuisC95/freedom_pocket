'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/actions/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await forgotPassword({ email })
    if ('error' in result) {
      setError(result.error)
      setLoading(false)
    } else {
      setSent(true)
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
          Recuperar contraseña
        </h1>
        <p className="text-sm mt-1 text-center" style={{ color: 'var(--fc-text-secondary)' }}>
          {sent ? 'Revisa tu email' : 'Te enviamos un link de recuperación'}
        </p>
      </div>

      <div
        className="rounded-2xl p-6 border"
        style={{
          background: 'var(--fc-surface-white)',
          borderColor: 'var(--fc-border-light)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {sent ? (
          <div className="text-center py-2">
            <div className="text-3xl mb-3">📬</div>
            <p className="text-sm" style={{ color: 'var(--fc-text-primary)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Si el email existe en nuestra base de datos, recibirás un link para restablecer tu contraseña.
            </p>
          </div>
        ) : (
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
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs mt-4" style={{ color: 'var(--fc-text-muted)' }}>
        <Link href="/login" className="transition-colors" style={{ color: 'var(--fc-accent)' }}>
          ← Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
