import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

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
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 hidden sm:block">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
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
