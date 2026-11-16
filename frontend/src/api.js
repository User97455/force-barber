import { tg } from './telegram'

const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  // Attach Telegram initData if available
  const initData = tg.initData
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData
  } else if (typeof window !== 'undefined' && window.__MOCK_ADMIN__) {
    headers['X-Telegram-Init-Data'] = `test_mode_user_id=${window.__MOCK_ADMIN_ID__ || 123456789}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export const api = {
  getBarbers: () => request('/barbers'),
  getServices: () => request('/services'),
  getSlots: (barberId, date) => request(`/slots?barber_id=${barberId}&date=${date}`),
  createBooking: (data) => request('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMyBookings: () => request('/my-bookings'),
  cancelBooking: (bookingId) => request(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
  }),
  checkAdmin: () => request('/admin/check'),
  getAdminStats: (period = 'all') => request(`/admin/stats?period=${period}`),
  getAdminBookings: () => request('/admin/bookings'),
  updateBookingStatus: (bookingId, status) => request(`/admin/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  createService: (data) => request('/admin/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteService: (serviceId) => request(`/admin/services/${serviceId}`, {
    method: 'DELETE',
  }),
  createBarber: (data) => request('/admin/barbers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteBarber: (barberId) => request(`/admin/barbers/${barberId}`, {
    method: 'DELETE',
  }),
  resetStats: () => request('/admin/reset-stats', {
    method: 'POST',
  }),
}
