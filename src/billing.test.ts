import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateBillingDates,
  generateBillingHistory,
  advanceBillingHistory,
  calcYearlyActualSpending,
  calcYearlyCategoryBreakdown,
} from './utils'
import { DEFAULT_CATEGORIES } from './constants'
import type { Subscription, BillingRecord } from './types'

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'test-1',
    name: 'Test Sub',
    amount: 48,
    currency: 'CNY',
    cycle: 'monthly',
    startDate: '2025-12-01',
    nextBillDate: '2026-03-01',
    category: '工具软件',
    color: '#5B9EF4',
    status: 'active',
    billingHistory: [],
    createdAt: '2025-12-01T00:00:00.000Z',
    updatedAt: '2025-12-01T00:00:00.000Z',
    ...overrides,
  }
}

// Mock today as 2026-02-27 for deterministic tests
function mockToday(dateStr: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(dateStr + 'T00:00:00'))
}

afterEach(() => {
  vi.useRealTimers()
})

// =============================================
// generateBillingDates
// =============================================

describe('generateBillingDates', () => {
  it('monthly: 2025-12-01 to 2026-02-27 → 3 dates', () => {
    const dates = generateBillingDates('2025-12-01', 'monthly', undefined, '2026-02-27')
    expect(dates).toEqual(['2025-12-01', '2026-01-01', '2026-02-01'])
  })

  it('yearly: 2025-01-15 to 2026-02-27 → 2 dates', () => {
    const dates = generateBillingDates('2025-01-15', 'yearly', undefined, '2026-02-27')
    expect(dates).toEqual(['2025-01-15', '2026-01-15'])
  })

  it('quarterly: 2025-06-01 to 2026-02-27 → 4 dates', () => {
    const dates = generateBillingDates('2025-06-01', 'quarterly', undefined, '2026-02-27')
    expect(dates).toEqual(['2025-06-01', '2025-09-01', '2025-12-01'])
  })

  it('custom 30 days: 2026-01-01 to 2026-02-27 → 2 dates', () => {
    const dates = generateBillingDates('2026-01-01', 'custom', 30, '2026-02-27')
    expect(dates).toEqual(['2026-01-01', '2026-01-31'])
  })

  it('startDate in the future → empty array', () => {
    const dates = generateBillingDates('2027-01-01', 'monthly', undefined, '2026-02-27')
    expect(dates).toEqual([])
  })

  it('startDate equals endDate → single date', () => {
    const dates = generateBillingDates('2026-02-27', 'monthly', undefined, '2026-02-27')
    expect(dates).toEqual(['2026-02-27'])
  })
})

// =============================================
// generateBillingHistory
// =============================================

describe('generateBillingHistory', () => {
  it('wraps generateBillingDates with amount', () => {
    const history = generateBillingHistory('2025-12-01', 'monthly', undefined, 48, '2026-02-27')
    expect(history).toEqual([
      { date: '2025-12-01', amount: 48 },
      { date: '2026-01-01', amount: 48 },
      { date: '2026-02-01', amount: 48 },
    ])
  })
})

// =============================================
// advanceBillingHistory
// =============================================

describe('advanceBillingHistory', () => {
  it('fills missing records for active subscription', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      startDate: '2025-12-01',
      billingHistory: [
        { date: '2025-12-01', amount: 48 },
      ],
    })
    const result = advanceBillingHistory(sub)
    expect(result.billingHistory).toEqual([
      { date: '2025-12-01', amount: 48 },
      { date: '2026-01-01', amount: 48 },
      { date: '2026-02-01', amount: 48 },
    ])
  })

  it('does not advance cancelled subscription', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      status: 'cancelled',
      billingHistory: [
        { date: '2025-12-01', amount: 48 },
      ],
    })
    const result = advanceBillingHistory(sub)
    expect(result.billingHistory).toEqual([
      { date: '2025-12-01', amount: 48 },
    ])
  })

  it('no-op when already up to date', () => {
    mockToday('2026-02-15')
    const sub = makeSub({
      startDate: '2026-02-01',
      billingHistory: [
        { date: '2026-02-01', amount: 48 },
      ],
    })
    const result = advanceBillingHistory(sub)
    expect(result.billingHistory).toEqual([
      { date: '2026-02-01', amount: 48 },
    ])
  })
})

