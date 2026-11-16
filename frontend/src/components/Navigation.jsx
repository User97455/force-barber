import React from 'react'
import { CalendarPlus, BookmarkCheck, TrendingUp } from 'lucide-react'
import { tg } from '../telegram'

export default function Navigation({ activeTab, setActiveTab, isAdmin }) {
  const tabs = [
    { id: 'booking', label: 'Запись', icon: CalendarPlus },
    { id: 'my-bookings', label: 'Мои записи', icon: BookmarkCheck },
  ]

  // Strictly show Finance tab ONLY if user is verified Admin
  if (isAdmin) {
    tabs.push({ id: 'finance', label: 'Финансы', icon: TrendingUp })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tg-secondaryBg/95 backdrop-blur-md border-t border-white/10 px-3 py-2 pb-safe">
      <div className="max-w-md mx-auto grid grid-flow-col auto-cols-fr gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                tg.haptic('selection')
                setActiveTab(tab.id)
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 font-semibold shadow-inner'
                  : 'text-tg-hint hover:text-tg-text hover:bg-white/5 font-normal'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
