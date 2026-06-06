import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

const MAX_WORDS = 3000
const MIN_WORDS = 50

// ─── Criteria meta (used both in preview and results) ────────────────────────

const CRITERIA_META = [
  {
    key: 'significance',
    icon: '🎯',
    color: 'blue',
    titleKey: 'grant.criteria.significance.title',
    descKey: 'grant.criteria.significance.desc',
  },
  {
    key: 'innovation',
    icon: '💡',
    color: 'purple',
    titleKey: 'grant.criteria.innovation.title',
    descKey: 'grant.criteria.innovation.desc',
  },
  {
    key: 'methodology',
    icon: '🔬',
    color: 'green',
    titleKey: 'grant.criteria.methodology.title',
    descKey: 'grant.criteria.methodology.desc',
  },
  {
    key: 'impact',
    icon: '🌍',
    color: 'orange',
    titleKey: 'grant.criteria.impact.title',
    descKey: 'grant.criteria.impact.desc',
  },
]

const COLOR_CLASSES = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',  text: 'text-blue-700',   bar: 'bg-blue-500'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100',text: 'text-purple-700', bar: 'bg-purple-500' },
  green:  { bg: 'bg-green-50',  border: 'border-green-100', text: 'text-green-700',  bar: 'bg-green-500'  },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100',text: 'text-orange-700', bar: 'bg-orange-500' },
}

// ─── Live quality estimate ────────────────────────────────────────────────────

function computeQuality(text) {
  if (!text.trim()) return 0
  const words = text.trim().split(/\s+/).length
  if (words < MIN_WORDS) return Math.round((words / MIN_WORDS) * 25)

  const lower = text.toLowerCase()
  let score = 25 // base for meeting minimum

  // Significance signals
  const sigTerms = ['significance', 'important', 'critical', 'problem statement', 'gap', 'rationale', 'objective', 'aim', 'research question']
  score += Math.min(20, sigTerms.filter(t => lower.includes(t)).length * 4)

  // Innovation signals
  const innTerms = ['novel', 'innovative', 'new approach', 'first', 'unique', 'original', 'contribution', 'state-of-the-art', 'emerging']
  score += Math.min(20, innTerms.filter(t => lower.includes(t)).length * 4)

  // Methodology signals
  const methTerms = ['methodology', 'method', 'data collection', 'analysis', 'sample', 'participants', 'quantitative', 'qualitative', 'framework', 'procedure']
  score += Math.min(20, methTerms.filter(t => lower.includes(t)).length * 4)

  // Impact signals
  const impTerms = ['impact', 'outcome', 'benefit', 'society', 'industry', 'policy', 'recommendation', 'expected', 'result', 'contribution']
  score += Math.min(15, impTerms.filter(t => lower.includes(t)).length * 3)

  // Word count bonus (500+ = stronger proposal)
  if (words >= 500) score = Math.min(score + 5, 100)
  if (words >= 1000) score = Math.min(score + 5, 100)

  return Math.min(score, 100)
}

function qualityLabel(pct) {
  if (pct < 25) return { label: 'Weak', color: 'text-red-500', bar: 'bg-red-400' }
  if (pct < 50) return { label: 'Fair', color: 'text-orange-500', bar: 'bg-orange-400' }
  if (pct < 75) return { label: 'Good', color: 'text-yellow-600', bar: 'bg-yellow-400' }
  return { label: 'Strong', color: 'text-green-600', bar: 'bg-green-500' }
}

// ─── Criteria preview cards (before submission) ───────────────────────────────

