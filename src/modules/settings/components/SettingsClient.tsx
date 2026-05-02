'use client'

import { useState } from 'react'
import type { SettingsPageData, SettingsSection } from '../types'
import { ProfileDetail } from './ProfileDetail'
import { PreferencesDetail } from './PreferencesDetail'
import { HouseholdDetail } from './HouseholdDetail'
import { SubscriptionDetail } from './SubscriptionDetail'
import { AboutDetail } from './AboutDetail'

interface Props {
  data: SettingsPageData
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function SettingsClient({ data }: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(null)
  const { profile, preferences, household, members, currentUserRole } = data

  const householdName = household?.name ?? null
  const memberCount = members.length

  function open(s: SettingsSection) { setActiveSection(s) }
  function back() { setActiveSection(null) }

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* ── Main list ── */}
      <div>
        {/* Header */}
        <div style={{ padding: '16px 0 14px' }}>
          <h1 className="fc-h1">Configuración</h1>
          <p className="fc-body" style={{ marginTop: 2 }}>Personaliza tu experiencia</p>
        </div>

        {/* Profile hero */}
        <button
          onClick={() => open('profile')}
          className="glass-hero"
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
            padding: 20, marginBottom: 18,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.transform = 'translateY(-1px)'
            el.style.boxShadow = '0 12px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.transform = ''
            el.style.boxShadow = ''
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--fc-accent) 0%, #1F6B3E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: 'white',
            boxShadow: '0 4px 20px rgba(46,125,82,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            fontFamily: 'var(--font-sans)',
          }}>
            {getInitials(profile.display_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {profile.display_name ?? 'Sin nombre'}
            </div>
            {profile.occupation && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {profile.occupation}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-green)', marginTop: 5, fontWeight: 500 }}>
              Editar perfil →
            </div>
          </div>
          <ChevronRight />
        </button>

        {/* Preferencias section */}
        <div style={{ marginBottom: 18 }}>
          <p className="fc-label-micro" style={{ padding: '0 2px', marginBottom: 8 }}>Preferencias</p>
          <div className="glass" style={{ overflow: 'hidden' }}>
            <RowItem
              icon="⚙️"
              iconColor="green"
              label="Preferencias de la app"
              detail="Moneda, zona horaria, formato"
              value={preferences.base_currency}
              onClick={() => open('preferences')}
            />
            <RowItem
              icon="👥"
              iconColor="green"
              label="Hogar"
              detail={household
                ? `${householdName} · ${memberCount} miembros`
                : 'Sin hogar configurado'
              }
              onClick={household ? () => open('household') : undefined}
              disabled={!household}
              extraContent={household && memberCount > 0 ? (
                <div style={{ display: 'flex', marginTop: 5 }}>
                  {members.slice(0, 3).map((m, i) => (
                    <div key={m.user_id} style={{
                      width: 20, height: 20, borderRadius: '50%',
                      fontSize: 9, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white',
                      background: m.role === 'owner' ? 'var(--fc-accent)' : 'var(--gold)',
                      marginRight: -4, zIndex: members.length - i,
                      border: '2px solid rgba(7,14,10,0.8)',
                    }}>
                      {getInitials(m.display_name)}
                    </div>
                  ))}
                </div>
              ) : null}
            />
          </div>
        </div>

        {/* Suscripción section */}
        <div style={{ marginBottom: 18 }}>
          <p className="fc-label-micro" style={{ padding: '0 2px', marginBottom: 8 }}>Suscripción</p>
          <div className="glass" style={{ overflow: 'hidden' }}>
            <RowItem
              icon="✦"
              iconColor="gold"
              label="Plan actual"
              detail="Funciones básicas incluidas"
              badge={<span className="badge badge-neutral">FREE</span>}
              onClick={() => open('subscription')}
            />
            <RowItem
              icon="🔑"
              iconColor="gold"
              label="API Keys (BYOK)"
              detail="Trae tu propia key de AI"
              badge={<span className="badge badge-gold">Próximamente</span>}
              disabled
            />
          </div>
        </div>

        {/* Cuenta section */}
        <div style={{ marginBottom: 18 }}>
          <p className="fc-label-micro" style={{ padding: '0 2px', marginBottom: 8 }}>Cuenta</p>
          <div className="glass" style={{ overflow: 'hidden' }}>
            <RowItem
              icon="🔒"
              iconColor="dark"
              label="Cambiar PIN"
              detail="Seguridad de acceso"
              badge={<span className="badge badge-gold">Próximamente</span>}
              disabled
            />
            <RowItem
              icon="📤"
              iconColor="dark"
              label="Exportar datos"
              detail="Descarga tus datos financieros"
              badge={<span className="badge badge-gold">Próximamente</span>}
              disabled
            />
            <RowItem
              icon="ℹ️"
              iconColor="dark"
              label="Acerca de"
              detail="Versión y créditos"
              onClick={() => open('about')}
            />
          </div>
        </div>
      </div>

      {/* ── Detail overlays ── */}
      <DetailOverlay active={activeSection === 'profile'}>
        <ProfileDetail profile={profile} onBack={back} />
      </DetailOverlay>

      <DetailOverlay active={activeSection === 'preferences'}>
        <PreferencesDetail preferences={preferences} onBack={back} />
      </DetailOverlay>

      {household && (
        <DetailOverlay active={activeSection === 'household'}>
          <HouseholdDetail
            household={household}
            members={members}
            currentUserRole={currentUserRole ?? 'member'}
            onBack={back}
          />
        </DetailOverlay>
      )}

      <DetailOverlay active={activeSection === 'subscription'}>
        <SubscriptionDetail onBack={back} />
      </DetailOverlay>

      <DetailOverlay active={activeSection === 'about'}>
        <AboutDetail onBack={back} />
      </DetailOverlay>
    </div>
  )
}

/* ── Row item ── */
interface RowItemProps {
  icon: string
  iconColor: 'green' | 'gold' | 'dark'
  label: string
  detail?: string
  value?: string
  badge?: React.ReactNode
  extraContent?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

function RowItem({ icon, iconColor, label, detail, value, badge, extraContent, onClick, disabled }: RowItemProps) {
  const iconBg = iconColor === 'green'
    ? 'var(--green-dim)'
    : iconColor === 'gold'
      ? 'var(--gold-dim)'
      : 'rgba(255,255,255,0.06)'

  const isInteractive = !!onClick && !disabled

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled && !badge}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        width: '100%', textAlign: 'left', border: 'none',
        background: 'transparent',
        cursor: isInteractive ? 'pointer' : 'default',
        opacity: disabled && !onClick ? 0.4 : 1,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.12s',
      }}
      className={isInteractive ? 'settings-row-interactive' : undefined}
    >
      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: iconBg, fontSize: 15,
      }}>
        {icon}
      </div>

      {/* Label + detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        {detail && (
          <div style={{
            fontSize: 11, color: 'var(--text-secondary)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {detail}
          </div>
        )}
        {extraContent}
      </div>

      {/* Right-side: value / badge / chevron — never wrap, shrink as needed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {value && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {value}
          </span>
        )}
        {badge}
        {isInteractive && <ChevronRight />}
      </div>
    </button>
  )
}

/* ── Detail overlay ── */
function DetailOverlay({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className="settings-detail-overlay"
      style={{
        transform: active ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.25,0.1,0.25,1)',
      }}
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}
