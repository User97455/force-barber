import React, { useState, useEffect } from 'react'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { api } from '../api'
import { tg } from '../telegram'

export default function DateTimeSelection({
  barberId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}) {
  const [days, setDays] = useState([])
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Generate 14 days ahead
  useEffect(() => {
    const list = []
    const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
    const monthNames = [
      'янв', 'фев', 'мар', 'апр', 'май', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ]

    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(today.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      list.push({
        dateStr,
        dayOfMonth: d.getDate(),
        dayOfWeek: dayNames[d.getDay()],
        month: monthNames[d.getMonth()],
        isToday: i === 0,
        isTomorrow: i === 1,
      })
    }
    setDays(list)

    if (!selectedDate && list.length > 0) {
      onSelectDate(list[0].dateStr)
    }
  }, [])

  // Load available slots when date or barber changes
  useEffect(() => {
    if (!selectedDate || !barberId) return

    let cancelled = false
    setLoadingSlots(true)

    api.getSlots(barberId, selectedDate)
      .then((data) => {
        if (!cancelled) {
          setSlots(data)
          // If previously selected time is no longer available on this date, reset it
          const isTimeStillValid = data.some((s) => s.time === selectedTime && s.available)
          if (!isTimeStillValid && selectedTime) {
            onSelectTime(null)
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load slots:", err)
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })

    return () => {
      cancelled = true
    }
  }, [barberId, selectedDate])

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-tg-text flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            Шаг 3: Выберите дату и время
          </h2>
          <span className="text-xs text-tg-hint">14 дней</span>
        </div>

        {/* 14-days Horizontal Scroller */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {days.map((item) => {
            const isSelected = selectedDate === item.dateStr
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => {
                  tg.haptic('selection')
                  onSelectDate(item.dateStr)
                }}
                className={`flex-shrink-0 w-[4.4rem] py-2.5 px-1.5 rounded-2xl flex flex-col items-center transition-all duration-200 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20 scale-[1.03]'
                    : 'bg-tg-secondaryBg border-white/5 text-tg-hint hover:border-white/20'
                }`}
              >
                <span className={`text-[11px] uppercase tracking-wider font-semibold ${isSelected ? 'text-slate-900' : 'text-tg-hint'}`}>
                  {item.isToday ? 'Сегодня' : item.isTomorrow ? 'Завтра' : item.dayOfWeek}
                </span>
                <span className={`text-lg font-black my-0.5 ${isSelected ? 'text-slate-950' : 'text-white'}`}>
                  {item.dayOfMonth}
                </span>
                <span className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-tg-hint'}`}>
                  {item.month}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slots Grid (10:00 - 20:00) */}
      <div className="bg-tg-secondaryBg/60 border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-tg-hint">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Свободные слоты (10:00 – 20:00)
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Свободно
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              Занято
            </span>
          </div>
        </div>

        {loadingSlots ? (
          <div className="grid grid-cols-4 gap-2 py-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="py-6 text-center text-xs text-tg-hint flex flex-col items-center gap-1">
            <AlertCircle className="w-5 h-5 text-amber-500/60" />
            Нет доступных слотов на этот день
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isSelected = selectedTime === slot.time
              const isAvailable = slot.available

              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (isAvailable) {
                      tg.haptic('selection')
                      onSelectTime(slot.time)
                    }
                  }}
                  className={`py-2.5 px-1 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                      : isAvailable
                      ? 'bg-tg-secondaryBg text-white border border-white/10 hover:border-amber-500/50 hover:bg-white/5 active:scale-95'
                      : 'bg-white/[0.02] text-slate-600 border border-transparent cursor-not-allowed line-through'
                  }`}
                >
                  {slot.time}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
