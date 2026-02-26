import { useState, useEffect, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// ============================================================
// Types
// ============================================================

type Currency = 'CNY' | 'USD'
type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'
type SubscriptionStatus = 'active' | 'cancelled'
type ThemeMode = 'auto' | 'light' | 'dark'
type TabView = 'dashboard' | 'subscriptions'
type SubStatusFilter = 'active' | 'cancelled'

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

const COLOR_PALETTE = ['#FF6B8A', '#5B9EF4', '#47D4A0', '#FFB74D', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#818CF8', '#FB923C']

const BRAND_COLORS: Record<string, string> = {
  netflix: '#E50914',
  spotify: '#1DB954',
  icloud: '#3693F3',
  apple: '#555555',
  youtube: '#FF0000',
  chatgpt: '#10A37F',
  openai: '#10A37F',
  claude: '#D97757',
  notion: '#000000',
  github: '#24292E',
  figma: '#A259FF',
  adobe: '#FF0000',
  bilibili: '#FB7299',
  b站: '#FB7299',
  爱奇艺: '#00BE06',
  腾讯视频: '#FF6A1E',
  优酷: '#1EBFFF',
  网易云音乐: '#C20C0C',
  qq音乐: '#31C27C',
  百度网盘: '#06A7FF',
  wps: '#1B6DF1',
  微信读书: '#2A8745',
  京东: '#E4393C',
}

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付',
  custom: '自定义',
}

// ============================================================
// Utility Functions
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

function matchBrandColor(name: string): string | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  for (const [keyword, color] of Object.entries(BRAND_COLORS)) {
    if (lower.includes(keyword)) return color
  }
  return null
}

function calculateNextBillDate(startDate: string, cycle: BillingCycle, customDays?: number): string {
  const start = new Date(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (cycle === 'custom' && customDays && customDays > 0) {
    const startMs = start.getTime()
    const todayMs = today.getTime()
    const cyclMs = customDays * 86400000
    const elapsed = todayMs - startMs
    const periods = Math.ceil(elapsed / cyclMs)
    const next = new Date(startMs + periods * cyclMs)
    if (next <= today) next.setTime(next.getTime() + cyclMs)
    return next.toISOString().split('T')[0]
  }

  const monthsMap: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 }
  const months = monthsMap[cycle] ?? 1
  const candidate = new Date(start)

  // Advance to the first future date
  while (candidate <= today) {
    candidate.setMonth(candidate.getMonth() + months)
  }
  return candidate.toISOString().split('T')[0]
}

function getAllCategories(customCategories: Category[]): Category[] {
  const merged = [...DEFAULT_CATEGORIES]
  for (const cat of customCategories) {
    if (!merged.some((c) => c.name === cat.name)) {
      merged.push(cat)
    }
  }
  return merged
}

function assignCategoryColor(existingCategories: Category[]): string {
  const usedColors = new Set(existingCategories.map((c) => c.color))
  const available = COLOR_PALETTE.find((c) => !usedColors.has(c))
  if (available) return available
  return COLOR_PALETTE[existingCategories.length % COLOR_PALETTE.length]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function convertToMonthly(amount: number, cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    case 'custom': return customDays ? amount / (customDays / 30) : 0
  }
}

function convertToYearly(amount: number, cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'yearly': return amount
    case 'custom': return customDays ? amount * (365 / customDays) : 0
  }
}

interface SpendingSummary {
  CNY: { monthly: number; yearly: number }
  USD: { monthly: number; yearly: number }
}

function calcSpendingSummary(subscriptions: Subscription[]): SpendingSummary {
  const result: SpendingSummary = {
    CNY: { monthly: 0, yearly: 0 },
    USD: { monthly: 0, yearly: 0 },
  }
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    result[sub.currency].monthly += convertToMonthly(sub.amount, sub.cycle, sub.customCycleDays)
    result[sub.currency].yearly += convertToYearly(sub.amount, sub.cycle, sub.customCycleDays)
  }
  return result
}

interface CategoryBreakdownItem {
  name: string
  value: number
  color: string
}

