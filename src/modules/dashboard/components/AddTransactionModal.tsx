'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronDown, ChevronUp, CreditCard, WalletCards } from 'lucide-react'
import { createTransaction, updateTransaction, createRecurringTemplate, createCategory, deleteCategory, updateDefaultPayment } from '../actions'
import type { CreditCardOption, PaymentSource, Transaction, TransactionCategory, RecurringFrequency } from '../types'
import type { LiquidityAccount } from '@/types/liquidity'

const CATEGORY_COLORS = [
  '#6366f1','#f59e0b','#3b82f6','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#0ea5e9','#f97316','#22c55e',
  '#94a3b8','#2E7D52','#C69B30','#E84434','#3A9E6A',
]

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'manual',   label: 'Sin frecuencia fija' },
  { value: 'daily',    label: 'Diario' },
  { value: 'weekly',   label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly',  label: 'Mensual' },
  { value: 'annual',   label: 'Anual' },
  { value: 'custom',   label: 'Personalizado' },
]

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' }, { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

const MONTH_OPTIONS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

interface AddTransactionModalProps {
  periodId: string
  pricePerHour: number | null
  categories: TransactionCategory[]
  creditCardOptions: CreditCardOption[]
  liquidityAccounts: LiquidityAccount[]
  defaultPaymentSource: PaymentSource
  defaultLiabilityId: string | null
  transaction?: Transaction
  onClose: () => void
  onSaved: () => void
}

function fmt(n: number) {
  if (!n) return ''
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#0E1512',
  border: '0.5px solid #2E7D5230',
  borderRadius: '8px',
  padding: '10px 12px',
  width: '100%',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: '#F2F7F4',
  outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: '#7A9A8A',
  display: 'block',
  marginBottom: '5px',
}

