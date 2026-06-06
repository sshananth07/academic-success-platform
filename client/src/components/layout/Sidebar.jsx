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

export function Sidebar() {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 min-h-[calc(100vh-56px)] py-4">
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-navy'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {t(item.label)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
