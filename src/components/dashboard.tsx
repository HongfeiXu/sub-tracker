import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { Category, CategoryBreakdownItem, ItemBreakdownItem, Subscription } from '../types'
import { formatDate, parseLocalDate, calcSpendingSummary, calcCategoryBreakdown, calcMonthlyItemBreakdown, calcYearlyActualSpending, calcYearlyCategoryBreakdown, calcYearlyItemBreakdown } from '../utils'

function MiniPie({ data, amount, symbol }: { data: CategoryBreakdownItem[]; amount: number; symbol: string }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width={96} height={96}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2} strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-[var(--color-text-primary)]" fontSize={11} fontWeight={700}>
          {symbol}{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}

function ExpandedPieSection({ symbol, label, amount, items }: { symbol: string; label: string; amount: number; items: ItemBreakdownItem[] }) {
  return (
    <div>
      {label && (
        <p className="text-xs text-[var(--color-text-secondary)] text-center border-b border-[var(--color-divider)] pb-2 mb-3">
          {symbol} {label}
        </p>
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--color-text-primary)] truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="text-[var(--color-text-secondary)] shrink-0 ml-2">{symbol} {item.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={items} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} strokeWidth={0}>
                {items.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-[var(--color-text-primary)]" fontSize={12} fontWeight={700}>
                {symbol}{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function StatsCard({
  title,
  amountCNY,
  amountUSD,
  chartData,
  itemData,
}: {
  title: string
  amountCNY: number
  amountUSD: number
  chartData: { CNY: CategoryBreakdownItem[]; USD: CategoryBreakdownItem[] }
  itemData: { CNY: ItemBreakdownItem[]; USD: ItemBreakdownItem[] }
}) {
  const [expanded, setExpanded] = useState(false)
  const hasCNY = amountCNY > 0
  const hasUSD = amountUSD > 0
  const hasData = hasCNY || hasUSD
  const hasBoth = hasCNY && hasUSD

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 transition-all duration-300">
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">{title}</p>
      {!hasData ? (
        <div className="flex items-center justify-center py-6 text-sm text-[var(--color-text-secondary)]">
          暂无数据
        </div>
      ) : (
        <>
          {/* Collapsed view */}
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              {hasCNY && (
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  ¥ {amountCNY.toFixed(2)}
                </p>
              )}
              {hasUSD && (
                <p className={`text-2xl font-bold text-[var(--color-text-primary)] ${hasCNY ? 'mt-1' : ''}`}>
                  $ {amountUSD.toFixed(2)}
                </p>
              )}
              {!expanded && (() => {
                const seen = new Set<string>()
                const unique = [...chartData.CNY, ...chartData.USD].filter((item) => {
                  if (seen.has(item.name)) return false
                  seen.add(item.name)
                  return true
                })
                return (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {unique.map((item) => (
                      <span key={item.name} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                    ))}
                  </div>
                )
              })()}
            </div>
            {!expanded && (
              <div className="flex gap-2 shrink-0 cursor-pointer" onClick={() => setExpanded(true)} data-testid="pie-toggle">
                {hasCNY && chartData.CNY.length > 0 && (
                  <div className="shrink-0"><MiniPie data={chartData.CNY} amount={amountCNY} symbol="¥" /></div>
                )}
                {hasUSD && chartData.USD.length > 0 && (
                  <div className="shrink-0"><MiniPie data={chartData.USD} amount={amountUSD} symbol="$" /></div>
                )}
              </div>
            )}
          </div>

          {/* Expanded view */}
          {expanded && (
            <div className="mt-4 flex flex-col gap-4" data-testid="expanded-view">
              {hasCNY && itemData.CNY.length > 0 && (
                <ExpandedPieSection symbol="¥" label={hasBoth ? '人民币' : ''} amount={amountCNY} items={itemData.CNY} />
              )}
              {hasUSD && itemData.USD.length > 0 && (
                <ExpandedPieSection symbol="$" label={hasBoth ? '美元' : ''} amount={amountUSD} items={itemData.USD} />
              )}
              <button
                onClick={() => setExpanded(false)}
                className="w-full py-2 text-xs text-[var(--color-accent)] font-medium"
                data-testid="collapse-btn"
              >
                收起 ▲
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function UpcomingList({ subscriptions }: { subscriptions: Subscription[] }) {
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return subscriptions
      .filter((s) => s.status === 'active' && s.nextBillDate)
      .sort((a, b) => a.nextBillDate.localeCompare(b.nextBillDate))
      .map((sub) => {
        const next = parseLocalDate(sub.nextBillDate)
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

export function DashboardView({
  subscriptions,
  allCategories,
}: {
  subscriptions: Subscription[]
  allCategories: Category[]
}) {
  const summary = useMemo(() => calcSpendingSummary(subscriptions), [subscriptions])
  const monthlyBreakdown = useMemo(() => calcCategoryBreakdown(subscriptions, 'monthly', allCategories), [subscriptions, allCategories])
  const monthlyItems = useMemo(() => calcMonthlyItemBreakdown(subscriptions), [subscriptions])
  const yearlyActual = useMemo(() => calcYearlyActualSpending(subscriptions), [subscriptions])
  const yearlyBreakdown = useMemo(() => calcYearlyCategoryBreakdown(subscriptions, allCategories), [subscriptions, allCategories])
  const yearlyItems = useMemo(() => calcYearlyItemBreakdown(subscriptions), [subscriptions])

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-base font-medium text-[var(--color-text-primary)] mb-2">还没有任何订阅</p>
        <p className="text-sm text-[var(--color-text-secondary)]">点击右下角的 + 添加你的第一条订阅</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="月度支出"
          amountCNY={summary.CNY.monthly}
          amountUSD={summary.USD.monthly}
          chartData={monthlyBreakdown}
          itemData={monthlyItems}
        />
        <StatsCard
          title="年度支出"
          amountCNY={yearlyActual.CNY}
          amountUSD={yearlyActual.USD}
          chartData={yearlyBreakdown}
          itemData={yearlyItems}
        />
      </div>
      <UpcomingList subscriptions={subscriptions} />
    </div>
  )
}
