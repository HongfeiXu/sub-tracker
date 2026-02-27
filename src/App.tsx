import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Subscription, Category, ThemeMode, TabView } from './types'
import { STORAGE_KEYS } from './constants'
import { loadFromStorage, saveToStorage, getAllCategories, assignCategoryColor, calculateNextBillDate, generateBillingHistory, advanceBillingHistory, todayString, applyTheme } from './utils'
import { Header, TabBar, FAB, DashboardView, SubscriptionsView, SubscriptionDrawer } from './components'

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadFromStorage(STORAGE_KEYS.THEME, 'auto' as ThemeMode))
  const [activeTab, setActiveTab] = useState<TabView>('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadFromStorage(STORAGE_KEYS.SUBSCRIPTIONS, [] as Subscription[]))
  const [customCategories, setCustomCategories] = useState<Category[]>(() => loadFromStorage(STORAGE_KEYS.CATEGORIES, [] as Category[]))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const allCategories = useMemo(() => getAllCategories(customCategories), [customCategories])
  const editingSub = useMemo(() => editingId ? subscriptions.find((s) => s.id === editingId) ?? null : null, [editingId, subscriptions])

  // Auto-advance billing history on app load
  useEffect(() => {
    setSubscriptions((prev) => {
      let changed = false
      const updated = prev.map((sub) => {
        if (sub.status !== 'active') return sub
        const result = advanceBillingHistory(sub)
        if (result.billingHistory.length !== sub.billingHistory.length) {
          changed = true
          return { ...sub, billingHistory: result.billingHistory, nextBillDate: result.nextBillDate }
        }
        return sub
      })
      return changed ? updated : prev
    })
  }, [])

  // Persist subscriptions
  useEffect(() => { saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions) }, [subscriptions])
  // Persist custom categories
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIES, customCategories) }, [customCategories])
  // Theme
  useEffect(() => { applyTheme(theme); saveToStorage(STORAGE_KEYS.THEME, theme) }, [theme])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (theme === 'auto') applyTheme('auto') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const handleSettingsClick = useCallback(() => setShowSettings((p) => !p), [])

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const order: ThemeMode[] = ['auto', 'light', 'dark']
      return order[(order.indexOf(prev) + 1) % order.length]
    })
  }, [])

  const openNewDrawer = useCallback(() => { setEditingId(null); setDrawerOpen(true) }, [])
  const openEditDrawer = useCallback((id: string) => { setEditingId(id); setDrawerOpen(true) }, [])
  const closeDrawer = useCallback(() => { setDrawerOpen(false); setEditingId(null) }, [])

  const handleSave = useCallback((data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillDate' | 'status' | 'cancelledDate' | 'billingHistory'>) => {
    const now = new Date().toISOString()
    const today = todayString()
    const nextBillDate = calculateNextBillDate(data.startDate, data.cycle, data.customCycleDays)
    const billingHistory = generateBillingHistory(data.startDate, data.cycle, data.customCycleDays, data.amount, today)
    const newSub: Subscription = {
      ...data,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      nextBillDate,
      billingHistory,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    setSubscriptions((prev) => [...prev, newSub])
    closeDrawer()
  }, [closeDrawer])

  const handleUpdate = useCallback((id: string, data: Partial<Subscription>) => {
    setSubscriptions((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const merged = { ...s, ...data, updatedAt: new Date().toISOString() }
      const amountChanged = data.amount !== undefined && data.amount !== s.amount
      const cycleChanged = data.cycle !== undefined && data.cycle !== s.cycle
      const startDateChanged = data.startDate !== undefined && data.startDate !== s.startDate
      const customDaysChanged = data.customCycleDays !== undefined && data.customCycleDays !== s.customCycleDays
      if (amountChanged || cycleChanged || startDateChanged || customDaysChanged) {
        merged.billingHistory = generateBillingHistory(merged.startDate, merged.cycle, merged.customCycleDays, merged.amount, todayString())
      }
      return merged
    }))
    closeDrawer()
  }, [closeDrawer])

  const handleDelete = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id))
    closeDrawer()
  }, [closeDrawer])

  const handleToggleStatus = useCallback((id: string) => {
    setSubscriptions((prev) => prev.map((s) => {
      if (s.id !== id) return s
      if (s.status === 'active') {
        return { ...s, status: 'cancelled' as const, cancelledDate: todayString(), nextBillDate: '', updatedAt: new Date().toISOString() }
      }
      const today = todayString()
      const nextBillDate = calculateNextBillDate(today, s.cycle, s.customCycleDays)
      const alreadyBilledToday = s.billingHistory.some((r) => r.date === today)
      const billingHistory = alreadyBilledToday ? s.billingHistory : [...s.billingHistory, { date: today, amount: s.amount }]
      return { ...s, status: 'active' as const, cancelledDate: undefined, nextBillDate, billingHistory, updatedAt: new Date().toISOString() }
    }))
    closeDrawer()
  }, [closeDrawer])

  const handleAddCategory = useCallback((name: string) => {
    const color = assignCategoryColor(allCategories)
    setCustomCategories((prev) => [...prev, { name, color }])
  }, [allCategories])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans transition-colors">
      <div className="mx-auto max-w-[960px]">
        <Header onSettingsClick={handleSettingsClick} />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="px-5 pb-24">
          {activeTab === 'dashboard' ? (
            <DashboardView subscriptions={subscriptions} allCategories={allCategories} />
          ) : (
            <SubscriptionsView subscriptions={subscriptions} onEdit={openEditDrawer} />
          )}

          {/* Temporary theme switcher */}
          <div className="fixed bottom-6 left-6 z-50">
            <button
              onClick={cycleTheme}
              className="px-3 py-2 text-xs rounded-xl bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-divider)]"
            >
              主题: {theme === 'auto' ? '自动' : theme === 'light' ? '浅色' : '深色'}
            </button>
          </div>
        </main>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)}>
          <div
            className="absolute top-14 right-4 w-64 p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-divider)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">设置</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Phase 4 实现</p>
          </div>
        </div>
      )}

      <SubscriptionDrawer
        open={drawerOpen}
        editingSub={editingSub}
        allCategories={allCategories}
        onSave={handleSave}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCancel={closeDrawer}
        onToggleStatus={handleToggleStatus}
        onAddCategory={handleAddCategory}
      />

      {!drawerOpen && <FAB onClick={openNewDrawer} />}
    </div>
  )
}
