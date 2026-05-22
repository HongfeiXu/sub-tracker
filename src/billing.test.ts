import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateBillingDates,
  generateBillingHistory,
  generateBillingHistoryFromPriceHistory,
  advanceBillingHistory,
  calcMonthlyItemBreakdown,
  calcYearlyActualSpending,
  calcYearlyCategoryBreakdown,
  calcYearlyItemBreakdown,
  buildExportData,
  buildBillingHistoryGroups,
  ensurePriceHistory,
  getActivePriceSegment,
  applyPriceChangeFromDate,
  parseImportData,
  reactivateSubscription,
  rewriteSubscriptionBilling,
  syncActiveSubscriptionBilling,
} from './utils'
import { DEFAULT_CATEGORIES } from './constants'
import type { Subscription, BillingRecord } from './types'

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  const base: Subscription = {
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
    priceHistory: [],
    createdAt: '2025-12-01T00:00:00.000Z',
    updatedAt: '2025-12-01T00:00:00.000Z',
  }
  const merged = { ...base, ...overrides }
  if (!overrides.priceHistory) {
    merged.priceHistory = [{
      id: `${merged.id}-price-1`,
      effectiveDate: merged.startDate,
      amount: merged.amount,
      currency: merged.currency,
      cycle: merged.cycle,
      customCycleDays: merged.customCycleDays,
    }]
  }
  return merged
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
  it('creates the first record when active history is empty and startDate has passed', () => {
    mockToday('2026-05-22')
    const sub = makeSub({
      cycle: 'yearly',
      startDate: '2026-03-17',
      nextBillDate: '2026-03-17',
      billingHistory: [],
    })

    const result = advanceBillingHistory(sub)

    expect(result.billingHistory).toEqual([
      { date: '2026-03-17', amount: 48, currency: 'CNY', priceSegmentId: 'test-1-price-1' },
    ])
    expect(result.nextBillDate).toBe('2027-03-17')
  })

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
      { date: '2025-12-01', amount: 48, currency: 'CNY' },
      { date: '2026-01-01', amount: 48, currency: 'CNY', priceSegmentId: 'test-1-price-1' },
      { date: '2026-02-01', amount: 48, currency: 'CNY', priceSegmentId: 'test-1-price-1' },
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
      { date: '2026-02-01', amount: 48, currency: 'CNY' },
    ])
  })
})

// =============================================
// syncActiveSubscriptionBilling
// =============================================

describe('syncActiveSubscriptionBilling', () => {
  it('updates stale nextBillDate and fills missing history', () => {
    mockToday('2026-05-22')
    const sub = makeSub({
      cycle: 'yearly',
      startDate: '2026-03-17',
      nextBillDate: '2026-03-17',
      billingHistory: [],
    })

    const result = syncActiveSubscriptionBilling(sub)

    expect(result.nextBillDate).toBe('2027-03-17')
    expect(result.billingHistory).toEqual([
      { date: '2026-03-17', amount: 48, currency: 'CNY', priceSegmentId: 'test-1-price-1' },
    ])
  })

  it('keeps cancelled subscription unchanged', () => {
    mockToday('2026-05-22')
    const sub = makeSub({
      status: 'cancelled',
      nextBillDate: '2026-03-17',
      billingHistory: [
        { date: '2026-03-17', amount: 48 },
      ],
    })

    const result = syncActiveSubscriptionBilling(sub)

    expect(result).toBe(sub)
  })
})

// =============================================
// reactivateSubscription
// =============================================

describe('reactivateSubscription', () => {
  it('fills scheduled records through cancellation date but does not append reactivation date', () => {
    mockToday('2026-04-21')
    const sub = makeSub({
      name: 'Chatgpt',
      amount: 20,
      currency: 'USD',
      status: 'cancelled',
      startDate: '2026-03-04',
      nextBillDate: '',
      cancelledDate: '2026-04-21',
      billingHistory: [
        { date: '2026-03-04', amount: 20, currency: 'USD' },
      ],
    })

    const result = reactivateSubscription(sub)

    expect(result.status).toBe('active')
    expect(result.cancelledDate).toBeUndefined()
    expect(result.nextBillDate).toBe('2026-05-04')
    expect(result.billingHistory).toEqual([
      { date: '2026-03-04', amount: 20, currency: 'USD' },
      { date: '2026-04-04', amount: 20, currency: 'USD', priceSegmentId: 'test-1-price-1' },
    ])
  })
})

