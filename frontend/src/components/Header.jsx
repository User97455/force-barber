import React from 'react'
import { Scissors, MapPin } from 'lucide-react'
import { tg } from '../telegram'

export default function Header({ isAdmin }) {
  const user = tg.user

  return (
    <header className="px-4 pt-4 pb-3 bg-tg-secondaryBg border-b border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
            <Scissors className="w-5 h-5 rotate-45" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              BORODA &amp; CO
              {isAdmin && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-semibold px-1.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-wide">
                  Admin
                </span>
              )}
            </h1>
            <p className="text-xs text-tg-hint flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500/80" />
              ул. Новый Арбат, 21
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-tg-hint">Клиент</p>
          <p className="text-xs font-medium text-tg-text">
            {user.first_name || 'Гость'}
          </p>
        </div>
      </div>
    </header>
  )
}
