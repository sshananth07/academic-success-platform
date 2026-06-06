import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'nav.dashboard', icon: '🏠' },
  { to: '/research', label: 'nav.research', icon: '🔬' },
  { to: '/integrity', label: 'nav.integrity', icon: '⚖️' },
  { to: '/writing', label: 'nav.writing', icon: '✏️' },
  { to: '/sources', label: 'nav.sources', icon: '📚' },
  { to: '/grant', label: 'nav.grant', icon: '🏆' },
]

export function MobileNav() {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (!user) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                isActive ? 'text-accent' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            <span className="truncate max-w-full px-1">{t(item.label).split(' ')[0]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
