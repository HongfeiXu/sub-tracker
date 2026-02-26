import { useState, useEffect, useCallback } from 'react'

// ============================================================
// Types
// ============================================================

type Currency = 'CNY' | 'USD'

type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'

type SubscriptionStatus = 'active' | 'cancelled'

type ThemeMode = 'auto' | 'light' | 'dark'

type TabView = 'dashboard' | 'subscriptions'

interface Subscription {
  id: string
  name: string
  amount: number
  currency: Currency
  cycle: BillingCycle
  customCycleDays?: number
  startDate: string
  nextBillDate: string
  category: string
  color: string
  status: SubscriptionStatus
  cancelledDate?: string
  note?: string
  createdAt: string
  updatedAt: string
}

interface Category {
  name: string
  color: string
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'subtracker_subscriptions',
  CATEGORIES: 'subtracker_categories',
  THEME: 'subtracker_theme',
} as const

const DEFAULT_CATEGORIES: Category[] = [
  { name: '影音娱乐', color: '#FF6B8A' },
  { name: '工具软件', color: '#5B9EF4' },
  { name: '云存储', color: '#47D4A0' },
  { name: '会员服务', color: '#FFB74D' },
  { name: '其他', color: '#A78BFA' },
]

// ============================================================
// localStorage Utilities
// ============================================================

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ============================================================
// Theme Management
// ============================================================

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode): void {
  const resolved = mode === 'auto' ? getSystemTheme() : mode
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

// ============================================================
// Icons (inline SVG components)
// ============================================================

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ============================================================
// Components
// ============================================================

function Header({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">SubTracker</h1>
      <button
        onClick={onSettingsClick}
        className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-colors"
      >
        <SettingsIcon />
      </button>
    </header>
  )
}

function TabBar({ activeTab, onTabChange }: { activeTab: TabView; onTabChange: (tab: TabView) => void }) {
  const tabs: { key: TabView; label: string }[] = [
    { key: 'dashboard', label: '总览' },
    { key: 'subscriptions', label: '订阅列表' },
  ]

  return (
    <div className="flex mx-5 mb-4 p-1 rounded-xl bg-[var(--color-card)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === tab.key
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
    >
      <PlusIcon />
    </button>
  )
}

// ============================================================
// App
// ============================================================

// Mark types as used — they will be actively used in Phase 2+
export { DEFAULT_CATEGORIES }
export type { Subscription, Category, Currency, BillingCycle, SubscriptionStatus }

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadFromStorage(STORAGE_KEYS.THEME, 'auto' as ThemeMode))
  const [activeTab, setActiveTab] = useState<TabView>('dashboard')
  const [showSettings, setShowSettings] = useState(false)

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme)
    saveToStorage(STORAGE_KEYS.THEME, theme)
  }, [theme])

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'auto') applyTheme('auto')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const handleSettingsClick = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  // Temporary theme cycling for testing (will be replaced by settings panel in Phase 4)
  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const order: ThemeMode[] = ['auto', 'light', 'dark']
      return order[(order.indexOf(prev) + 1) % order.length]
    })
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans transition-colors">
      <div className="mx-auto max-w-[960px]">
        <Header onSettingsClick={handleSettingsClick} />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="px-5 pb-24">
          {activeTab === 'dashboard' ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <p className="text-lg mb-2">总览</p>
              <p className="text-sm">Phase 3 实现</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <p className="text-lg mb-2">订阅列表</p>
              <p className="text-sm">Phase 2 实现</p>
            </div>
          )}

          {/* Temporary theme switcher for Phase 1 testing */}
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

      <FAB onClick={() => {}} />
    </div>
  )
}