export function AddTransactionModal({
  periodId,
  pricePerHour,
  categories,
  creditCardOptions,
  liquidityAccounts,
  defaultPaymentSource,
  defaultLiabilityId,
  transaction,
  onClose,
  onSaved,
}: AddTransactionModalProps) {
  const isEdit = !!transaction
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const type = 'expense' as const
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [date, setDate] = useState(transaction?.transaction_date ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [currency, setCurrency] = useState(transaction?.currency ?? 'USD')
  const [extraCategories, setExtraCategories] = useState<TransactionCategory[]>([])
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0])
  const [savingCat, startCatTransition] = useTransition()
  const [deletedCatIds, setDeletedCatIds] = useState<Set<string>>(new Set())
  const [catToDelete, setCatToDelete] = useState<TransactionCategory | null>(null)
  const [hasLinkedTxs, setHasLinkedTxs] = useState(false)
  const [replacementCatId, setReplacementCatId] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingCat, startDeleteTransition] = useTransition()
  const initialPaymentSource: PaymentSource = transaction?.payment_source ?? (
    defaultPaymentSource === 'credit_card' && defaultLiabilityId ? 'credit_card' : 'cash_debit'
  )
  const initialLiabilityId = transaction?.liability_id ?? (
    initialPaymentSource === 'credit_card' ? defaultLiabilityId : null
  )
  const [paymentSource, setPaymentSource] = useState<PaymentSource>(initialPaymentSource)
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(initialLiabilityId)
  const [selectedLiquidityAssetId, setSelectedLiquidityAssetId] = useState<string | null>(
    transaction?.liquidity_asset_id ?? liquidityAccounts[0]?.id ?? null
  )
  const [selectorExpanded, setSelectorExpanded] = useState(false)
  const [rememberAsDefault, setRememberAsDefault] = useState(false)

  const [isRecurring, setIsRecurring] = useState(false)
  const [registerToday, setRegisterToday] = useState(true)
  const [frequency, setFrequency] = useState<RecurringFrequency>('manual')
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate().toString())
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [monthOfYear, setMonthOfYear] = useState(new Date().getMonth() + 1)
  const [customDays, setCustomDays] = useState('30')

  const accentColor = type === 'expense' ? '#E84434' : '#2E7D52'
  const accentColorLight = type === 'expense' ? '#E8443425' : '#2E7D5225'

  const filteredCategories = [...categories, ...extraCategories].filter(c =>
    (c.applies_to === 'expense' || c.applies_to === 'both') && !deletedCatIds.has(c.id)
  )
  const selectedCard = paymentSource === 'credit_card'
    ? creditCardOptions.find(card => card.id === selectedLiabilityId)
    : undefined
  const selectedLiquidity = paymentSource === 'cash_debit'
    ? liquidityAccounts.find(account => account.id === selectedLiquidityAssetId)
    : undefined
  const amountValue = parseFloat(amount)
  const projectedCardBalance = selectedCard && !Number.isNaN(amountValue)
    ? selectedCard.current_balance + amountValue
    : selectedCard?.current_balance ?? 0
  const canExpandPaymentSelector = creditCardOptions.length > 0 || liquidityAccounts.length > 0

  function selectCashDebit(assetId: string) {
    setPaymentSource('cash_debit')
    setSelectedLiquidityAssetId(assetId)
    setSelectedLiabilityId(null)
    setSelectorExpanded(false)
  }

  function selectCreditCard(cardId: string) {
    setPaymentSource('credit_card')
    setSelectedLiquidityAssetId(null)
    setSelectedLiabilityId(cardId)
    setSelectorExpanded(false)
  }

  async function persistDefaultPaymentIfNeeded() {
    if (!rememberAsDefault) return null
    return updateDefaultPayment(paymentSource, paymentSource === 'credit_card' ? selectedLiabilityId : null)
  }

  function handleDeleteCategory() {
    if (!catToDelete) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteCategory(catToDelete.id, replacementCatId || undefined)
      if (result.hasLinkedTransactions) {
        setHasLinkedTxs(true)
        return
      }
      if (result.error) {
        setDeleteError(result.error)
        return
      }
      setDeletedCatIds(prev => new Set([...prev, catToDelete.id]))
      if (categoryId === catToDelete.id) setCategoryId(replacementCatId || '')
      setCatToDelete(null)
      setHasLinkedTxs(false)
      setReplacementCatId('')
    })
  }

  function handleCreateCategory() {
    if (!newCatName.trim()) return
    startCatTransition(async () => {
      const { data } = await createCategory({
        name: newCatName.trim(),
        applies_to: 'expense',
        icon: newCatIcon.trim() || null,
        color: newCatColor,
      })
      if (data) {
        setExtraCategories(prev => [...prev, data])
        setCategoryId(data.id)
      }
      setShowNewCat(false)
      setNewCatName('')
      setNewCatIcon('')
      setNewCatColor(CATEGORY_COLORS[0])
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return setError('El monto debe ser mayor a 0')
    if (!categoryId) return setError('Selecciona una categoría')
    if (paymentSource === 'credit_card' && !selectedLiabilityId) return setError('Selecciona una tarjeta de credito')
    if (paymentSource === 'cash_debit' && !selectedLiquidityAssetId) return setError('Selecciona una cuenta o cash')
    const selectedLiquidity = liquidityAccounts.find(account => account.id === selectedLiquidityAssetId)
    if (paymentSource === 'cash_debit' && selectedLiquidity && amt > selectedLiquidity.current_value) {
      return setError(`Saldo insuficiente en ${selectedLiquidity.name}`)
    }

    startTransition(async () => {
      const templateName = notes || (filteredCategories.find(c => c.id === categoryId)?.name ?? 'Habitual')
      const dayRef = (frequency === 'weekly' || frequency === 'biweekly')
        ? dayOfWeek
        : parseInt(dayOfMonth) || new Date().getDate()

      // Solo plantilla — sin registrar transacción hoy
      if (isRecurring && !registerToday) {
        const res = await createRecurringTemplate({
          category_id: categoryId,
          name: templateName,
          type,
          payment_source: paymentSource,
          liability_id: paymentSource === 'credit_card' ? selectedLiabilityId : null,
          liquidity_asset_id: paymentSource === 'cash_debit' ? selectedLiquidityAssetId : null,
          amount: amt,
          currency,
          frequency,
          day_of_month: frequency === 'manual' || frequency === 'daily' ? 1 : dayRef,
          month_of_year: frequency === 'annual' ? monthOfYear : null,
          custom_interval_days: frequency === 'custom' ? (parseInt(customDays) || 30) : null,
        })
        if (res.error) return setError(res.error)
        const defaultRes = await persistDefaultPaymentIfNeeded()
        if (defaultRes && !defaultRes.ok) return setError(defaultRes.error)
        onSaved()
        return
      }

      if (isEdit) {
        const res = await updateTransaction(transaction!.id, {
          type,
          amount: amt,
          category_id: categoryId,
          transaction_date: date,
          notes: notes || null,
          currency,
          payment_source: paymentSource,
          liability_id: paymentSource === 'credit_card' ? selectedLiabilityId : null,
          liquidity_asset_id: paymentSource === 'cash_debit' ? selectedLiquidityAssetId : null,
        })
        if (res.error) return setError(res.error)
      } else {
        const res = await createTransaction({
          period_id: periodId,
          type,
          amount: amt,
          category_id: categoryId,
          transaction_date: date,
          notes: notes || null,
          currency,
          price_per_hour_snapshot: pricePerHour,
          payment_source: paymentSource,
          liability_id: paymentSource === 'credit_card' ? selectedLiabilityId : null,
          liquidity_asset_id: paymentSource === 'cash_debit' ? selectedLiquidityAssetId : null,
          status: 'confirmed',
        })
        if (res.error) return setError(res.error)

        if (isRecurring) {
          const tplRes = await createRecurringTemplate({
            category_id: categoryId,
            name: templateName,
            type,
            payment_source: paymentSource,
            liability_id: paymentSource === 'credit_card' ? selectedLiabilityId : null,
            liquidity_asset_id: paymentSource === 'cash_debit' ? selectedLiquidityAssetId : null,
            amount: amt,
            currency,
            frequency,
            day_of_month: frequency === 'manual' || frequency === 'daily' ? 1 : dayRef,
            month_of_year: frequency === 'annual' ? monthOfYear : null,
            custom_interval_days: frequency === 'custom' ? (parseInt(customDays) || 30) : null,
          })
          if (tplRes.error) return setError(tplRes.error)
        }
      }
      const defaultRes = await persistDefaultPaymentIfNeeded()
      if (defaultRes && !defaultRes.ok) return setError(defaultRes.error)
      onSaved()
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px' }}
      className="sm:items-center">
      <div style={{ backgroundColor: '#1A2520', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px', marginBottom: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#F2F7F4' }}>
            {isEdit ? 'Editar transacción' : 'Nueva transacción'}
          </p>
          <button onClick={onClose} style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: '#7A9A8A', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Monto */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Monto</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                style={{ ...INPUT_STYLE, flex: 1, fontSize: '28px', fontWeight: 600, textAlign: 'center', color: accentColor }}
              />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                style={{ ...INPUT_STYLE, width: 'auto', padding: '10px 8px' }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="ARS">ARS</option>
                <option value="COP">COP</option>
              </select>
            </div>
            {pricePerHour && parseFloat(amount) > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#C69B30', marginTop: '4px', textAlign: 'center' }}>
                = {(parseFloat(amount) / pricePerHour).toFixed(1)}h de vida
              </p>
            )}
          </div>

          {/* Categoría */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {filteredCategories.map(cat => (
                <div key={cat.id} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    style={{
                      width: '100%',
                      backgroundColor: categoryId === cat.id ? (cat.color ? `${cat.color}22` : accentColorLight) : '#0E1512',
                      border: `0.5px solid ${categoryId === cat.id ? (cat.color ?? accentColor) : '#2E7D5225'}`,
                      borderRadius: '8px',
                      padding: '8px 6px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      color: categoryId === cat.id ? (cat.color ?? accentColor) : '#7A9A8A',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat.icon && <span style={{ display: 'block', marginBottom: '2px' }}>{cat.icon}</span>}
                    {cat.name}
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setCatToDelete(cat); setHasLinkedTxs(false); setReplacementCatId(''); setDeleteError(null) }}
                    style={{
                      position: 'absolute', top: '3px', right: '3px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      backgroundColor: '#1A2520', border: '0.5px solid #7A9A8A50',
                      color: '#7A9A8A', fontSize: '10px', lineHeight: 1,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  >×</button>
                </div>
              ))}
              {/* Botón nueva categoría */}
              <button
                type="button"
                onClick={() => setShowNewCat(p => !p)}
                style={{
                  backgroundColor: showNewCat ? '#2E7D5215' : '#0E1512',
                  border: `0.5px solid ${showNewCat ? '#2E7D52' : '#2E7D5225'}`,
                  borderRadius: '8px',
                  padding: '8px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  color: showNewCat ? '#2E7D52' : '#7A9A8A',
                }}
              >
                <span style={{ display: 'block', marginBottom: '2px' }}>＋</span>
                Nueva
              </button>
            </div>

            {/* Confirmación eliminación — fase 1: sin transacciones */}
            {catToDelete && !hasLinkedTxs && (
              <div style={{ marginTop: '10px', backgroundColor: '#0E1512', borderRadius: '10px', padding: '12px', border: '0.5px solid #E8443430' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#F2F7F4', marginBottom: '10px' }}>
                  ¿Eliminar <strong style={{ color: '#E84434' }}>"{catToDelete.name}"</strong>? Esta acción no se puede deshacer.
                </p>
                {deleteError && <p style={{ color: '#E84434', fontFamily: 'var(--font-mono)', fontSize: '10px', marginBottom: '8px' }}>{deleteError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => { setCatToDelete(null); setDeleteError(null) }}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'transparent', border: '0.5px solid #2E7D5240', fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#7A9A8A', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleDeleteCategory} disabled={deletingCat}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: '#E84434', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500, color: 'white', cursor: 'pointer', opacity: deletingCat ? 0.6 : 1 }}>
                    {deletingCat ? '…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmación eliminación — fase 2: tiene transacciones, pide reemplazo */}
            {catToDelete && hasLinkedTxs && (
              <div style={{ marginTop: '10px', backgroundColor: '#0E1512', borderRadius: '10px', padding: '12px', border: '0.5px solid #C69B3040' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#F2F7F4', marginBottom: '8px' }}>
                  <strong style={{ color: '#C69B30' }}>"{catToDelete.name}"</strong> tiene transacciones. Elige una categoría de reemplazo:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginBottom: '10px' }}>
                  {filteredCategories.filter(c => c.id !== catToDelete.id).map(cat => (
                    <button key={cat.id} type="button" onClick={() => setReplacementCatId(cat.id)}
                      style={{
                        padding: '6px 4px', borderRadius: '7px', textAlign: 'center', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: '10px',
                        backgroundColor: replacementCatId === cat.id ? (cat.color ? `${cat.color}22` : '#2E7D5225') : '#1A2520',
                        border: `0.5px solid ${replacementCatId === cat.id ? (cat.color ?? '#2E7D52') : '#2E7D5225'}`,
                        color: replacementCatId === cat.id ? (cat.color ?? '#3A9E6A') : '#7A9A8A',
                      }}>
                      {cat.icon && <span style={{ display: 'block' }}>{cat.icon}</span>}
                      {cat.name}
                    </button>
                  ))}
                </div>
                {deleteError && <p style={{ color: '#E84434', fontFamily: 'var(--font-mono)', fontSize: '10px', marginBottom: '8px' }}>{deleteError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => { setCatToDelete(null); setHasLinkedTxs(false); setReplacementCatId(''); setDeleteError(null) }}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'transparent', border: '0.5px solid #2E7D5240', fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#7A9A8A', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleDeleteCategory} disabled={deletingCat || !replacementCatId}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: '#E84434', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500, color: 'white', cursor: 'pointer', opacity: (deletingCat || !replacementCatId) ? 0.4 : 1 }}>
                    {deletingCat ? '…' : 'Reasignar y eliminar'}
                  </button>
                </div>
              </div>
            )}

            {/* Formulario nueva categoría inline */}
            {showNewCat && (
              <div style={{ marginTop: '10px', backgroundColor: '#0E1512', borderRadius: '10px', padding: '12px', border: '0.5px solid #2E7D5230' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={LABEL_STYLE}>Nombre</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Ej: Mascotas"
                    style={INPUT_STYLE}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={LABEL_STYLE}>Emoji (opcional)</label>
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={e => setNewCatIcon(e.target.value)}
                    placeholder="🐾"
                    style={{ ...INPUT_STYLE, width: '70px', textAlign: 'center', fontSize: '18px' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={LABEL_STYLE}>Color</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {CATEGORY_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          backgroundColor: c,
                          border: newCatColor === c ? `2px solid #F2F7F4` : '2px solid transparent',
                          cursor: 'pointer', flexShrink: 0,
                          boxShadow: newCatColor === c ? `0 0 0 1px ${c}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewCat(false)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'transparent', border: '0.5px solid #2E7D5240', fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#7A9A8A', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={savingCat || !newCatName.trim()}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: newCatColor, border: 'none', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500, color: 'white', cursor: 'pointer', opacity: savingCat || !newCatName.trim() ? 0.5 : 1 }}
                  >
                    {savingCat ? '…' : 'Crear'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Método de pago</label>
            <div style={{ backgroundColor: '#0E1512', border: '0.5px solid #2a3a33', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => canExpandPaymentSelector && setSelectorExpanded(prev => !prev)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: canExpandPaymentSelector ? 'pointer' : 'default',
                  color: '#F2F7F4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                {paymentSource === 'credit_card' && selectedCard ? (
                  <CreditCard size={20} color="#E84434" />
                ) : (
                  <WalletCards size={20} color="#7A9A8A" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: '#F2F7F4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {paymentSource === 'credit_card' && selectedCard ? selectedCard.name : selectedLiquidity ? selectedLiquidity.name : 'Selecciona cuenta o cash'}
                    </span>
                    {paymentSource === 'credit_card' && selectedCard?.id === defaultLiabilityId && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#2E7D52', backgroundColor: '#2E7D5220', borderRadius: '3px', padding: '1px 5px', flexShrink: 0 }}>
                        default
                      </span>
                    )}
                  </div>
                  {paymentSource === 'credit_card' && selectedCard && (
                    <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#7A9A8A' }}>Después de este gasto</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#E84434', fontWeight: 500 }}>
                        {fmtMoney(projectedCardBalance)}
                      </span>
                    </div>
                  )}
                  {paymentSource === 'cash_debit' && selectedLiquidity && (
                    <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#7A9A8A' }}>{selectedLiquidity.institution}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#3A9E6A', fontWeight: 500 }}>
                        {fmtMoney(selectedLiquidity.current_value)}
                      </span>
                    </div>
                  )}
                </div>
                {paymentSource === 'credit_card' && selectedCard && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#E84434', flexShrink: 0 }}>
                    {fmtMoney(selectedCard.current_balance)}
                  </span>
                )}
                {canExpandPaymentSelector && (
                  selectorExpanded ? <ChevronUp size={16} color="#7A9A8A" /> : <ChevronDown size={16} color="#7A9A8A" />
                )}
              </button>

              {selectorExpanded && (
                <div style={{ borderTop: '0.5px solid #2a3a33' }}>
                  <div style={{ padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#7A9A8A' }}>Selecciona un método</span>
                    <ChevronUp size={16} color="#7A9A8A" />
                  </div>
                  {liquidityAccounts.map(account => {
                    const selected = paymentSource === 'cash_debit' && selectedLiquidityAssetId === account.id
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => selectCashDebit(account.id)}
                        style={{
                          width: '100%',
                          padding: '11px 12px',
                          border: 'none',
                          borderTop: '0.5px solid #2a3a33',
                          borderLeft: selected ? '3px solid #3A9E6A' : '3px solid transparent',
                          backgroundColor: selected ? '#2E7D5210' : 'transparent',
                          color: '#F2F7F4',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <WalletCards size={18} color={selected ? '#3A9E6A' : '#7A9A8A'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500 }}>
                            {account.name}
                          </span>
                          <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
                            {account.liquidity_kind === 'cash' ? 'Cash' : account.institution}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#3A9E6A' }}>
                          {fmtMoney(account.current_value)}
                        </span>
                      </button>
                    )
                  })}
                  {creditCardOptions.map(card => {
                    const selected = paymentSource === 'credit_card' && selectedLiabilityId === card.id
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => selectCreditCard(card.id)}
                        style={{
                          width: '100%',
                          padding: '11px 12px',
                          border: 'none',
                          borderTop: '0.5px solid #2a3a33',
                          borderLeft: selected ? '3px solid #E84434' : '3px solid transparent',
                          backgroundColor: selected ? '#E8443410' : 'transparent',
                          color: '#F2F7F4',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          textAlign: 'left',
                        }}
                      >
                        <CreditCard size={18} color={selected ? '#E84434' : '#7A9A8A'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {card.name}
                            </span>
                            {card.owner_name && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#5a7a6a', backgroundColor: '#2a3a33', borderRadius: '3px', padding: '1px 5px', flexShrink: 0 }}>
                                de {card.owner_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#E84434' }}>
                          {fmtMoney(card.current_balance)}
                        </span>
                      </button>
                    )
                  })}
                  <label style={{ borderTop: '0.5px solid #2a3a33', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <button
                      type="button"
                      onClick={() => setRememberAsDefault(prev => !prev)}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: '0.5px solid #3a4a43',
                        backgroundColor: rememberAsDefault ? '#2E7D52' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      {rememberAsDefault && <Check size={12} color="#F2F7F4" />}
                    </button>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#7A9A8A' }}>
                      Recordar como default
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Fecha */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '14px' }}>
            <label style={LABEL_STYLE}>Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descripción..."
              style={INPUT_STYLE}
            />
          </div>

          {/* Toggle recurrente */}
          {!isEdit && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <div
                  onClick={() => setIsRecurring(p => !p)}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    backgroundColor: isRecurring ? accentColor : '#0E1512',
                    border: `0.5px solid ${isRecurring ? accentColor : '#2E7D5230'}`,
                    position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white',
                    position: 'absolute', top: '3px', left: isRecurring ? '19px' : '3px',
                    transition: 'left 0.2s',
                  }} />
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#7A9A8A' }}>
                  ¿Es un gasto habitual?
                </span>
              </label>

              {isRecurring && (
                <div style={{ marginTop: '10px', paddingLeft: '44px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Frecuencia */}
                  <div>
                    <label style={LABEL_STYLE}>Frecuencia</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {FREQ_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFrequency(opt.value)}
                          style={{
                            padding: '4px 10px', borderRadius: '6px',
                            fontFamily: 'var(--font-sans)', fontSize: '11px',
                            backgroundColor: frequency === opt.value ? accentColorLight : '#0E1512',
                            border: `0.5px solid ${frequency === opt.value ? accentColor : '#2E7D5230'}`,
                            color: frequency === opt.value ? accentColor : '#7A9A8A',
                            cursor: 'pointer',
                          }}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Campo condicional */}
                  {(frequency === 'weekly' || frequency === 'biweekly') && (
                    <div>
                      <label style={LABEL_STYLE}>Día de la semana</label>
                      <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} style={INPUT_STYLE}>
                        {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  )}
                  {frequency === 'monthly' && (
                    <div>
                      <label style={LABEL_STYLE}>Día del mes</label>
                      <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" style={{ ...INPUT_STYLE, width: '80px' }} />
                    </div>
                  )}
                  {frequency === 'annual' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div>
                        <label style={LABEL_STYLE}>Mes</label>
                        <select value={monthOfYear} onChange={e => setMonthOfYear(Number(e.target.value))} style={{ ...INPUT_STYLE, width: 'auto' }}>
                          {MONTH_OPTIONS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Día</label>
                        <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" style={{ ...INPUT_STYLE, width: '70px' }} />
                      </div>
                    </div>
                  )}
                  {frequency === 'custom' && (
                    <div>
                      <label style={LABEL_STYLE}>Cada cuántos días</label>
                      <input type="number" value={customDays} onChange={e => setCustomDays(e.target.value)} min="1" style={{ ...INPUT_STYLE, width: '80px' }} />
                    </div>
                  )}

                  {/* Toggle: registrar hoy */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                    <div
                      onClick={() => setRegisterToday(p => !p)}
                      style={{
                        width: '32px', height: '18px', borderRadius: '9px',
                        backgroundColor: registerToday ? '#2E7D52' : '#0E1512',
                        border: `0.5px solid ${registerToday ? '#2E7D52' : '#2E7D5230'}`,
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'white',
                        position: 'absolute', top: '3px', left: registerToday ? '17px' : '3px',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#7A9A8A' }}>
                      También registrar el gasto de hoy
                    </span>
                  </label>

                </div>
              )}
            </div>
          )}

          {error && (
            <p style={{ color: '#E84434', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '10px' }}>
              {error}
            </p>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                backgroundColor: 'transparent', border: '0.5px solid #2E7D5240',
                fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#7A9A8A', cursor: 'pointer',
              }}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                backgroundColor: accentColor, border: 'none',
                fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'white', cursor: 'pointer',
                opacity: pending ? 0.7 : 1,
              }}
              disabled={pending}
            >
              {pending ? 'Guardando…' : isEdit ? 'Guardar' : (isRecurring && !registerToday) ? 'Guardar plantilla' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