// =============================================
// calcYearlyActualSpending
// =============================================

describe('calcYearlyActualSpending', () => {
  it('monthly ¥48 from Dec last year → 2 records in 2026 = ¥96', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      billingHistory: [
        { date: '2025-12-01', amount: 48 },
        { date: '2026-01-01', amount: 48 },
        { date: '2026-02-01', amount: 48 },
      ],
    })
    const result = calcYearlyActualSpending([sub])
    expect(result.CNY).toBe(96)
    expect(result.USD).toBe(0)
  })

  it('yearly $119.88 from Jan last year → 1 record in 2026 = $119.88', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      currency: 'USD',
      amount: 119.88,
      cycle: 'yearly',
      startDate: '2025-01-15',
      billingHistory: [
        { date: '2025-01-15', amount: 119.88 },
        { date: '2026-01-15', amount: 119.88 },
      ],
    })
    const result = calcYearlyActualSpending([sub])
    expect(result.USD).toBeCloseTo(119.88)
    expect(result.CNY).toBe(0)
  })

  it('cancelled subscription history still counts', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      status: 'cancelled',
      billingHistory: [
        { date: '2025-12-01', amount: 48 },
        { date: '2026-01-01', amount: 48 },
      ],
    })
    const result = calcYearlyActualSpending([sub])
    expect(result.CNY).toBe(48)
  })

  it('duplicate records on same date should not exist (reactivation guard)', () => {
    mockToday('2026-02-27')
    // Simulate: already has a record for today, reactivating should not add another
    const sub = makeSub({
      billingHistory: [
        { date: '2026-01-01', amount: 48 },
        { date: '2026-02-01', amount: 48 },
        { date: '2026-02-27', amount: 48 },
      ],
    })
    const todayRecords = sub.billingHistory.filter((r) => r.date === '2026-02-27')
    expect(todayRecords).toHaveLength(1)
    const result = calcYearlyActualSpending([sub])
    // Should be 3 records in 2026: Jan + Feb + Feb27 = 144
    expect(result.CNY).toBe(144)
  })

  it('multiple subscriptions across currencies', () => {
    mockToday('2026-02-27')
    const sub1 = makeSub({
      billingHistory: [
        { date: '2026-01-01', amount: 48 },
        { date: '2026-02-01', amount: 48 },
      ],
    })
    const sub2 = makeSub({
      id: 'test-2',
      currency: 'USD',
      billingHistory: [
        { date: '2026-01-15', amount: 10 },
      ],
    })
    const result = calcYearlyActualSpending([sub1, sub2])
    expect(result.CNY).toBe(96)
    expect(result.USD).toBe(10)
  })
})

// =============================================
// calcYearlyCategoryBreakdown
// =============================================

describe('calcYearlyCategoryBreakdown', () => {
  it('groups by category for current year', () => {
    mockToday('2026-02-27')
    const sub1 = makeSub({
      category: '工具软件',
      billingHistory: [
        { date: '2026-01-01', amount: 48 },
        { date: '2026-02-01', amount: 48 },
      ],
    })
    const sub2 = makeSub({
      id: 'test-2',
      category: '影音娱乐',
      billingHistory: [
        { date: '2025-12-01', amount: 15 },
        { date: '2026-01-01', amount: 15 },
      ],
    })
    const result = calcYearlyCategoryBreakdown([sub1, sub2], DEFAULT_CATEGORIES)
    expect(result.CNY).toHaveLength(2)
    const tools = result.CNY.find((c) => c.name === '工具软件')
    const media = result.CNY.find((c) => c.name === '影音娱乐')
    expect(tools?.value).toBe(96)
    expect(media?.value).toBe(15)
  })

  it('excludes records from previous year', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      billingHistory: [
        { date: '2025-12-01', amount: 48 },
      ],
    })
    const result = calcYearlyCategoryBreakdown([sub], DEFAULT_CATEGORIES)
    expect(result.CNY).toHaveLength(0)
  })
})
