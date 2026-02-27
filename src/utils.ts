import type { BillingCycle, BillingRecord, Category, CategoryBreakdownItem, ExportData, ItemBreakdownItem, Subscription, SpendingSummary, ThemeMode } from './types'
import { BRAND_COLORS, COLOR_PALETTE, CYCLE_MONTHS, DEFAULT_CATEGORIES } from './constants'

// Storage

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// Color

export function matchBrandColor(name: string): string | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  for (const [keyword, color] of Object.entries(BRAND_COLORS)) {
    if (lower.includes(keyword)) return color
  }
  return null
}

// Date / Billing

export function calculateNextBillDate(startDate: string, cycle: BillingCycle, customDays?: number): string {
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
    return toLocalDateString(next)
  }

  const months = CYCLE_MONTHS[cycle] ?? 1
  const candidate = new Date(start)

  // Advance to the first future date
  while (candidate <= today) {
    candidate.setMonth(candidate.getMonth() + months)
  }
  return toLocalDateString(candidate)
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayString(): string {
  return toLocalDateString(new Date())
}

export function generateBillingDates(startDate: string, cycle: BillingCycle, customDays: number | undefined, endDate: string): string[] {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  if (start > end) return []

  const dates: string[] = [toLocalDateString(start)]

  if (cycle === 'custom' && customDays && customDays > 0) {
    const cyclMs = customDays * 86400000
    const cursor = new Date(start)
    while (true) {
      cursor.setTime(cursor.getTime() + cyclMs)
      if (cursor > end) break
      dates.push(toLocalDateString(cursor))
    }
    return dates
  }

  const months = CYCLE_MONTHS[cycle] ?? 1
  const cursor = new Date(start)
  while (true) {
    cursor.setMonth(cursor.getMonth() + months)
    if (cursor > end) break
    dates.push(toLocalDateString(cursor))
  }
  return dates
}

export function generateBillingHistory(startDate: string, cycle: BillingCycle, customDays: number | undefined, amount: number, endDate: string): BillingRecord[] {
  return generateBillingDates(startDate, cycle, customDays, endDate).map((date) => ({ date, amount }))
}

export function advanceBillingHistory(sub: Subscription): { billingHistory: BillingRecord[]; nextBillDate: string } {
  if (sub.status === 'cancelled') {
    return { billingHistory: sub.billingHistory, nextBillDate: sub.nextBillDate }
  }
  const today = todayString()
  const lastDate = sub.billingHistory.length > 0 ? sub.billingHistory[sub.billingHistory.length - 1].date : sub.startDate
  const nextFromLast = parseLocalDate(lastDate)
  const todayDate = parseLocalDate(today)

  const newRecords: BillingRecord[] = []

  if (sub.cycle === 'custom' && sub.customCycleDays && sub.customCycleDays > 0) {
    const cyclMs = sub.customCycleDays * 86400000
    const cursor = new Date(nextFromLast)
    while (true) {
      cursor.setTime(cursor.getTime() + cyclMs)
      if (cursor > todayDate) break
      newRecords.push({ date: toLocalDateString(cursor), amount: sub.amount })
    }
  } else {
    const months = CYCLE_MONTHS[sub.cycle] ?? 1
    const cursor = new Date(nextFromLast)
    while (true) {
      cursor.setMonth(cursor.getMonth() + months)
      if (cursor > todayDate) break
      newRecords.push({ date: toLocalDateString(cursor), amount: sub.amount })
    }
  }

  const billingHistory = [...sub.billingHistory, ...newRecords]
  const nextBillDate = calculateNextBillDate(sub.startDate, sub.cycle, sub.customCycleDays)
  return { billingHistory, nextBillDate }
}

// Categories

export function getAllCategories(customCategories: Category[]): Category[] {
  const merged = [...DEFAULT_CATEGORIES]
  for (const cat of customCategories) {
    if (!merged.some((c) => c.name === cat.name)) {
      merged.push(cat)
    }
  }
  return merged
}

export function assignCategoryColor(existingCategories: Category[]): string {
  const usedColors = new Set(existingCategories.map((c) => c.color))
  const available = COLOR_PALETTE.find((c) => !usedColors.has(c))
  if (available) return available
  return COLOR_PALETTE[existingCategories.length % COLOR_PALETTE.length]
}

// Amount conversion

export function convertToMonthly(amount: number, cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    case 'custom': return customDays ? amount / (customDays / 30) : 0
  }
}

export function convertToYearly(amount: number, cycle: BillingCycle, customDays?: number): number {
  switch (cycle) {
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'yearly': return amount
    case 'custom': return customDays ? amount * (365 / customDays) : 0
  }
}

// Spending stats

