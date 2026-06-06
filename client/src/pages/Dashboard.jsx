import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const MODULE_META = {
  research: { icon: '🔬', color: 'blue',   to: '/research' },
  integrity: { icon: '⚖️', color: 'purple', to: '/integrity' },
  writing:   { icon: '✏️', color: 'green',  to: '/writing' },
  sources:   { icon: '📚', color: 'orange', to: '/sources' },
  grant:     { icon: '🏆', color: 'red',    to: '/grant' },
}

const COLOR_MAP = {
  blue:   { card: 'bg-blue-50 border-blue-100',     badge: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  purple: { card: 'bg-purple-50 border-purple-100', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700 text-white' },
  green:  { card: 'bg-green-50 border-green-100',   badge: 'bg-green-100 text-green-700',   btn: 'bg-green-600 hover:bg-green-700 text-white' },
  orange: { card: 'bg-orange-50 border-orange-100', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700 text-white' },
  red:    { card: 'bg-red-50 border-red-100',       badge: 'bg-red-100 text-red-700',       btn: 'bg-red-600 hover:bg-red-700 text-white' },
}

const ACTIVITY_META = {
  research: { icon: '🔬', color: 'text-blue-600',   to: '/research' },
  writing:  { icon: '✏️', color: 'text-green-600',  to: '/writing' },
  sources:  { icon: '📚', color: 'text-orange-600', to: '/sources' },
  grant:    { icon: '🏆', color: 'text-red-600',    to: '/grant' },
  chat:     { icon: '⚖️', color: 'text-purple-600', to: '/integrity' },
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function StatCard({ icon, value, label, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3">
      <div className="text-2xl leading-none">{icon}</div>
      <div>
        {loading ? (
          <div className="h-6 w-8 bg-gray-100 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-2xl font-bold text-navy leading-none">{value}</div>
        )}
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function ModuleCard({ moduleKey, stats, loading }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const meta = MODULE_META[moduleKey]
  const colors = COLOR_MAP[meta.color]
  const count = stats?.[moduleKey] ?? 0

  return (
    <div className={`border rounded-xl p-5 flex flex-col gap-3 ${colors.card}`}>
      <div className="flex items-start justify-between">
        <div className="text-3xl leading-none">{meta.icon}</div>
        {loading ? (
          <div className="h-5 w-16 bg-white/60 rounded-full animate-pulse" />
        ) : count > 0 ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
            {count} {count === 1 ? 'session' : 'sessions'}
          </span>
        ) : null}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-navy mb-1">{t(`dashboard.modules.${moduleKey}.title`)}</h3>
        <p className="text-sm text-gray-500">{t(`dashboard.modules.${moduleKey}.desc`)}</p>
      </div>
      <button
        onClick={() => navigate(meta.to)}
        className={`w-full text-sm font-medium py-2 px-3 rounded-lg transition-colors ${colors.btn}`}
      >
        {t(`dashboard.modules.${moduleKey}.action`)}
      </button>
    </div>
  )
}

function ContinueCard({ activity }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const meta = ACTIVITY_META[activity.type]
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-xl flex-shrink-0">{meta.icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">
            {t(`dashboard.activityType.${activity.type}`)} · {timeAgo(activity.created_at)}
          </p>
          <p className="text-sm font-medium text-navy truncate">{activity.label}</p>
        </div>
      </div>
      <button
        onClick={() => navigate(meta.to)}
        className="flex-shrink-0 text-sm font-medium text-white bg-navy hover:bg-navy/90 px-4 py-1.5 rounded-lg transition-colors"
      >
        {t('dashboard.continueBtn')}
      </button>
    </div>
  )
}

function ActivityItem({ item }) {
  const { t } = useTranslation()
  const meta = ACTIVITY_META[item.type]
  return (
    <Link
      to={meta.to}
      className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="text-xl flex-shrink-0">{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-navy truncate">{item.label}</p>
        <p className={`text-xs font-medium ${meta.color}`}>{t(`dashboard.activityType.${item.type}`)}</p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(item.created_at)}</span>
    </Link>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/api/auth/dashboard-stats'),
          api.get('/api/auth/recent-activity'),
        ])
        if (!cancelled) {
          setStats(statsRes.data)
          setActivity(activityRes.data)
        }
      } catch {
        if (!cancelled) {
          setStats({})
          setActivity([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const lastItem = activity?.[0] ?? null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif text-navy">
          {t('dashboard.welcome')}, {firstName}
        </h1>
        <p className="text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon="🔬" value={stats?.research ?? 0} label={t('dashboard.stats.research')} loading={loading} />
        <StatCard icon="📚" value={stats?.sources ?? 0} label={t('dashboard.stats.sources')} loading={loading} />
        <StatCard icon="✏️" value={stats?.writing ?? 0} label={t('dashboard.stats.writing')} loading={loading} />
      </div>

      {/* Continue where you left off */}
      {!loading && lastItem && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {t('dashboard.continueLabel')}
          </h2>
          <ContinueCard activity={lastItem} />
        </div>
      )}

      {/* Module Grid */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {t('dashboard.modulesLabel')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(MODULE_META).map(key => (
            <ModuleCard key={key} moduleKey={key} stats={stats} loading={loading} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-navy mb-4">{t('dashboard.recentActivity')}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {loading && (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded animate-pulse mb-1.5 w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && activity?.length === 0 && (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <div className="text-4xl">🚀</div>
              <p className="text-gray-500 text-sm">{t('dashboard.noActivity')}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                <button
                  onClick={() => navigate('/research')}
                  className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {t('dashboard.cta.research')}
                </button>
                <button
                  onClick={() => navigate('/integrity')}
                  className="text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  {t('dashboard.cta.integrity')}
                </button>
                <button
                  onClick={() => navigate('/writing')}
                  className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                >
                  {t('dashboard.cta.writing')}
                </button>
              </div>
            </div>
          )}
          {!loading && activity?.length > 0 && (
            <div>
              {activity.map((item, i) => (
                <ActivityItem key={`${item.type}-${item.id}-${i}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
