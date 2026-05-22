import type { BillingCycle, BillingHistoryItem, BillingHistoryMonthGroup, BillingRecord, Category, CategoryBreakdownItem, ExportData, ItemBreakdownItem, PriceSegment, Subscription, SpendingSummary, ThemeMode } from './types'
import { BRAND_COLORS, COLOR_PALETTE, CYCLE_MONTHS, DEFAULT_CATEGORIES } from './constants'

type BillingFields = Pick<Subscription, 'amount' | 'currency' | 'cycle' | 'customCycleDays' | 'startDate'>

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

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
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

export function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-')
  return `${year}年${monthPart}月`
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

function sortPriceHistory(priceHistory: PriceSegment[]): PriceSegment[] {
  return [...priceHistory].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
}

export function ensurePriceHistory(sub: Subscription): Subscription {
  const legacySub = sub as Subscription & { priceHistory?: PriceSegment[] }
  const priceHistory = legacySub.priceHistory
  if (Array.isArray(priceHistory) && priceHistory.length > 0) {
    const sorted = sortPriceHistory(priceHistory)
    if (sorted.every((segment, index) => segment === priceHistory[index])) return sub
    return { ...sub, priceHistory: sorted }
  }

  return {
    ...sub,
    priceHistory: [{
      id: generateId(),
      effectiveDate: sub.startDate,
      amount: sub.amount,
      currency: sub.currency,
      cycle: sub.cycle,
      customCycleDays: sub.customCycleDays,
    }],
  }
}

export function getActivePriceSegment(sub: Subscription, date: string): PriceSegment {
  const normalized = ensurePriceHistory(sub)
  const segments = sortPriceHistory(normalized.priceHistory)
  let active = segments[0]
  for (const segment of segments) {
    if (segment.effectiveDate <= date) active = segment
    else break
  }
  return active
}

function advanceBillingDate(date: string, cycle: BillingCycle, customDays?: number): string {
  const cursor = parseLocalDate(date)
  if (cycle === 'custom' && customDays && customDays > 0) {
    cursor.setTime(cursor.getTime() + customDays * 86400000)
  } else {
    const months = CYCLE_MONTHS[cycle] ?? 1
    cursor.setMonth(cursor.getMonth() + months)
  }
  return toLocalDateString(cursor)
}

export function calculateSubscriptionNextBillDate(sub: Subscription): string {
  const normalized = ensurePriceHistory(sub)
  const current = sortPriceHistory(normalized.priceHistory)[normalized.priceHistory.length - 1]
  return calculateNextBillDate(current.effectiveDate, current.cycle, current.customCycleDays)
}

export function generateBillingHistoryFromPriceHistory(sub: Subscription, endDate: string): BillingRecord[] {
  const normalized = ensurePriceHistory(sub)
  const end = parseLocalDate(endDate)
  let cursor = normalized.startDate
  const records: BillingRecord[] = []

  while (parseLocalDate(cursor) <= end) {
    const segment = getActivePriceSegment(normalized, cursor)
    records.push({
      date: cursor,
      amount: segment.amount,
      currency: segment.currency,
      priceSegmentId: segment.id,
    })
    cursor = advanceBillingDate(cursor, segment.cycle, segment.customCycleDays)
  }

  return records
}

export function generateBillingHistory(startDate: string, cycle: BillingCycle, customDays: number | undefined, amount: number, endDate: string, currency?: 'CNY' | 'USD', priceSegmentId?: string): BillingRecord[] {
  return generateBillingDates(startDate, cycle, customDays, endDate).map((date) => ({
    date,
    amount,
    currency,
    priceSegmentId,
  }))
}

export function advanceBillingHistory(sub: Subscription): { billingHistory: BillingRecord[]; nextBillDate: string } {
  if (sub.status === 'cancelled') {
    return { billingHistory: sub.billingHistory, nextBillDate: sub.nextBillDate }
  }
  const today = todayString()
  const existingDates = new Set(sub.billingHistory.map((record) => record.date))
  const missingRecords = generateBillingHistoryFromPriceHistory(sub, today)
    .filter((record) => !existingDates.has(record.date))
  const normalizedExisting = sub.billingHistory.map((record) => ({
    ...record,
    currency: record.currency ?? sub.currency,
  }))
  const billingHistory = [...normalizedExisting, ...missingRecords]
    .sort((a, b) => a.date.localeCompare(b.date))
  const nextBillDate = calculateSubscriptionNextBillDate(sub)
  return { billingHistory, nextBillDate }
}

