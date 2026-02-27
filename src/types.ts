export type Currency = 'CNY' | 'USD'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type SubscriptionStatus = 'active' | 'cancelled'
export type ThemeMode = 'auto' | 'light' | 'dark'
export type TabView = 'dashboard' | 'subscriptions'
export type SubStatusFilter = 'active' | 'cancelled'

export interface BillingRecord {
  date: string   // "YYYY-MM-DD"
  amount: number
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
