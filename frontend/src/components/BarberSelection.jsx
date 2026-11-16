import React from 'react'
import { Star, Check } from 'lucide-react'
import { tg } from '../telegram'

export default function BarberSelection({ barbers, selectedBarber, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-tg-text">Шаг 1: Выберите мастера</h2>
        <span className="text-xs text-tg-hint">Всего: {barbers.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {barbers.map((barber) => {
          const isSelected = selectedBarber?.id === barber.id
          return (
            <div
              key={barber.id}
              onClick={() => {
                tg.haptic('selection')
                onSelect(barber)
              }}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/5'
                  : 'bg-tg-secondaryBg border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="relative">
                  <img
                    src={barber.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={barber.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {barber.rating.toFixed(2)}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {barber.name}
                  </h3>
                  <p className="text-xs text-tg-hint mt-0.5 line-clamp-1">
                    {barber.specialization}
                  </p>
                  <p className="text-[11px] text-amber-400/90 font-medium mt-1">
                    Ближайшая запись сегодня
                  </p>
                </div>
              </div>

              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-amber-500 text-slate-950'
                  : 'border border-white/10 text-transparent'
              }`}>
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
