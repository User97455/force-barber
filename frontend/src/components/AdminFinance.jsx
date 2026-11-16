import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  RefreshCw,
  PhoneCall,
  ShieldAlert,
  Scissors,
  Plus,
  Trash2,
  AlertTriangle,
  Settings,
} from 'lucide-react'
import { api } from '../api'
import { tg } from '../telegram'

export default function AdminFinance() {
  const [subTab, setSubTab] = useState('stats') // 'stats' | 'manage'
  const [period, setPeriod] = useState('all') // 'today', 'month', 'all'
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [barbers, setBarbers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState(null)

  // Forms
  const [newService, setNewService] = useState({ title: '', price: '', duration_minutes: 60 })
  const [newBarber, setNewBarber] = useState({ name: '', specialization: '', rating: 5.0, telegram_id: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = () => {
    setLoading(true)
    setError(null)

    Promise.all([
      api.getAdminStats(period),
      api.getAdminBookings(),
      api.getBarbers(),
      api.getServices(),
    ])
      .then(([statsData, bookingsData, barbersData, servicesData]) => {
        setStats(statsData)
        setBookings(bookingsData)
        setBarbers(barbersData)
        setServices(servicesData)
      })
      .catch((err) => {
        console.error("Failed to load admin stats:", err)
        setError(err.message || "Ошибка загрузки финансовых данных")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [period])

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, newStatus)
      tg.haptic('success')
      loadData()
    } catch (err) {
      alert("Не удалось обновить статус: " + err.message)
      tg.haptic('error')
    } finally {
      setUpdatingId(null)
    }
  }

  // Reset profit / clear bookings
  const handleResetStats = async () => {
    const confirmed = window.confirm("ВНИМАНИЕ! Вы уверены, что хотите сбросить всю прибыль и очистить историю записей? Выручка станет 0 ₽.")
    if (!confirmed) return

    setActionLoading(true)
    try {
      await api.resetStats()
      tg.haptic('warning')
      alert("Прибыль и записи успешно сброшены!")
      loadData()
    } catch (err) {
      alert("Ошибка сброса: " + err.message)
      tg.haptic('error')
    } finally {
      setActionLoading(false)
    }
  }

  // Add Service
  const handleAddService = async (e) => {
    e.preventDefault()
    if (!newService.title.trim() || !newService.price) return

    setActionLoading(true)
    try {
      await api.createService({
        title: newService.title.trim(),
        price: parseInt(newService.price),
        duration_minutes: parseInt(newService.duration_minutes) || 60,
      })
      tg.haptic('success')
      setNewService({ title: '', price: '', duration_minutes: 60 })
      loadData()
    } catch (err) {
      alert("Ошибка добавления услуги: " + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Service
  const handleDeleteService = async (id) => {
    if (!window.confirm("Удалить эту услугу?")) return
    try {
      await api.deleteService(id)
      tg.haptic('success')
      loadData()
    } catch (err) {
      alert("Ошибка удаления услуги: " + err.message)
    }
  }

  // Add Barber
  const handleAddBarber = async (e) => {
    e.preventDefault()
    if (!newBarber.name.trim() || !newBarber.specialization.trim()) return

    setActionLoading(true)
    try {
      await api.createBarber({
        name: newBarber.name.trim(),
        specialization: newBarber.specialization.trim(),
        rating: parseFloat(newBarber.rating) || 5.0,
        telegram_id: newBarber.telegram_id ? parseInt(newBarber.telegram_id) : null,
      })
      tg.haptic('success')
      setNewBarber({ name: '', specialization: '', rating: 5.0, telegram_id: '' })
      loadData()
    } catch (err) {
      alert("Ошибка добавления мастера: " + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Barber
  const handleDeleteBarber = async (id) => {
    if (!window.confirm("Удалить этого мастера?")) return
    try {
      await api.deleteBarber(id)
      tg.haptic('success')
      loadData()
    } catch (err) {
      alert("Ошибка удаления мастера: " + err.message)
    }
  }

  const formatDateTime = (isoStr) => {
    try {
      const dt = new Date(isoStr)
      return dt.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return isoStr
    }
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">Доступ ограничен</h3>
        <p className="text-xs text-red-300 max-w-xs mx-auto">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-500 text-white font-semibold text-xs rounded-xl"
        >
          Повторить попытку
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Панель администратора
          </h2>
          <p className="text-xs text-tg-hint">Управление барбершопом и касса</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-tg-secondaryBg border border-white/5 text-tg-hint hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>

      {/* Admin Subtabs Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-tg-secondaryBg rounded-2xl border border-white/5">
        <button
          onClick={() => {
            tg.haptic('selection')
            setSubTab('stats')
          }}
          className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'stats'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-tg-hint hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Прибыль и записи
        </button>
        <button
          onClick={() => {
            tg.haptic('selection')
            setSubTab('manage')
          }}
          className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'manage'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-tg-hint hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Мастера и услуги
        </button>
      </div>

      {/* SUBTAB 1: STATS & REVENUE */}
      {subTab === 'stats' && (
        <div className="space-y-4">
          {/* Period Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-tg-secondaryBg rounded-2xl border border-white/5">
            {[
              { id: 'today', label: 'За сегодня' },
              { id: 'month', label: 'За месяц' },
              { id: 'all', label: 'За всё время' },
            ].map((p) => {
              const isActive = period === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    tg.haptic('selection')
                    setPeriod(p.id)
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-tg-hint hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-amber-500/20 via-tg-secondaryBg to-tg-secondaryBg border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Общая выручка барбершопа
              </span>
              <span className="text-[11px] text-tg-hint bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                {period === 'today' ? 'Сегодня' : period === 'month' ? 'Этот месяц' : 'Все данные'}
              </span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stats ? stats.total_revenue.toLocaleString('ru-RU') : '0'}
              </span>
              <span className="text-xl font-bold text-amber-400">₽</span>
            </div>

            {/* Sub-counters */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
              <div className="bg-white/[0.03] p-2 rounded-xl">
                <span className="text-[10px] text-tg-hint block">Записей</span>
                <span className="text-xs font-bold text-white">
                  {stats?.total_bookings_count || 0}
                </span>
              </div>
              <div className="bg-white/[0.03] p-2 rounded-xl">
                <span className="text-[10px] text-emerald-400 block">Выполнено</span>
                <span className="text-xs font-bold text-emerald-400">
                  {stats?.completed_count || 0}
                </span>
              </div>
              <div className="bg-white/[0.03] p-2 rounded-xl">
                <span className="text-[10px] text-red-400 block">Отменено</span>
                <span className="text-xs font-bold text-red-400">
                  {stats?.cancelled_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Reset Stats Button */}
          <div className="bg-tg-secondaryBg border border-red-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Сброс прибыли и записей
              </span>
              <p className="text-[11px] text-tg-hint">Очистить тестовые бронирования и обнулить кассу</p>
            </div>
            <button
              onClick={handleResetStats}
              disabled={actionLoading}
              className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Сбросить
            </button>
          </div>

          {/* Per-Barber Breakdown */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tg-hint">
              Выручка по мастерам
            </h3>
            <div className="space-y-2">
              {stats?.barbers_stats?.map((b) => {
                const totalRev = stats.total_revenue || 1
                const pct = Math.min(100, Math.round((b.revenue / totalRev) * 100))

                return (
                  <div
                    key={b.barber_id}
                    className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-bold text-white">{b.barber_name}</span>
                      </div>
                      <span className="text-sm font-black text-amber-400">
                        {b.revenue.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-tg-hint">
                      <span>{b.specialization}</span>
                      <span className="font-medium text-white/80">
                        {b.clients_count} клиентов ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Bookings List */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tg-hint">
              Управление визитами ({bookings.length})
            </h3>

            <div className="space-y-2.5">
              {bookings.map((b) => {
                const isUpdating = updatingId === b.id
                const isActive = b.status === 'active'
                const isCompleted = b.status === 'completed'
                const isCancelled = b.status === 'cancelled'

                return (
                  <div
                    key={b.id}
                    className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {b.client_name}
                          <a
                            href={`tel:${b.client_phone}`}
                            className="text-amber-400 hover:text-amber-300 ml-1 inline-flex items-center"
                            title="Позвонить"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                        </h4>
                        <p className="text-[11px] text-tg-hint">{b.client_phone}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400 block">
                          {b.price.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-400'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isActive ? 'Активен' : isCompleted ? 'Выполнен' : 'Отменён'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-tg-hint pt-1 border-t border-white/5">
                      <span className="truncate max-w-[50%]">
                        {b.barber_name} • {b.service_title}
                      </span>
                      <span>{formatDateTime(b.booking_datetime)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleStatusChange(b.id, 'completed')}
                        disabled={isUpdating || isCompleted}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400/50 border border-emerald-500/20 cursor-default'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 active:scale-95'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Выполнен
                      </button>

                      <button
                        onClick={() => handleStatusChange(b.id, 'cancelled')}
                        disabled={isUpdating || isCancelled}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          isCancelled
                            ? 'bg-red-500/10 text-red-400/50 border border-red-500/20 cursor-default'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 active:scale-95'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Отменить
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: MANAGEMENT OF SERVICES & BARBERS */}
      {subTab === 'manage' && (
        <div className="space-y-6">
          {/* SERVICES MANAGEMENT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-500" />
                Услуги и категории ({services.length})
              </h3>
            </div>

            {/* List of existing services */}
            <div className="space-y-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{s.title}</h4>
                    <p className="text-[11px] text-tg-hint">{s.duration_minutes} мин • <span className="text-amber-400 font-semibold">{s.price.toLocaleString('ru-RU')} ₽</span></p>
                  </div>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Удалить услугу"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Service Form */}
            <form onSubmit={handleAddService} className="bg-tg-secondaryBg border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                <Plus className="w-3.5 h-3.5" /> Добавить новую услугу
              </h4>

              <input
                type="text"
                required
                placeholder="Название услуги (напр. Окрашивание)"
                value={newService.title}
                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  placeholder="Цена (₽)"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="number"
                  required
                  placeholder="Минут (напр. 45)"
                  value={newService.duration_minutes}
                  onChange={(e) => setNewService({ ...newService, duration_minutes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Добавить услугу
              </button>
            </form>
          </div>

          {/* BARBERS MANAGEMENT */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                Мастера ({barbers.length})
              </h3>
            </div>

            {/* List of existing barbers */}
            <div className="space-y-2">
              {barbers.map((b) => (
                <div
                  key={b.id}
                  className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={b.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={b.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{b.name}</h4>
                      <p className="text-[11px] text-tg-hint line-clamp-1">{b.specialization}</p>
                      <p className="text-[10px] text-amber-400">
                        {b.telegram_id ? `TG ID: ${b.telegram_id}` : 'Не привязан к TG'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBarber(b.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Удалить мастера"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Barber Form */}
            <form onSubmit={handleAddBarber} className="bg-tg-secondaryBg border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                <Plus className="w-3.5 h-3.5" /> Добавить мастера
              </h4>

              <input
                type="text"
                required
                placeholder="Имя и фамилия мастера"
                value={newBarber.name}
                onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />

              <input
                type="text"
                required
                placeholder="Специализация (напр. Шеф-барбер, фейды)"
                value={newBarber.specialization}
                onChange={(e) => setNewBarber({ ...newBarber, specialization: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  max="5"
                  min="1"
                  placeholder="Рейтинг (4.9)"
                  value={newBarber.rating}
                  onChange={(e) => setNewBarber({ ...newBarber, rating: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="number"
                  placeholder="Личный TG ID мастера (для уведомлений)"
                  value={newBarber.telegram_id}
                  onChange={(e) => setNewBarber({ ...newBarber, telegram_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Добавить мастера
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
