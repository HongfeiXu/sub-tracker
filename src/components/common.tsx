export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: { message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-[var(--color-card)] rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-[var(--color-text-primary)] mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm rounded-xl border border-[var(--color-divider)] text-[var(--color-text-secondary)]">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm rounded-xl bg-red-500 text-white">
            {confirmLabel ?? '确认删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
