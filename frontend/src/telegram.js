// Telegram WebApp Integration helper
import WebApp from '@twa-dev/sdk'

export const tg = {
  get isAvailable() {
    return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData)
  },

  get app() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp
    }
    return WebApp
  },

  get user() {
    return this.app?.initDataUnsafe?.user || {
      id: 123456789,
      first_name: "Гость",
      last_name: "",
      username: "guest",
    }
  },

  get initData() {
    return this.app?.initData || ""
  },

  ready() {
    try {
      this.app?.ready()
      this.app?.expand()
      if (this.app?.setHeaderColor) {
        this.app.setHeaderColor('#0b0f19')
      }
      if (this.app?.setBackgroundColor) {
        this.app.setBackgroundColor('#0b0f19')
      }
    } catch (e) {
      console.warn("Telegram WebApp ready error:", e)
    }
  },

  haptic(style = 'light') {
    try {
      if (this.app?.HapticFeedback) {
        if (style === 'success' || style === 'warning' || style === 'error') {
          this.app.HapticFeedback.notificationOccurred(style)
        } else {
          this.app.HapticFeedback.impactOccurred(style)
        }
      }
    } catch (e) {
      // Haptics not supported in plain browser
    }
  },

  close() {
    try {
      this.app?.close()
    } catch (e) {
      console.warn("Telegram WebApp close error:", e)
    }
  }
}
