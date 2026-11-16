import React, { useState, useEffect } from 'react'
import { User, Phone, CheckCircle2, ShieldCheck, Scissors, Calendar, Clock } from 'lucide-react'
import { tg } from '../telegram'

export default function ConfirmationStep({
  barber,
  service,
  date,
  time,
  onConfirm,
  submitting,
}) {
  const [name, setName] = useState(tg.user?.first_name || '')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Format phone mask +7 (XXX) XXX-XX-XX
  const handlePhoneChange = (e) => {
    let input = e.target.value.replace(/\D/g, '')

    // Remove leading 7 or 8 if entered
    if (input.startsWith('7') || input.startsWith('8')) {
      input = input.substring(1)
    }

    input = input.substring(0, 10) // 10 digits max

    let formatted = '+7'
    if (input.length > 0) {
      formatted += ' (' + input.substring(0, 3)
    }
    if (input.length >= 3) {
      formatted += ') ' + input.substring(3, 6)
    }
    if (input.length >= 6) {
      formatted += '-' + input.substring(6, 8)
    }
    if (input.length >= 8) {
      formatted += '-' + input.substring(8, 10)
    }

    setPhone(formatted)
    if (input.length === 10) {
      setPhoneError('')
    }
  }

  // Telegram MainButton integration
  useEffect(() => {
    const rawDigits = phone.replace(/\D/g, '').substring(1)
    const isValid = name.trim().length > 0 && rawDigits.length === 10

    if (tg.app?.MainButton) {
      try {
        if (isValid && !submitting) {
          tg.app.MainButton.setText(`ПОДТВЕРДИТЬ ЗАПИСЬ • ${service?.price?.toLocaleString('ru-RU')} ₽`)
          tg.app.MainButton.show()
          tg.app.MainButton.enable()
        } else {
          tg.app.MainButton.hide()
        }
      } catch (err) {
        // Safe catch
      }
    }

    return () => {
      try {
        tg.app?.MainButton?.hide()
      } catch (e) {}
    }
  }, [name, phone, submitting, service])

  const handleSubmit = (e) => {
    if (e) e.preventDefault()

    const rawDigits = phone.replace(/\D/g, '')
    // rawDigits should start with 7 and have 11 digits total (e.g. 79991234567)
    if (rawDigits.length < 11) {
      setPhoneError('Пожалуйста, введите полный номер телефона')
      tg.haptic('error')
      return
    }

    if (!name.trim()) {
      tg.haptic('error')
      return
    }

    tg.haptic('success')
    onConfirm({
      client_name: name.trim(),
      client_phone: phone,
      client_telegram_id: tg.user?.id,
    })
  }

  const rawDigits = phone.replace(/\D/g, '').substring(1)
  const isFormValid = name.trim().length > 0 && rawDigits.length === 10

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-tg-text">Шаг 4: Подтверждение визита</h2>
        <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> Без предоплаты
        </span>
      </div>

      {/* Summary Booking Card */}
      <div className="bg-tg-secondaryBg border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center space-x-3">
            <img
              src={barber?.photo_url}
              alt={barber?.name}
              className="w-11 h-11 rounded-xl object-cover ring-1 ring-amber-500/40"
            />
            <div>
              <p className="text-xs text-tg-hint">Ваш мастер</p>
              <p className="text-sm font-bold text-white">{barber?.name}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ★ {barber?.rating}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
            <span className="text-tg-hint flex items-center gap-1 mb-1">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              Услуга
            </span>
            <p className="font-semibold text-white line-clamp-1">{service?.title}</p>
            <p className="text-[11px] text-tg-hint">{service?.duration_minutes} мин</p>
          </div>

          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
            <span className="text-tg-hint flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Дата и время
            </span>
            <p className="font-semibold text-white">{date}</p>
            <p className="text-[11px] text-amber-400 font-bold">{time}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-tg-hint">К оплате после услуги:</span>
          <span className="text-xl font-black text-amber-400">
            {service?.price?.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>

      {/* Contact Inputs */}
      <form onSubmit={handleSubmit} className="bg-tg-secondaryBg border border-white/5 rounded-2xl p-4 space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tg-hint">Контактные данные</h3>

        <div>
          <label className="block text-xs text-tg-hint mb-1">Ваше имя</label>
          <div className="relative">
            <User className="w-4 h-4 text-tg-hint absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              placeholder="Как к вам обращаться"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-tg-hint mb-1">Номер телефона</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-tg-hint absolute left-3.5 top-3.5" />
            <input
              type="tel"
              required
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onChange={handlePhoneChange}
              className={`w-full bg-white/5 border rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none transition-colors ${
                phoneError ? 'border-red-500' : 'border-white/10 focus:border-amber-500'
              }`}
            />
          </div>
          {phoneError && (
            <p className="text-xs text-red-400 mt-1 pl-1">{phoneError}</p>
          )}
          <p className="text-[11px] text-tg-hint mt-1 pl-1">
            На этот номер мастер сможет позвонить или отправить напоминание.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || submitting}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all duration-200 mt-2 shadow-lg ${
            isFormValid && !submitting
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-[0.99] shadow-amber-500/20'
              : 'bg-white/10 text-white/30 cursor-not-allowed shadow-none'
          }`}
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Записаться ({service?.price?.toLocaleString('ru-RU')} ₽)</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
