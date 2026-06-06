import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

function UserDropdown({ user, logout, t }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {initials}
        </div>
        <span className="text-sm text-white/80 hidden sm:block max-w-[120px] truncate">{user.name}</span>
        <svg className={`w-3.5 h-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <div className="px-4 py-2.5 border-b border-gray-50">
            <p className="text-xs font-semibold text-navy truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          {user.faculty && (
            <div className="px-4 py-2 border-b border-gray-50">
              <p className="text-xs text-gray-500 truncate">{user.faculty}</p>
            </div>
          )}
          <button
            onClick={() => { setOpen(false); logout() }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h6a1 1 0 100-2H4V5h5a1 1 0 100-2H3zm10.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H8a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'ms' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <header className="bg-navy text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        <span className="font-serif text-lg hidden sm:block">{t('app.name')}</span>
      </Link>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleLang}
          className="px-3 py-1 rounded-md text-sm font-medium border border-white/20 hover:border-white/60 transition-colors"
        >
          {i18n.language === 'en' ? 'BM' : 'EN'}
        </button>

        {user ? (
          <UserDropdown user={user} logout={logout} t={t} />
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">
              {t('nav.login')}
            </Link>
            <Link to="/register" className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
              {t('nav.register')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
