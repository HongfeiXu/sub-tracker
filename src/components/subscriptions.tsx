import { useState, useMemo } from 'react'
import type { Subscription, SubStatusFilter } from '../types'
import { CYCLE_LABELS } from '../constants'
import { formatDate } from '../utils'
import { ChevronRightIcon } from './icons'

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

export function SubscriptionsView({
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {filter === 'active' ? (
            <>
              <p className="text-4xl mb-4">📭</p>
              <p className="text-sm text-[var(--color-text-primary)] mb-1">暂无生效中的订阅</p>
              <p className="text-xs text-[var(--color-text-secondary)]">点击右下角的 + 开始记录</p>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">暂无已取消的订阅</p>
          )}
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
