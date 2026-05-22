export type Currency = 'CNY' | 'USD'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type SubscriptionStatus = 'active' | 'cancelled'
export type ThemeMode = 'auto' | 'light' | 'dark'
export type TabView = 'dashboard' | 'subscriptions' | 'history'
export type SubStatusFilter = 'active' | 'cancelled'
export type PriceChangeMode = 'future' | 'rewrite'

export interface BillingRecord {
  date: string   // "YYYY-MM-DD"
  amount: number
  currency?: Currency
  priceSegmentId?: string
}

export interface PriceSegment {
  id: string
  effectiveDate: string
  amount: number
  currency: Currency
  cycle: BillingCycle
  customCycleDays?: number
}

export interface BillingHistoryItem {
  id: string
  date: string
  name: string
  amount: number
  currency: Currency
  category: string
  color: string
  status: SubscriptionStatus
}

export interface BillingHistoryMonthGroup {
  month: string
  totalCNY: number
  totalUSD: number
  items: BillingHistoryItem[]
}

export interface Subscription {
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
  billingHistory: BillingRecord[]
  priceHistory: PriceSegment[]
  createdAt: string
  updatedAt: string
}

export interface Category {
  name: string
  color: string
}

export interface SpendingSummary {
  CNY: { monthly: number; yearly: number }
  USD: { monthly: number; yearly: number }
}

export interface CategoryBreakdownItem {
  name: string
  value: number
  color: string
}

export interface ItemBreakdownItem {
  name: string
  value: number
  color: string
  category: string
}

export interface ExportData {
  version: string
  exportedAt: string
  subscriptions: Subscription[]
  categories: Category[]
}
