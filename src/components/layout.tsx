import type { TabView } from '../types'
import { SettingsIcon, PlusIcon } from './icons'

export function Header({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">SubTracker</h1>
      <button
        onClick={onSettingsClick}
        className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-colors"
      >
        <SettingsIcon />
      </button>
    </header>
  )
}

export function TabBar({ activeTab, onTabChange }: { activeTab: TabView; onTabChange: (tab: TabView) => void }) {
  const tabs: { key: TabView; label: string }[] = [
    { key: 'dashboard', label: '总览' },
    { key: 'subscriptions', label: '订阅列表' },
  ]
  return (
    <div className="flex mx-5 mb-4 p-1 rounded-xl bg-[var(--color-card)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === tab.key
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
    >
      <PlusIcon />
    </button>
  )
}
