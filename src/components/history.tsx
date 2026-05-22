import { useMemo } from 'react'
import type { BillingHistoryItem, Subscription } from '../types'
import { buildBillingHistoryGroups, formatMonthLabel } from '../utils'

function AmountText({ item }: { item: BillingHistoryItem }) {
  const symbol = item.currency === 'CNY' ? '¥' : '$'
  return (
    <span className="text-sm font-semibold text-[var(--color-text-primary)] shrink-0">
      {symbol} {item.amount.toFixed(2)}
    </span>
  )
}

function MonthTotal({ totalCNY, totalUSD }: { totalCNY: number; totalUSD: number }) {
  return (
    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]">
      {totalCNY > 0 && <span>¥ {totalCNY.toFixed(2)}</span>}
      {totalUSD > 0 && <span>$ {totalUSD.toFixed(2)}</span>}
    </div>
  )
}

export function BillingHistoryView({ subscriptions }: { subscriptions: Subscription[] }) {
  const groups = useMemo(() => buildBillingHistoryGroups(subscriptions), [subscriptions])

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">暂无扣款记录</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.month} className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4 px-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {formatMonthLabel(group.month)}
            </p>
            <MonthTotal totalCNY={group.totalCNY} totalUSD={group.totalUSD} />
          </div>

          <div className="rounded-2xl bg-[var(--color-card)] overflow-hidden">
            {group.items.map((item, index) => {
              const day = item.date.slice(8, 10)
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-4 ${index > 0 ? 'border-t border-[var(--color-divider)]' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-bg)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-bold leading-none text-[var(--color-text-primary)]">{day}</span>
                    <span className="text-[10px] leading-none text-[var(--color-text-secondary)] mt-1">日</span>
                  </div>
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                      {item.category}{item.status === 'cancelled' ? ' · 已取消' : ''}
                    </p>
                  </div>
                  <AmountText item={item} />
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
