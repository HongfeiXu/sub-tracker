import { useState, useRef } from 'react'
import type { ThemeMode, Subscription, Category, ExportData } from '../types'
import { buildExportData, downloadJson, parseImportData } from '../utils'
import { CloseIcon, DownloadIcon, UploadIcon } from './icons'
import { ConfirmDialog } from './common'

export function SettingsPanel({
  theme,
  onThemeChange,
  subscriptions,
  customCategories,
  onImport,
  onClose,
}: {
  theme: ThemeMode
  onThemeChange: (t: ThemeMode) => void
  subscriptions: Subscription[]
  customCategories: Category[]
  onImport: (data: ExportData) => void
  onClose: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null)

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'auto', label: '自动' },
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
  ]

  const handleExport = () => {
    const data = buildExportData(subscriptions, customCategories)
    downloadJson(data)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = parseImportData(reader.result as string)
        setPendingImport(data)
        setShowImportConfirm(true)
      } catch (err) {
        alert(`导入失败：${err instanceof Error ? err.message : '文件格式不正确'}`)
      }
    }
    reader.readAsText(file)
    // reset so the same file can be selected again
    e.target.value = ''
  }

  const confirmImport = () => {
    if (pendingImport) {
      onImport(pendingImport)
      setPendingImport(null)
      setShowImportConfirm(false)
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-14 right-4 w-72 rounded-2xl bg-[var(--color-card)] border border-[var(--color-divider)] shadow-xl z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">设置</p>
          <button onClick={onClose} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <CloseIcon />
          </button>
        </div>

        {/* Theme */}
        <div className="px-4 py-3">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">主题</p>
          <div className="flex p-1 rounded-xl bg-[var(--color-bg)]">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onThemeChange(opt.value)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  theme === opt.value
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--color-divider)]">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">数据管理</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium rounded-xl bg-[var(--color-bg)] text-[var(--color-text-primary)] hover:opacity-80 transition-opacity"
            >
              <UploadIcon />
              导出数据
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium rounded-xl bg-[var(--color-bg)] text-[var(--color-text-primary)] hover:opacity-80 transition-opacity"
            >
              <DownloadIcon />
              导入数据
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>

        {/* About */}
        <div className="px-4 py-3 border-t border-[var(--color-divider)]">
          <p className="text-xs text-[var(--color-text-secondary)]">SubTracker v1.0</p>
        </div>
      </div>

      {showImportConfirm && (
        <ConfirmDialog
          message="将替换当前所有数据，是否继续？"
          confirmLabel="确认导入"
          onConfirm={confirmImport}
          onCancel={() => { setShowImportConfirm(false); setPendingImport(null) }}
        />
      )}
    </>
  )
}