function calcCategoryBreakdown(
  subscriptions: Subscription[],
  period: 'monthly' | 'yearly',
  allCategories: Category[],
): { CNY: CategoryBreakdownItem[]; USD: CategoryBreakdownItem[] } {
  const convert = period === 'monthly' ? convertToMonthly : convertToYearly
  const cnyMap = new Map<string, number>()
  const usdMap = new Map<string, number>()

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    const map = sub.currency === 'CNY' ? cnyMap : usdMap
    const val = convert(sub.amount, sub.cycle, sub.customCycleDays)
    map.set(sub.category, (map.get(sub.category) ?? 0) + val)
  }

  const toArray = (map: Map<string, number>): CategoryBreakdownItem[] =>
    Array.from(map.entries()).map(([name, value]) => {
      const cat = allCategories.find((c) => c.name === name)
      return { name, value, color: cat?.color ?? '#A78BFA' }
    })

  return { CNY: toArray(cnyMap), USD: toArray(usdMap) }
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
// Icons
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

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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

// --- Confirm Dialog ---

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-[var(--color-card)] rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-[var(--color-text-primary)] mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm rounded-xl border border-[var(--color-divider)] text-[var(--color-text-secondary)]">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm rounded-xl bg-red-500 text-white">
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Subscription Card ---

