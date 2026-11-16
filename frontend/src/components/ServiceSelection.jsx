import React from 'react'
import { Clock, Check } from 'lucide-react'
import { tg } from '../telegram'

export default function ServiceSelection({ services, selectedService, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-tg-text">Шаг 2: Выберите услугу</h2>
        <span className="text-xs text-tg-hint">Услуг: {services.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id
          return (
            <div
              key={service.id}
              onClick={() => {
                tg.haptic('selection')
                onSelect(service)
              }}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/5'
                  : 'bg-tg-secondaryBg border-white/5 hover:border-white/15'
              }`}
            >
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  {service.title}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-tg-hint">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                    {service.duration_minutes} мин
                  </span>
                  <span>•</span>
                  <span>Гарантия стиля</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-sm font-extrabold text-white">
                    {service.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950'
                    : 'border border-white/10 text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
