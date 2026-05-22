import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Subscription, Category, ThemeMode, TabView, PriceChangeMode } from './types'
import { STORAGE_KEYS } from './constants'
import { loadFromStorage, saveToStorage, getAllCategories, assignCategoryColor, applyPriceChangeFromDate, calculateSubscriptionNextBillDate, generateBillingHistory, generateId, reactivateSubscription, rewriteSubscriptionBilling, syncActiveSubscriptionBilling, todayString, applyTheme } from './utils'
import type { ExportData } from './types'
import { Header, TabBar, FAB, DashboardView, SubscriptionsView, BillingHistoryView, SubscriptionDrawer, SettingsPanel } from './components/index'

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
      const updated = prev.map(syncActiveSubscriptionBilling)
      const changed = updated.some((sub, index) => sub !== prev[index])
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

  const handleImport = useCallback((data: ExportData) => {
    setSubscriptions(data.subscriptions.map(syncActiveSubscriptionBilling))
    setCustomCategories(data.categories ?? [])
  }, [])

  const openNewDrawer = useCallback(() => { setEditingId(null); setDrawerOpen(true) }, [])
  const openEditDrawer = useCallback((id: string) => { setEditingId(id); setDrawerOpen(true) }, [])
  const closeDrawer = useCallback(() => { setDrawerOpen(false); setEditingId(null) }, [])

  const handleSave = useCallback((data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillDate' | 'status' | 'cancelledDate' | 'billingHistory' | 'priceHistory'>) => {
    const now = new Date().toISOString()
    const today = todayString()
    const priceSegmentId = generateId()
    const priceHistory = [{
      id: priceSegmentId,
      effectiveDate: data.startDate,
      amount: data.amount,
      currency: data.currency,
      cycle: data.cycle,
      customCycleDays: data.customCycleDays,
    }]
    const billingHistory = generateBillingHistory(data.startDate, data.cycle, data.customCycleDays, data.amount, today, data.currency, priceSegmentId)
    const newSub: Subscription = {
      ...data,
      id: generateId(),
      nextBillDate: '',
      billingHistory,
      priceHistory,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    setSubscriptions((prev) => [...prev, { ...newSub, nextBillDate: calculateSubscriptionNextBillDate(newSub) }])
    closeDrawer()
  }, [closeDrawer])

  const handleUpdate = useCallback((id: string, data: Partial<Subscription>, priceChangeMode?: PriceChangeMode) => {
    setSubscriptions((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const merged = { ...s, ...data, updatedAt: new Date().toISOString() }
      const amountChanged = data.amount !== undefined && data.amount !== s.amount
      const currencyChanged = data.currency !== undefined && data.currency !== s.currency
      const cycleChanged = data.cycle !== undefined && data.cycle !== s.cycle
      const startDateChanged = data.startDate !== undefined && data.startDate !== s.startDate
      const customDaysChanged = data.customCycleDays !== undefined && data.customCycleDays !== s.customCycleDays
      const billingChanged = amountChanged || currencyChanged || cycleChanged || startDateChanged || customDaysChanged
      if (billingChanged) {
        const billingData = {
          amount: merged.amount,
          currency: merged.currency,
          cycle: merged.cycle,
          customCycleDays: merged.customCycleDays,
          startDate: merged.startDate,
        }
        if (priceChangeMode === 'future') {
          const effectiveDate = s.nextBillDate || todayString()
          return {
            ...applyPriceChangeFromDate({ ...s, ...data }, billingData, effectiveDate),
            name: merged.name,
            category: merged.category,
            color: merged.color,
            note: merged.note,
            updatedAt: merged.updatedAt,
          }
        }
        return {
          ...rewriteSubscriptionBilling({ ...s, ...data }, billingData),
          name: merged.name,
          category: merged.category,
          color: merged.color,
          note: merged.note,
          updatedAt: merged.updatedAt,
        }
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
      return { ...reactivateSubscription(s), updatedAt: new Date().toISOString() }
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
          {activeTab === 'dashboard' && (
            <DashboardView subscriptions={subscriptions} allCategories={allCategories} />
          )}
          {activeTab === 'subscriptions' && (
            <SubscriptionsView subscriptions={subscriptions} onEdit={openEditDrawer} />
          )}
          {activeTab === 'history' && (
            <BillingHistoryView subscriptions={subscriptions} />
          )}

        </main>
      </div>

      {showSettings && (
        <SettingsPanel
          theme={theme}
          onThemeChange={setTheme}
          subscriptions={subscriptions}
          customCategories={customCategories}
          onImport={handleImport}
          onClose={() => setShowSettings(false)}
        />
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