export function calcSpendingSummary(subscriptions: Subscription[]): SpendingSummary {
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

export function calcCategoryBreakdown(
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

export function calcYearlyActualSpending(subscriptions: Subscription[]): { CNY: number; USD: number } {
  const currentYear = new Date().getFullYear()
  const yearPrefix = String(currentYear)
  const result = { CNY: 0, USD: 0 }
  for (const sub of subscriptions) {
    for (const record of sub.billingHistory) {
      if (record.date.startsWith(yearPrefix)) {
        result[sub.currency] += record.amount
      }
    }
  }
  return result
}

export function calcYearlyCategoryBreakdown(
  subscriptions: Subscription[],
  allCategories: Category[],
): { CNY: CategoryBreakdownItem[]; USD: CategoryBreakdownItem[] } {
  const currentYear = new Date().getFullYear()
  const yearPrefix = String(currentYear)
  const cnyMap = new Map<string, number>()
  const usdMap = new Map<string, number>()

  for (const sub of subscriptions) {
    const map = sub.currency === 'CNY' ? cnyMap : usdMap
    let yearTotal = 0
    for (const record of sub.billingHistory) {
      if (record.date.startsWith(yearPrefix)) {
        yearTotal += record.amount
      }
    }
    if (yearTotal > 0) {
      map.set(sub.category, (map.get(sub.category) ?? 0) + yearTotal)
    }
  }

  const toArray = (map: Map<string, number>): CategoryBreakdownItem[] =>
    Array.from(map.entries()).map(([name, value]) => {
      const cat = allCategories.find((c) => c.name === name)
      return { name, value, color: cat?.color ?? '#A78BFA' }
    })

  return { CNY: toArray(cnyMap), USD: toArray(usdMap) }
}

export function calcMonthlyItemBreakdown(subscriptions: Subscription[]): { CNY: ItemBreakdownItem[]; USD: ItemBreakdownItem[] } {
  const cny: ItemBreakdownItem[] = []
  const usd: ItemBreakdownItem[] = []
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    const value = convertToMonthly(sub.amount, sub.cycle, sub.customCycleDays)
    if (value <= 0) continue
    const item = { name: sub.name, value, color: sub.color, category: sub.category }
    if (sub.currency === 'CNY') cny.push(item); else usd.push(item)
  }
  const sort = (arr: ItemBreakdownItem[]) => arr.sort((a, b) => a.category.localeCompare(b.category) || b.value - a.value)
  return { CNY: sort(cny), USD: sort(usd) }
}

export function calcYearlyItemBreakdown(subscriptions: Subscription[]): { CNY: ItemBreakdownItem[]; USD: ItemBreakdownItem[] } {
  const currentYear = new Date().getFullYear()
  const yearPrefix = String(currentYear)
  const cny: ItemBreakdownItem[] = []
  const usd: ItemBreakdownItem[] = []
  for (const sub of subscriptions) {
    let yearTotal = 0
    for (const record of sub.billingHistory) {
      if (record.date.startsWith(yearPrefix)) yearTotal += record.amount
    }
    if (yearTotal <= 0) continue
    const item = { name: sub.name, value: yearTotal, color: sub.color, category: sub.category }
    if (sub.currency === 'CNY') cny.push(item); else usd.push(item)
  }
  const sort = (arr: ItemBreakdownItem[]) => arr.sort((a, b) => a.category.localeCompare(b.category) || b.value - a.value)
  return { CNY: sort(cny), USD: sort(usd) }
}

// Export / Import

export function buildExportData(subscriptions: Subscription[], customCategories: Category[]): ExportData {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    subscriptions,
    categories: customCategories,
  }
}

export function downloadJson(data: ExportData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `subtracker-export-${todayString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportData(text: string): ExportData {
  const data = JSON.parse(text) as Record<string, unknown>
  if (typeof data.version !== 'string') throw new Error('缺少 version 字段')
  if (!Array.isArray(data.subscriptions)) throw new Error('缺少 subscriptions 数组')
  for (let i = 0; i < data.subscriptions.length; i++) {
    const s = data.subscriptions[i] as Record<string, unknown>
    if (typeof s.id !== 'string') throw new Error(`subscriptions[${i}] 缺少 id`)
    if (typeof s.name !== 'string') throw new Error(`subscriptions[${i}] 缺少 name`)
    if (typeof s.amount !== 'number') throw new Error(`subscriptions[${i}] amount 不是数字`)
    if (s.currency !== 'CNY' && s.currency !== 'USD') throw new Error(`subscriptions[${i}] currency 无效`)
    if (typeof s.startDate !== 'string') throw new Error(`subscriptions[${i}] 缺少 startDate`)
    if (!Array.isArray(s.billingHistory)) throw new Error(`subscriptions[${i}] 缺少 billingHistory`)
  }
  return data as unknown as ExportData
}

// Theme

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = mode === 'auto' ? getSystemTheme() : mode
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}
