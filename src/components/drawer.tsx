import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Currency, BillingCycle, Category, Subscription } from '../types'
import { COLOR_PALETTE, CYCLE_LABELS, DEFAULT_CATEGORIES } from '../constants'
import { todayString, matchBrandColor, calculateNextBillDate } from '../utils'
import { CloseIcon } from './icons'
import { ConfirmDialog } from './common'

interface DrawerForm {
  name: string
  amount: string
  currency: Currency
  cycle: BillingCycle
  customDays: string
  startDate: string
  category: string
  color: string
  note: string
}

const defaultForm: DrawerForm = {
  name: '',
  amount: '',
  currency: 'CNY',
  cycle: 'monthly',
  customDays: '',
  startDate: '',
  category: DEFAULT_CATEGORIES[0].name,
  color: DEFAULT_CATEGORIES[0].color,
  note: '',
}

export interface DrawerProps {
  open: boolean
  editingSub: Subscription | null
  allCategories: Category[]
  onSave: (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillDate' | 'status' | 'cancelledDate' | 'billingHistory'>) => void
  onUpdate: (id: string, data: Partial<Subscription>) => void
  onDelete: (id: string) => void
  onCancel: () => void
  onToggleStatus: (id: string) => void
  onAddCategory: (name: string) => void
}

export function SubscriptionDrawer({ open, editingSub, allCategories, onSave, onUpdate, onDelete, onCancel, onToggleStatus, onAddCategory }: DrawerProps) {
  const [form, setForm] = useState<DrawerForm>(defaultForm)
  const updateForm = useCallback((patch: Partial<DrawerForm>) => setForm((prev) => ({ ...prev, ...patch })), [])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset form when opening
  useEffect(() => {
    if (!open) return
    if (editingSub) {
      setForm({
        name: editingSub.name,
        amount: String(editingSub.amount),
        currency: editingSub.currency,
        cycle: editingSub.cycle,
        customDays: editingSub.customCycleDays ? String(editingSub.customCycleDays) : '',
        startDate: editingSub.startDate,
        category: editingSub.category,
        color: editingSub.color,
        note: editingSub.note ?? '',
      })
    } else {
      setForm({ ...defaultForm, startDate: todayString() })
    }
    setShowNewCategory(false)
    setNewCategoryName('')
    setShowDeleteConfirm(false)
  }, [open, editingSub])

  // Brand color matching on name change
  useEffect(() => {
    if (editingSub) return
    const brandColor = matchBrandColor(form.name)
    if (brandColor) {
      updateForm({ color: brandColor })
    } else {
      const cat = allCategories.find((c) => c.name === form.category)
      if (cat) updateForm({ color: cat.color })
    }
  }, [form.name, form.category, allCategories, editingSub, updateForm])

  const previewNextBillDate = useMemo(() => {
    if (!form.startDate) return ''
    const days = form.cycle === 'custom' ? parseInt(form.customDays) : undefined
    if (form.cycle === 'custom' && (!days || days <= 0)) return ''
    return calculateNextBillDate(form.startDate, form.cycle, days)
  }, [form.startDate, form.cycle, form.customDays])

  const handleSave = () => {
    const amt = parseFloat(form.amount)
    if (!form.name.trim() || isNaN(amt) || amt <= 0 || !form.startDate || !form.category) return
    if (form.cycle === 'custom') {
      const d = parseInt(form.customDays)
      if (isNaN(d) || d <= 0) return
    }

    const data = {
      name: form.name.trim(),
      amount: amt,
      currency: form.currency,
      cycle: form.cycle,
      customCycleDays: form.cycle === 'custom' ? parseInt(form.customDays) : undefined,
      startDate: form.startDate,
      category: form.category,
      color: form.color,
      note: form.note.trim() || undefined,
    }

    if (editingSub) {
      onUpdate(editingSub.id, { ...data, updatedAt: new Date().toISOString(), nextBillDate: previewNextBillDate })
    } else {
      onSave(data)
    }
  }

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (allCategories.some((c) => c.name === trimmed)) return
    onAddCategory(trimmed)
    updateForm({ category: trimmed })
    setShowNewCategory(false)
    setNewCategoryName('')
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onCancel} />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--color-bg)] rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-divider)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {editingSub ? '编辑订阅' : '添加订阅'}
          </h2>
          <button onClick={onCancel} className="p-1 text-[var(--color-text-secondary)]">
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">名称 *</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="如 Netflix、Spotify"
                className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="w-10 h-10 rounded-xl shrink-0 border border-[var(--color-divider)]" style={{ backgroundColor: form.color }} />
            </div>
          </div>

          {/* Amount + Currency */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">金额 *</label>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-[var(--color-divider)] overflow-hidden">
                {(['CNY', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => updateForm({ currency: c })}
                    className={`px-3 py-3 text-xs font-medium transition-colors ${
                      form.currency === c ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {c === 'CNY' ? '¥' : '$'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => updateForm({ amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Billing Cycle */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">计费周期 *</label>
            <div className="flex gap-2 flex-wrap">
              {(['monthly', 'quarterly', 'yearly', 'custom'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => updateForm({ cycle: c })}
                  className={`px-4 py-2.5 text-xs font-medium rounded-xl transition-colors ${
                    form.cycle === c ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-divider)]'
                  }`}
                >
                  {CYCLE_LABELS[c]}
                </button>
              ))}
            </div>
            {form.cycle === 'custom' && (
              <input
                type="number"
                value={form.customDays}
                onChange={(e) => updateForm({ customDays: e.target.value })}
                placeholder="天数"
                min="1"
                className="mt-2 w-32 px-4 py-3 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
              />
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">起始日期 *</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => updateForm({ startDate: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
            />
            {previewNextBillDate && (
              <p className="text-xs text-[var(--color-accent)] mt-1.5">下次扣款日：{previewNextBillDate}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">分类 *</label>
            <div className="flex gap-2 flex-wrap">
              {allCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    const patch: Partial<DrawerForm> = { category: cat.name }
                    if (!editingSub && !matchBrandColor(form.name)) patch.color = cat.color
                    updateForm(patch)
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                    form.category === cat.name ? 'text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-divider)]'
                  }`}
                  style={form.category === cat.name ? { backgroundColor: cat.color } : undefined}
                >
                  {cat.name}
                </button>
              ))}
              <button
                onClick={() => setShowNewCategory(true)}
                className="px-3 py-2 text-xs font-medium rounded-xl bg-[var(--color-card)] text-[var(--color-accent)] border border-dashed border-[var(--color-accent)]"
              >
                + 新分类
              </button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="分类名称"
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory() }}
                  autoFocus
                />
                <button onClick={handleAddCategory} className="px-3 py-2 text-xs rounded-xl bg-[var(--color-accent)] text-white">
                  添加
                </button>
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">卡片颜色</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => updateForm({ color: c })}
                  className={`w-8 h-8 rounded-lg transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-[var(--color-accent)] scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">备注</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => updateForm({ note: e.target.value })}
              placeholder="可选"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[var(--color-divider)] space-y-3">
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 text-sm font-medium rounded-xl border border-[var(--color-divider)] text-[var(--color-text-secondary)]">
              取消
            </button>
            <button onClick={handleSave} className="flex-1 py-3 text-sm font-medium rounded-xl bg-[var(--color-accent)] text-white">
              保存
            </button>
          </div>
          {editingSub && (
            <div className="flex gap-3">
              <button
                onClick={() => onToggleStatus(editingSub.id)}
                className="flex-1 py-3 text-sm font-medium rounded-xl border border-[var(--color-divider)] text-[var(--color-text-primary)]"
              >
                {editingSub.status === 'active' ? '标记为已取消' : '重新激活'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="py-3 px-5 text-sm font-medium rounded-xl bg-red-500/10 text-red-500"
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && editingSub && (
        <ConfirmDialog
          message={`确定要删除「${editingSub.name}」吗？此操作不可撤销。`}
          onConfirm={() => { onDelete(editingSub.id); setShowDeleteConfirm(false) }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