function SubscriptionCard({ sub, onClick }: { sub: Subscription; onClick: () => void }) {
  const isCancelled = sub.status === 'cancelled'
  const cycleSuffix = sub.cycle === 'custom' && sub.customCycleDays ? `${sub.customCycleDays}天` : CYCLE_LABELS[sub.cycle]
  const currencySymbol = sub.currency === 'CNY' ? '¥' : '$'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-card)] transition-colors hover:opacity-90 ${isCancelled ? 'opacity-50 grayscale' : ''}`}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: sub.color }}>
        {sub.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{sub.name}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {currencySymbol} {sub.amount.toFixed(2)} / {cycleSuffix}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {isCancelled ? `已取消：${sub.cancelledDate ?? ''}` : `续费日：${formatDate(sub.nextBillDate)}`}
          {' · '}{sub.category}
        </p>
      </div>
      <div className="text-[var(--color-text-secondary)]">
        <ChevronRightIcon />
      </div>
    </button>
  )
}

// --- Dashboard Components ---

function StatsCard({
  title,
  amountCNY,
  amountUSD,
  chartData,
}: {
  title: string
  amountCNY: number
  amountUSD: number
  chartData: { CNY: CategoryBreakdownItem[]; USD: CategoryBreakdownItem[] }
}) {
  const hasCNY = amountCNY > 0
  const hasUSD = amountUSD > 0
  const hasData = hasCNY || hasUSD
  const primaryCurrency = hasCNY ? 'CNY' : 'USD'
  const primaryAmount = hasCNY ? amountCNY : amountUSD
  const primarySymbol = primaryCurrency === 'CNY' ? '¥' : '$'
  const pieData = chartData[primaryCurrency].length > 0 ? chartData[primaryCurrency] : chartData[primaryCurrency === 'CNY' ? 'USD' : 'CNY']

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4">
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">{title}</p>
      {!hasData ? (
        <div className="flex items-center justify-center py-6 text-sm text-[var(--color-text-secondary)]">
          暂无数据
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {hasCNY && (
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                ¥ {amountCNY.toFixed(2)}
              </p>
            )}
            {hasUSD && (
              <p className={`font-bold text-[var(--color-text-primary)] ${hasCNY ? 'text-base mt-1' : 'text-2xl'}`}>
                $ {amountUSD.toFixed(2)}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {pieData.map((item) => (
                <span key={item.name} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
              ))}
            </div>
          </div>
          {pieData.length > 0 && (
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-[var(--color-text-primary)]"
                    fontSize={11}
                    fontWeight={700}
                  >
                    {primarySymbol}{primaryAmount >= 1000 ? `${(primaryAmount / 1000).toFixed(1)}k` : primaryAmount.toFixed(0)}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UpcomingList({ subscriptions }: { subscriptions: Subscription[] }) {
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return subscriptions
      .filter((s) => s.status === 'active' && s.nextBillDate)
      .sort((a, b) => a.nextBillDate.localeCompare(b.nextBillDate))
      .map((sub) => {
        const next = new Date(sub.nextBillDate)
        next.setHours(0, 0, 0, 0)
        const daysDiff = Math.ceil((next.getTime() - today.getTime()) / 86400000)
        return { sub, daysDiff }
      })
  }, [subscriptions])

  const within30 = sorted.filter((item) => item.daysDiff <= 30)
  const beyond30 = sorted.filter((item) => item.daysDiff > 30)
  const displayed = showAll ? sorted : within30

  const formatDaysDiff = (days: number): string => {
    if (days === 0) return '今天'
    if (days < 0) return `已过期 ${Math.abs(days)} 天`
    return `${days} 天后`
  }

  const daysDiffColor = (days: number): string => {
    if (days <= 0) return 'text-red-500'
    if (days <= 3) return 'text-orange-500'
    if (days <= 7) return 'text-[var(--color-accent)]'
    return 'text-[var(--color-text-secondary)]'
  }

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4">
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">即将扣款</p>
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-[var(--color-text-secondary)]">
          暂无生效中的订阅
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {displayed.map(({ sub, daysDiff }) => {
              const currencySymbol = sub.currency === 'CNY' ? '¥' : '$'
              return (
                <div key={sub.id} className="flex items-center gap-3 py-2">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{sub.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {currencySymbol} {sub.amount.toFixed(2)} · {formatDate(sub.nextBillDate)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${daysDiffColor(daysDiff)}`}>
                    {formatDaysDiff(daysDiff)}
                  </span>
                </div>
              )
            })}
          </div>
          {beyond30.length > 0 && (
            <button
              onClick={() => setShowAll((p) => !p)}
              className="w-full mt-2 py-2 text-xs text-[var(--color-accent)] font-medium"
            >
              {showAll ? '收起' : `查看全部（还有 ${beyond30.length} 项）`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function DashboardView({
  subscriptions,
  allCategories,
}: {
  subscriptions: Subscription[]
  allCategories: Category[]
}) {
  const summary = useMemo(() => calcSpendingSummary(subscriptions), [subscriptions])
  const monthlyBreakdown = useMemo(() => calcCategoryBreakdown(subscriptions, 'monthly', allCategories), [subscriptions, allCategories])
  const yearlyBreakdown = useMemo(() => calcCategoryBreakdown(subscriptions, 'yearly', allCategories), [subscriptions, allCategories])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="月度支出"
          amountCNY={summary.CNY.monthly}
          amountUSD={summary.USD.monthly}
          chartData={monthlyBreakdown}
        />
        <StatsCard
          title="年度支出"
          amountCNY={summary.CNY.yearly}
          amountUSD={summary.USD.yearly}
          chartData={yearlyBreakdown}
        />
      </div>
      <UpcomingList subscriptions={subscriptions} />
    </div>
  )
}

// --- Subscriptions View ---

function SubscriptionsView({
  subscriptions,
  onEdit,
}: {
  subscriptions: Subscription[]
  onEdit: (id: string) => void
}) {
  const [filter, setFilter] = useState<SubStatusFilter>('active')

  const filtered = useMemo(
    () => subscriptions.filter((s) => s.status === filter),
    [subscriptions, filter],
  )

  return (
    <div>
      <div className="flex p-1 rounded-xl bg-[var(--color-card)] mb-4">
        {(['active', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === status
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {status === 'active' ? '生效中' : '已取消'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
          <p className="text-sm">{filter === 'active' ? '暂无生效中的订阅' : '暂无已取消的订阅'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} onClick={() => onEdit(sub.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Subscription Drawer ---

interface DrawerProps {
  open: boolean
  editingSub: Subscription | null
  allCategories: Category[]
  onSave: (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillDate' | 'status' | 'cancelledDate'>) => void
  onUpdate: (id: string, data: Partial<Subscription>) => void
  onDelete: (id: string) => void
  onCancel: () => void
  onToggleStatus: (id: string) => void
  onAddCategory: (name: string) => void
}

function SubscriptionDrawer({ open, editingSub, allCategories, onSave, onUpdate, onDelete, onCancel, onToggleStatus, onAddCategory }: DrawerProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('CNY')
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [customDays, setCustomDays] = useState('')
  const [startDate, setStartDate] = useState(todayString())
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].name)
  const [color, setColor] = useState(DEFAULT_CATEGORIES[0].color)
  const [note, setNote] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset form when opening
  useEffect(() => {
    if (!open) return
    if (editingSub) {
      setName(editingSub.name)
      setAmount(String(editingSub.amount))
      setCurrency(editingSub.currency)
      setCycle(editingSub.cycle)
      setCustomDays(editingSub.customCycleDays ? String(editingSub.customCycleDays) : '')
      setStartDate(editingSub.startDate)
      setCategory(editingSub.category)
      setColor(editingSub.color)
      setNote(editingSub.note ?? '')
    } else {
      setName('')
      setAmount('')
      setCurrency('CNY')
      setCycle('monthly')
      setCustomDays('')
      setStartDate(todayString())
      setCategory(DEFAULT_CATEGORIES[0].name)
      setColor(DEFAULT_CATEGORIES[0].color)
      setNote('')
    }
    setShowNewCategory(false)
    setNewCategoryName('')
    setShowDeleteConfirm(false)
  }, [open, editingSub])

  // Brand color matching on name change
  useEffect(() => {
    if (editingSub) return // don't auto-change color when editing
    const brandColor = matchBrandColor(name)
    if (brandColor) {
      setColor(brandColor)
    } else {
      const cat = allCategories.find((c) => c.name === category)
      if (cat) setColor(cat.color)
    }
  }, [name, category, allCategories, editingSub])

  const previewNextBillDate = useMemo(() => {
    if (!startDate) return ''
    const days = cycle === 'custom' ? parseInt(customDays) : undefined
    if (cycle === 'custom' && (!days || days <= 0)) return ''
    return calculateNextBillDate(startDate, cycle, days)
  }, [startDate, cycle, customDays])

  const handleSave = () => {
    const amt = parseFloat(amount)
    if (!name.trim() || isNaN(amt) || amt <= 0 || !startDate || !category) return
    if (cycle === 'custom') {
      const d = parseInt(customDays)
      if (isNaN(d) || d <= 0) return
    }

    const data = {
      name: name.trim(),
      amount: amt,
      currency,
      cycle,
      customCycleDays: cycle === 'custom' ? parseInt(customDays) : undefined,
      startDate,
      category,
      color,
      note: note.trim() || undefined,
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
    setCategory(trimmed)
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如 Netflix、Spotify"
                className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-card)] text-sm text-[var(--color-text-primary)] border border-[var(--color-divider)] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="w-10 h-10 rounded-xl shrink-0 border border-[var(--color-divider)]" style={{ backgroundColor: color }} />
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
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-3 text-xs font-medium transition-colors ${
                      currency === c ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {c === 'CNY' ? '¥' : '$'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                  onClick={() => setCycle(c)}
                  className={`px-4 py-2.5 text-xs font-medium rounded-xl transition-colors ${
                    cycle === c ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-divider)]'
                  }`}
                >
                  {CYCLE_LABELS[c]}
                </button>
              ))}
            </div>
            {cycle === 'custom' && (
              <input
                type="number"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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
                  onClick={() => { setCategory(cat.name); if (!editingSub && !matchBrandColor(name)) setColor(cat.color) }}
                  className={`px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                    category === cat.name ? 'text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-divider)]'
                  }`}
                  style={category === cat.name ? { backgroundColor: cat.color } : undefined}
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
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[var(--color-accent)] scale-110' : ''}`}
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
              value={note}
              onChange={(e) => setNote(e.target.value)}
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

// ============================================================
// App
// ============================================================

export { DEFAULT_CATEGORIES }
export type { Subscription, Category, Currency, BillingCycle, SubscriptionStatus }

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

  const handleSave = useCallback((data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillDate' | 'status' | 'cancelledDate'>) => {
    const now = new Date().toISOString()
    const nextBillDate = calculateNextBillDate(data.startDate, data.cycle, data.customCycleDays)
    const newSub: Subscription = {
      ...data,
      id: crypto.randomUUID(),
      nextBillDate,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    setSubscriptions((prev) => [...prev, newSub])
    closeDrawer()
  }, [closeDrawer])

  const handleUpdate = useCallback((id: string, data: Partial<Subscription>) => {
    setSubscriptions((prev) => prev.map((s) => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s))
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
      const nextBillDate = calculateNextBillDate(s.startDate, s.cycle, s.customCycleDays)
      return { ...s, status: 'active' as const, cancelledDate: undefined, nextBillDate, updatedAt: new Date().toISOString() }
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