function CriteriaPreview() {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {CRITERIA_META.map(m => {
        const c = COLOR_CLASSES[m.color]
        return (
          <div key={m.key} className={`rounded-xl border p-3.5 ${c.bg} ${c.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{m.icon}</span>
              <span className={`text-sm font-semibold ${c.text}`}>{t(m.titleKey)}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{t(m.descKey)}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Radar chart (pure SVG) ───────────────────────────────────────────────────

function RadarChart({ scores }) {
  // Extra padding around the polygon so emoji labels don't clip
  const pad = 28
  const size = 200
  const vbSize = size + pad * 2
  const cx = vbSize / 2
  const cy = vbSize / 2
  const r = 72

  const axes = CRITERIA_META.map((m, i) => {
    const angle = (2 * Math.PI * i) / CRITERIA_META.length - Math.PI / 2
    return {
      ...m,
      angle,
      // Label sits just outside the outermost ring
      lx: cx + (r + 20) * Math.cos(angle),
      ly: cy + (r + 20) * Math.sin(angle),
    }
  })

  const gridLevels = [0.25, 0.5, 0.75, 1]

  const ringPoints = (fraction) =>
    axes.map(a => [cx + r * fraction * Math.cos(a.angle), cy + r * fraction * Math.sin(a.angle)])

  const toPath = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z'

  const dataPoints = axes.map((a, i) => {
    const frac = (scores[i] || 0) / 100
    return [cx + r * frac * Math.cos(a.angle), cy + r * frac * Math.sin(a.angle)]
  })

  return (
    <svg viewBox={`0 0 ${vbSize} ${vbSize}`} className="w-full max-w-[200px]">
      {/* Grid rings */}
      {gridLevels.map((frac, i) => (
        <polygon
          key={i}
          points={ringPoints(frac).map(p => p.join(',')).join(' ')}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={cx + r * Math.cos(a.angle)}
          y2={cy + r * Math.sin(a.angle)}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {/* Data polygon */}
      <path d={toPath(dataPoints)} fill="rgba(234,88,12,0.15)" stroke="#ea580c" strokeWidth="2" />

      {/* Data points */}
      {dataPoints.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="3.5" fill="#ea580c" />
      ))}

      {/* Emoji labels — rendered as foreignObject so they don't clip */}
      {axes.map((a, i) => (
        <text
          key={i}
          x={a.lx}
          y={a.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
        >
          {a.icon}
        </text>
      ))}
    </svg>
  )
}

// ─── Criterion row in results ─────────────────────────────────────────────────

function CriterionRow({ criterion }) {
  const [open, setOpen] = useState(false)
  const meta = CRITERIA_META.find(m => m.key === criterion.key) || CRITERIA_META[0]
  const c = COLOR_CLASSES[meta?.color || 'blue']
  const scoreColor = criterion.score >= 75 ? 'text-green-600' : criterion.score >= 50 ? 'text-yellow-600' : 'text-red-600'
  const barColor = criterion.score >= 75 ? 'bg-green-500' : criterion.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className={`border rounded-xl overflow-hidden ${c.border}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xl flex-shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-medium text-sm text-navy">{criterion.name}</span>
            <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{criterion.score}/100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${criterion.score}%` }}
            />
          </div>
        </div>
        <span className="text-gray-400 text-xs flex-shrink-0">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className={`px-4 pb-4 pt-3 border-t ${c.border} ${c.bg}`}>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{criterion.justification}</p>
          {criterion.suggestions?.length > 0 && (
            <ul className="space-y-1.5">
              {criterion.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className={`font-bold flex-shrink-0 mt-0.5 ${c.text}`}>→</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Score circle ─────────────────────────────────────────────────────────────

function OverallScoreCircle({ score }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-navy tabular-nums">{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GrantChecker() {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const quality = useMemo(() => computeQuality(text), [text])
  const ql = qualityLabel(quality)

  const handleCheck = async (e) => {
    e.preventDefault()
    if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) return
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const { data } = await api.post('/api/grant/check', { proposal_text: text, language: i18n.language })
      setReport(data.report)
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleNewReview = () => {
    setReport(null)
    setError('')
  }

  const hasReport = report && !loading

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif text-navy">{t('grant.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('grant.subtitle')}</p>
      </div>

      {/* Input section — hidden when report shown */}
      {!hasReport && (
        <>
          {/* Criteria preview cards */}
          <CriteriaPreview />

          {/* Input form */}
          <form onSubmit={handleCheck}>
            {/* Live quality bar */}
            {text.trim() && (
              <div className="mb-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {t('grant.qualityEstimate')}
                  </span>
                  <span className={`text-xs font-bold ${ql.color}`}>{ql.label} — {quality}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${ql.bar}`}
                    style={{ width: `${quality}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{t('grant.qualityHint')}</p>
              </div>
            )}

            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={t('grant.placeholder')}
                rows={14}
                className="input-field resize-y w-full"
                disabled={loading}
              />
              <div className={`absolute bottom-3 right-3 text-xs font-medium tabular-nums ${wordCount > MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
                {wordCount}/{MAX_WORDS} {t('grant.wordCount')}
              </div>
            </div>

            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-gray-400">{t('grant.maxWords')}</p>
              <Button
                type="submit"
                loading={loading}
                disabled={wordCount < MIN_WORDS || wordCount > MAX_WORDS || loading}
              >
                {t('grant.button')}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mt-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
          <Spinner size="lg" />
          <p className="text-sm">{t('grant.loading')}</p>
          <p className="text-xs text-gray-300">{t('grant.loadingHint')}</p>
        </div>
      )}

      {/* ── Results dashboard ── */}
      {hasReport && (
        <div>
          {/* Back button */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-navy text-lg">{t('grant.evaluationReport')}</h2>
            <button
              onClick={handleNewReview}
              className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + {t('grant.newEvaluation')}
            </button>
          </div>

          {/* Top row: score circle + radar + summary */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-4 mb-5">
            {/* Overall score */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col items-center justify-center gap-2 min-w-[160px]">
              <OverallScoreCircle score={report.overallScore || 0} />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('grant.overallScore')}</p>
            </div>

            {/* Radar chart */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col items-center justify-center min-w-[200px]">
              <RadarChart
                scores={(report.criteria || []).map(c => c.score)}
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {(report.criteria || []).map((c, i) => {
                  const meta = CRITERIA_META.find(m => m.key === c.key) || CRITERIA_META[i]
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs">{meta?.icon}</span>
                      <span className="text-xs text-gray-500 tabular-nums">{c.score}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Strengths summary */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('grant.summary')}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{report.strengthsSummary}</p>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="text-base">✅</span> {t('grant.strengths')}
              </h3>
              <ul className="space-y-2">
                {(report.strengths || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                    <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
                {(!report.strengths || report.strengths.length === 0) && (
                  <li className="text-sm text-green-700 italic">{report.strengthsSummary}</li>
                )}
              </ul>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span className="text-base">⚠️</span> {t('grant.weaknesses')}
              </h3>
              <ul className="space-y-2">
                {(report.weaknesses || []).map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
                    {w}
                  </li>
                ))}
                {(!report.weaknesses || report.weaknesses.length === 0) && (
                  <li className="text-sm text-red-700 italic">{t('grant.noWeaknesses')}</li>
                )}
              </ul>
            </div>
          </div>

          {/* Criterion breakdown */}
          <div className="mb-5">
            <h3 className="font-semibold text-navy mb-3 text-sm">{t('grant.criteriaBreakdown')}</h3>
            <div className="space-y-2">
              {(report.criteria || []).map((c, i) => (
                <CriterionRow key={i} criterion={c} />
              ))}
            </div>
          </div>

          {/* Priority recommendations */}
          {report.overallRecommendations?.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-navy mb-4 flex items-center gap-2">
                <span>🚀</span> {t('grant.recommendations')}
              </h3>
              <div className="space-y-3">
                {report.overallRecommendations.map((rec, i) => {
                  const isObj = rec !== null && typeof rec === 'object'
                  const action = isObj ? String(rec.action ?? '') : String(rec)
                  const rationale = isObj ? String(rec.rationale ?? '') : ''
                  const priority = isObj ? (rec.priority ?? i + 1) : i + 1
                  const isHigh = priority === 1
                  return (
                    <div key={i} className={`flex gap-3 p-3 rounded-xl ${isHigh ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
                      <span className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5 ${isHigh ? 'bg-accent' : 'bg-gray-400'}`}>
                        {priority}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${isHigh ? 'text-navy' : 'text-gray-700'}`}>{action}</p>
                        {rationale && (
                          <p className="text-xs text-gray-500 mt-0.5">{rationale}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