// =============================================
// priceHistory
// =============================================

describe('priceHistory', () => {
  it('migrates legacy subscription to a single price segment', () => {
    const { priceHistory: _priceHistory, ...legacy } = makeSub()
    const result = ensurePriceHistory(legacy as Subscription)

    expect(result.priceHistory).toHaveLength(1)
    expect(result.priceHistory[0]).toMatchObject({
      effectiveDate: '2025-12-01',
      amount: 48,
      currency: 'CNY',
      cycle: 'monthly',
    })
  })

  it('finds the active price segment for a date', () => {
    const sub = makeSub({
      priceHistory: [
        { id: 'old', effectiveDate: '2026-01-20', amount: 125, currency: 'USD', cycle: 'monthly' },
        { id: 'new', effectiveDate: '2026-05-20', amount: 20, currency: 'USD', cycle: 'monthly' },
      ],
    })

    expect(getActivePriceSegment(sub, '2026-04-20').id).toBe('old')
    expect(getActivePriceSegment(sub, '2026-05-20').id).toBe('new')
  })

  it('generates billing history with the price active at each billing date', () => {
    const sub = makeSub({
      name: 'Claude',
      amount: 20,
      currency: 'USD',
      startDate: '2026-01-20',
      priceHistory: [
        { id: 'claude-125', effectiveDate: '2026-01-20', amount: 125, currency: 'USD', cycle: 'monthly' },
        { id: 'claude-20', effectiveDate: '2026-05-20', amount: 20, currency: 'USD', cycle: 'monthly' },
      ],
    })

    const result = generateBillingHistoryFromPriceHistory(sub, '2026-05-22')

    expect(result).toEqual([
      { date: '2026-01-20', amount: 125, currency: 'USD', priceSegmentId: 'claude-125' },
      { date: '2026-02-20', amount: 125, currency: 'USD', priceSegmentId: 'claude-125' },
      { date: '2026-03-20', amount: 125, currency: 'USD', priceSegmentId: 'claude-125' },
      { date: '2026-04-20', amount: 125, currency: 'USD', priceSegmentId: 'claude-125' },
      { date: '2026-05-20', amount: 20, currency: 'USD', priceSegmentId: 'claude-20' },
    ])
  })

  it('keeps existing history when price changes from the next bill date', () => {
    mockToday('2026-05-22')
    const sub = makeSub({
      amount: 125,
      currency: 'USD',
      startDate: '2026-01-20',
      nextBillDate: '2026-05-20',
      billingHistory: [
        { date: '2026-01-20', amount: 125, currency: 'USD', priceSegmentId: 'old' },
      ],
      priceHistory: [
        { id: 'old', effectiveDate: '2026-01-20', amount: 125, currency: 'USD', cycle: 'monthly' },
      ],
    })

    const result = applyPriceChangeFromDate(sub, {
      amount: 20,
      currency: 'USD',
      cycle: 'monthly',
      customCycleDays: undefined,
      startDate: '2026-01-20',
    }, '2026-05-20')

    expect(result.amount).toBe(20)
    expect(result.billingHistory).toEqual(sub.billingHistory)
    expect(result.priceHistory).toHaveLength(2)
    expect(result.priceHistory[1]).toMatchObject({ effectiveDate: '2026-05-20', amount: 20 })
    expect(result.nextBillDate).toBe('2026-06-20')
  })

  it('rewrites all history when correcting billing data', () => {
    mockToday('2026-02-27')
    const sub = makeSub({
      startDate: '2025-12-01',
      billingHistory: [
        { date: '2025-12-01', amount: 48 },
      ],
    })

    const result = rewriteSubscriptionBilling(sub, {
      amount: 68,
      currency: 'CNY',
      cycle: 'monthly',
      customCycleDays: undefined,
      startDate: '2026-01-01',
    })

    expect(result.billingHistory.map((record) => ({ date: record.date, amount: record.amount, currency: record.currency }))).toEqual([
      { date: '2026-01-01', amount: 68, currency: 'CNY' },
      { date: '2026-02-01', amount: 68, currency: 'CNY' },
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

  it('does not deduplicate unrelated existing records', () => {
    mockToday('2026-02-27')
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
// buildBillingHistoryGroups
// =============================================

describe('buildBillingHistoryGroups', () => {
  it('groups billing records by month in descending date order', () => {
    const sub1 = makeSub({
      id: 'sub-1',
      name: 'iCloud',
      amount: 68,
      currency: 'CNY',
      category: '云存储',
      billingHistory: [
        { date: '2026-04-23', amount: 68 },
        { date: '2026-05-23', amount: 68 },
      ],
    })
    const sub2 = makeSub({
      id: 'sub-2',
      name: 'Claude',
      amount: 20,
      currency: 'USD',
      billingHistory: [
        { date: '2026-05-20', amount: 20 },
      ],
    })

    const result = buildBillingHistoryGroups([sub1, sub2])

    expect(result).toHaveLength(2)
    expect(result[0].month).toBe('2026-05')
    expect(result[0].totalCNY).toBe(68)
    expect(result[0].totalUSD).toBe(20)
    expect(result[0].items.map((item) => item.name)).toEqual(['iCloud', 'Claude'])
    expect(result[1].month).toBe('2026-04')
    expect(result[1].items.map((item) => item.name)).toEqual(['iCloud'])
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

// =============================================
// calcMonthlyItemBreakdown / calcYearlyItemBreakdown
// =============================================

describe('item breakdown sorting', () => {
  it('sorts monthly CNY items by amount descending', () => {
    const result = calcMonthlyItemBreakdown([
      makeSub({
        id: 'monthly-1',
        name: 'A 影音娱乐',
        amount: 20,
        category: '影音娱乐',
      }),
      makeSub({
        id: 'monthly-2',
        name: 'B 工具软件',
        amount: 80,
        category: '工具软件',
      }),
      makeSub({
        id: 'monthly-3',
        name: 'C 效率',
        amount: 50,
        category: '效率',
      }),
    ])

    expect(result.CNY.map((item) => item.name)).toEqual([
      'B 工具软件',
      'C 效率',
      'A 影音娱乐',
    ])
  })

  it('sorts yearly CNY items by amount descending', () => {
    mockToday('2026-02-27')
    const result = calcYearlyItemBreakdown([
      makeSub({
        id: 'yearly-1',
        name: 'A 影音娱乐',
        category: '影音娱乐',
        billingHistory: [
          { date: '2026-01-01', amount: 20 },
        ],
      }),
      makeSub({
        id: 'yearly-2',
        name: 'B 工具软件',
        category: '工具软件',
        billingHistory: [
          { date: '2026-01-01', amount: 80 },
        ],
      }),
      makeSub({
        id: 'yearly-3',
        name: 'C 效率',
        category: '效率',
        billingHistory: [
          { date: '2026-01-01', amount: 50 },
        ],
      }),
    ])

    expect(result.CNY.map((item) => item.name)).toEqual([
      'B 工具软件',
      'C 效率',
      'A 影音娱乐',
    ])
  })
})

// =============================================
// buildExportData / parseImportData
// =============================================

describe('buildExportData', () => {
  it('builds correct structure', () => {
    mockToday('2026-02-27')
    const sub = makeSub()
    const cats = [{ name: '自定义', color: '#123456' }]
    const result = buildExportData([sub], cats)
    expect(result.version).toBe('1.0')
    expect(result.exportedAt).toBeTruthy()
    expect(result.subscriptions).toHaveLength(1)
    expect(result.subscriptions[0].name).toBe('Test Sub')
    expect(result.categories).toEqual(cats)
  })
})

describe('parseImportData', () => {
  it('parses valid JSON', () => {
    const json = JSON.stringify({
      version: '1.0',
      exportedAt: '2026-02-27T00:00:00Z',
      subscriptions: [makeSub()],
      categories: [],
    })
    const result = parseImportData(json)
    expect(result.version).toBe('1.0')
    expect(result.subscriptions).toHaveLength(1)
  })

  it('throws on missing version', () => {
    const json = JSON.stringify({ subscriptions: [] })
    expect(() => parseImportData(json)).toThrow('缺少 version 字段')
  })

  it('throws on missing subscriptions', () => {
    const json = JSON.stringify({ version: '1.0' })
    expect(() => parseImportData(json)).toThrow('缺少 subscriptions 数组')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseImportData('not json')).toThrow()
  })
})