export function syncActiveSubscriptionBilling(sub: Subscription): Subscription {
  const normalized = ensurePriceHistory(sub)
  if (normalized.status !== 'active') return normalized

  const result = advanceBillingHistory(normalized)
  const billingHistoryUnchanged = result.billingHistory.length === normalized.billingHistory.length
    && result.billingHistory.every((record, index) => {
      const current = normalized.billingHistory[index]
      return current
        && record.date === current.date
        && record.amount === current.amount
        && record.currency === current.currency
        && record.priceSegmentId === current.priceSegmentId
    })
  if (
    billingHistoryUnchanged
    && result.nextBillDate === normalized.nextBillDate
    && normalized === sub
  ) {
    return normalized
  }

  return {
    ...normalized,
    billingHistory: result.billingHistory,
    nextBillDate: result.nextBillDate,
  }
}

export function applyPriceChangeFromDate(sub: Subscription, data: BillingFields, effectiveDate: string): Subscription {
  const normalized = ensurePriceHistory(sub)
  const segment: PriceSegment = {
    id: generateId(),
    effectiveDate,
    amount: data.amount,
    currency: data.currency,
    cycle: data.cycle,
    customCycleDays: data.customCycleDays,
  }
  const updated: Subscription = {
    ...normalized,
    amount: data.amount,
    currency: data.currency,
    cycle: data.cycle,
    customCycleDays: data.customCycleDays,
    priceHistory: sortPriceHistory([...normalized.priceHistory, segment]),
  }
  return {
    ...updated,
    nextBillDate: calculateSubscriptionNextBillDate(updated),
  }
}

export function rewriteSubscriptionBilling(sub: Subscription, data: BillingFields): Subscription {
  const segment: PriceSegment = {
    id: generateId(),
    effectiveDate: data.startDate,
    amount: data.amount,
    currency: data.currency,
    cycle: data.cycle,
    customCycleDays: data.customCycleDays,
  }
  const updated: Subscription = {
    ...sub,
    amount: data.amount,
    currency: data.currency,
    cycle: data.cycle,
    customCycleDays: data.customCycleDays,
    startDate: data.startDate,
    priceHistory: [segment],
  }
  const today = todayString()
  return {
    ...updated,
    billingHistory: generateBillingHistory(data.startDate, data.cycle, data.customCycleDays, data.amount, today, data.currency, segment.id),
    nextBillDate: calculateSubscriptionNextBillDate(updated),
  }
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
        result[record.currency ?? sub.currency] += record.amount
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
    for (const record of sub.billingHistory) {
      if (record.date.startsWith(yearPrefix)) {
        const map = (record.currency ?? sub.currency) === 'CNY' ? cnyMap : usdMap
        map.set(sub.category, (map.get(sub.category) ?? 0) + record.amount)
      }
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
  const sort = (arr: ItemBreakdownItem[]) => arr.sort((a, b) => b.value - a.value || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  return { CNY: sort(cny), USD: sort(usd) }
}

export function calcYearlyItemBreakdown(subscriptions: Subscription[]): { CNY: ItemBreakdownItem[]; USD: ItemBreakdownItem[] } {
  const currentYear = new Date().getFullYear()
  const yearPrefix = String(currentYear)
  const cnyMap = new Map<string, ItemBreakdownItem>()
  const usdMap = new Map<string, ItemBreakdownItem>()
  for (const sub of subscriptions) {
    for (const record of sub.billingHistory) {
      if (!record.date.startsWith(yearPrefix)) continue
      const map = (record.currency ?? sub.currency) === 'CNY' ? cnyMap : usdMap
      const existing = map.get(sub.id)
      if (existing) {
        existing.value += record.amount
      } else {
        map.set(sub.id, { name: sub.name, value: record.amount, color: sub.color, category: sub.category })
      }
    }
  }
  const sort = (arr: ItemBreakdownItem[]) => arr.sort((a, b) => b.value - a.value || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  return { CNY: sort(Array.from(cnyMap.values())), USD: sort(Array.from(usdMap.values())) }
}

export function buildBillingHistoryGroups(subscriptions: Subscription[]): BillingHistoryMonthGroup[] {
  const items: BillingHistoryItem[] = subscriptions.flatMap((sub) =>
    sub.billingHistory.map((record, index) => ({
      id: `${sub.id}-${record.date}-${index}`,
      date: record.date,
      name: sub.name,
      amount: record.amount,
      currency: record.currency ?? sub.currency,
      category: sub.category,
      color: sub.color,
      status: sub.status,
    })),
  ).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))

  const groups = new Map<string, BillingHistoryMonthGroup>()
  for (const item of items) {
    const month = item.date.slice(0, 7)
    const group = groups.get(month) ?? { month, totalCNY: 0, totalUSD: 0, items: [] }
    if (item.currency === 'CNY') {
      group.totalCNY += item.amount
    } else {
      group.totalUSD += item.amount
    }
    group.items.push(item)
    groups.set(month, group)
  }

  return Array.from(groups.values())
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
