import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Scissors, AlertCircle, XCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { tg } from '../telegram'

export default function MyBookings({ onGoToBooking }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  const loadBookings = () => {
    setLoading(true)
    api.getMyBookings()
      .then((data) => setBookings(data))
      .catch((err) => console.error("Error loading my bookings:", err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Вы уверены, что хотите отменить эту запись? Слот освободится для других гостей.")) {
      return
    }

    setCancellingId(bookingId)
    try {
      await api.cancelBooking(bookingId)
      tg.haptic('warning')
      loadBookings()
    } catch (err) {
      alert("Не удалось отменить запись: " + err.message)
      tg.haptic('error')
    } finally {
      setCancellingId(null)
    }
  }

  const formatDateTime = (isoStr) => {
    try {
      const dt = new Date(isoStr)
      const datePart = dt.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      })
      const timePart = dt.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return `${datePart} в ${timePart}`
    } catch (e) {
      return isoStr
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Мои записи</h2>
          <p className="text-xs text-tg-hint">История и активные визиты</p>
        </div>
        <button
          onClick={loadBookings}
          className="p-2 rounded-xl bg-tg-secondaryBg border border-white/5 text-tg-hint hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-tg-secondaryBg animate-pulse border border-white/5" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">У вас пока нет записей</h3>
            <p className="text-xs text-tg-hint mt-1 max-w-xs mx-auto">
              Выберите удобное время и любимого мастера прямо сейчас.
            </p>
          </div>
          <button
            onClick={onGoToBooking}
            className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            Записаться онлайн
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const isActive = b.status === 'active'
            const isCompleted = b.status === 'completed'
            const isCancelled = b.status === 'cancelled'

            return (
              <div
                key={b.id}
                className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-4 space-y-3 relative overflow-hidden"
              >
                {/* Status indicator bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isActive ? 'bg-amber-500' : isCompleted ? 'bg-emerald-500' : 'bg-red-500/50'
                  }`}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold">
                    <span className="text-white font-bold">{b.barber_name}</span>
                  </div>

                  <div>
                    {isActive && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Активна
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Завершена
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Отменена
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-white">
                    <Scissors className="w-3.5 h-3.5 text-amber-500/80" />
                    <span className="font-medium">{b.service_title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-tg-hint">
                    <Calendar className="w-3.5 h-3.5 text-amber-500/80" />
                    <span>{formatDateTime(b.booking_datetime)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs font-bold text-white">
                    {b.price.toLocaleString('ru-RU')} ₽
                  </span>

                  {b.can_cancel && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 active:scale-95 transition-all"
                    >
                      {cancellingId === b.id ? 'Отмена...' : 'Отменить запись'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
