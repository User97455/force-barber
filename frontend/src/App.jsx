import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Navigation from './components/Navigation'
import BarberSelection from './components/BarberSelection'
import ServiceSelection from './components/ServiceSelection'
import DateTimeSelection from './components/DateTimeSelection'
import ConfirmationStep from './components/ConfirmationStep'
import MyBookings from './components/MyBookings'
import AdminFinance from './components/AdminFinance'
import { api } from './api'
import { tg } from './telegram'
import { ArrowLeft, CheckCircle2, Scissors, Calendar, Clock } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('booking')
  const [isAdmin, setIsAdmin] = useState(false)

  // Booking Flow State
  const [step, setStep] = useState(1) // 1: Barber, 2: Service, 3: DateTime, 4: Confirm
  const [barbers, setBarbers] = useState([])
  const [services, setServices] = useState([])
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastCreatedBooking, setLastCreatedBooking] = useState(null)

  // Initial Load
  useEffect(() => {
    tg.ready()

    // 1. Fetch barbers & services
    api.getBarbers()
      .then((data) => setBarbers(data))
      .catch((err) => console.error("Error loading barbers:", err))

    api.getServices()
      .then((data) => setServices(data))
      .catch((err) => console.error("Error loading services:", err))

    // 2. Check admin permissions
    api.checkAdmin()
      .then((res) => {
        setIsAdmin(Boolean(res?.is_admin))
      })
      .catch(() => {
        setIsAdmin(false)
      })
  }, [])

  const resetBookingFlow = () => {
    setStep(1)
    setSelectedBarber(null)
    setSelectedService(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setLastCreatedBooking(null)
  }

  const handleBookingSubmit = async (contactData) => {
    setSubmitting(true)
    try {
      const payload = {
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        client_name: contactData.client_name,
        client_phone: contactData.client_phone,
        client_telegram_id: contactData.client_telegram_id,
      }

      const res = await api.createBooking(payload)
      setLastCreatedBooking(res)
      setStep(5) // Success step
      tg.haptic('success')
    } catch (err) {
      alert("Ошибка при создании записи: " + err.message)
      tg.haptic('error')
    } finally {
      setSubmitting(false)
    }
  }

  const prevStep = () => {
    tg.haptic('light')
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text pb-24">
      {/* Top Header */}
      <Header isAdmin={isAdmin} />

      <main className="max-w-md mx-auto px-4 pt-4">
        {/* TAB 1: BOOKING FLOW */}
        {activeTab === 'booking' && (
          <div className="space-y-4">
            {/* Step navigation & back button */}
            {step > 1 && step < 5 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 text-xs text-tg-hint hover:text-white py-1 px-2 rounded-lg bg-white/5 border border-white/5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Назад
                </button>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? 'w-6 bg-amber-500'
                          : i < step
                          ? 'w-2 bg-amber-500/50'
                          : 'w-2 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Barber */}
            {step === 1 && (
              <BarberSelection
                barbers={barbers}
                selectedBarber={selectedBarber}
                onSelect={(b) => {
                  setSelectedBarber(b)
                  setStep(2)
                }}
              />
            )}

            {/* Step 2: Service */}
            {step === 2 && (
              <ServiceSelection
                services={services}
                selectedService={selectedService}
                onSelect={(s) => {
                  setSelectedService(s)
                  setStep(3)
                }}
              />
            )}

            {/* Step 3: Date & Time */}
            {step === 3 && (
              <div className="space-y-4">
                <DateTimeSelection
                  barberId={selectedBarber?.id}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={(d) => setSelectedDate(d)}
                  onSelectTime={(t) => {
                    setSelectedTime(t)
                    setStep(4)
                  }}
                />
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <ConfirmationStep
                barber={selectedBarber}
                service={selectedService}
                date={selectedDate}
                time={selectedTime}
                onConfirm={handleBookingSubmit}
                submitting={submitting}
              />
            )}

            {/* Step 5: Success Screen */}
            {step === 5 && (
              <div className="bg-tg-secondaryBg border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white">Вы записаны!</h2>
                  <p className="text-xs text-tg-hint">
                    Уведомление и подтверждение отправлены в Telegram
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between text-white font-semibold">
                    <span>{lastCreatedBooking?.barber_name}</span>
                    <span className="text-amber-400">{lastCreatedBooking?.price} ₽</span>
                  </div>
                  <p className="text-tg-hint">{lastCreatedBooking?.service_title}</p>
                  <p className="text-amber-400 font-medium">
                    {selectedDate} в {selectedTime}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      resetBookingFlow()
                      setActiveTab('my-bookings')
                    }}
                    className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                  >
                    Посмотреть мои записи
                  </button>

                  <button
                    onClick={resetBookingFlow}
                    className="w-full py-2.5 bg-white/5 text-tg-hint hover:text-white font-semibold text-xs rounded-xl transition-all"
                  >
                    Записаться ещё раз
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY BOOKINGS */}
        {activeTab === 'my-bookings' && (
          <MyBookings
            onGoToBooking={() => {
              resetBookingFlow()
              setActiveTab('booking')
            }}
          />
        )}

        {/* TAB 3: ADMIN FINANCE (Strictly Protected) */}
        {activeTab === 'finance' && isAdmin && (
          <AdminFinance />
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
      />
    </div>
  )
}
