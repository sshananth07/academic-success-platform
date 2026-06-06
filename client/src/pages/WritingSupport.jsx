import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { Tag } from '../components/ui/Tag'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_WORDS = 1000
const MIN_WORDS = 10

const DIMENSIONS = [
  { key: 'structure',       icon: '🏗️', labelKey: 'writing.dimensions.structure' },
  { key: 'clarity',         icon: '💡', labelKey: 'writing.dimensions.clarity' },
  { key: 'tone',            icon: '🎓', labelKey: 'writing.dimensions.tone' },
  { key: 'grammar',         icon: '📝', labelKey: 'writing.dimensions.grammar' },
  { key: 'evidence',        icon: '📊', labelKey: 'writing.dimensions.evidence' },
  { key: 'critical',        icon: '🔍', labelKey: 'writing.dimensions.critical' },
]

const SEVERITY_CONFIG = {
  high:   { color: 'text-red-700',    bg: 'bg-red-50 border-red-200',    dot: 'bg-red-500',    bar: 'bg-red-400' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500', bar: 'bg-yellow-400' },
  low:    { color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',  dot: 'bg-blue-400',   bar: 'bg-blue-300' },
}

// ─── Live metrics (client-side) ───────────────────────────────────────────────

function computeMetrics(text) {
  const words = text.trim() ? text.trim().split(/\s+/) : []
  const wordCount = words.length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 2)

  // Academic tone heuristic: presence of formal vocabulary
  const academicWords = ['therefore', 'furthermore', 'however', 'consequently', 'moreover',
    'subsequently', 'nevertheless', 'hypothesis', 'methodology', 'analysis', 'significant',
    'evidence', 'demonstrates', 'suggests', 'indicates', 'findings', 'research', 'study',
    'investigate', 'examine', 'conclude', 'argue', 'assert', 'propose']
  const textLower = text.toLowerCase()
  const academicHits = academicWords.filter(w => textLower.includes(w)).length
  const toneScore = wordCount === 0 ? 0 : Math.min((academicHits / Math.max(wordCount / 100, 1)) * 3, 10)
  const tone = toneScore >= 3 ? 'Good' : toneScore >= 1.5 ? 'Fair' : 'Weak'

  // Readability: avg words per sentence
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0
  const readability = avgWordsPerSentence <= 15 ? 'Easy' : avgWordsPerSentence <= 25 ? 'Medium' : 'Complex'

  // Passive voice heuristic
  const passivePattern = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi
  const passiveMatches = (text.match(passivePattern) || []).length
  const passivePct = sentences.length > 0 ? Math.round((passiveMatches / Math.max(sentences.length, 1)) * 100) : 0

  return { wordCount, tone, readability, passivePct }
}

// ─── UI sub-components ────────────────────────────────────────────────────────

function ScoreCard({ score, label, icon }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#16a34a' : score >= 6 ? '#d97706' : '#dc2626'
  const bgColor = score >= 8 ? 'bg-green-50 border-green-100' : score >= 6 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'

  return (
    <div className={`border rounded-xl p-4 flex flex-col items-center gap-2 ${bgColor}`}>
      <span className="text-2xl">{icon}</span>
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="32" cy="32" r="26" fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${(pct / 100) * 163.4} 163.4`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold" style={{ color }}>{score}<span className="text-xs font-normal text-gray-400">/10</span></span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-600 text-center leading-tight">{label}</p>
    </div>
  )
}

function LiveMetricsBar({ metrics, wordCount, maxWords }) {
  const { t } = useTranslation()
  const toneColor = metrics.tone === 'Good' ? 'text-green-600' : metrics.tone === 'Fair' ? 'text-yellow-600' : 'text-red-500'
  const readColor = metrics.readability === 'Easy' ? 'text-green-600' : metrics.readability === 'Medium' ? 'text-yellow-600' : 'text-red-500'
  const passiveColor = metrics.passivePct <= 15 ? 'text-green-600' : metrics.passivePct <= 30 ? 'text-yellow-600' : 'text-red-500'
  const overLimit = wordCount > maxWords

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 py-2 text-xs">
      <span className={`font-semibold ${overLimit ? 'text-red-600' : 'text-gray-600'}`}>
        {wordCount}/{maxWords} {t('writing.metrics.words')}
      </span>
      {wordCount >= MIN_WORDS && (
        <>
          <span>
            <span className="text-gray-400">{t('writing.metrics.tone')}: </span>
            <span className={`font-semibold ${toneColor}`}>{t(`writing.toneLevel.${metrics.tone}`)}</span>
          </span>
          <span>
            <span className="text-gray-400">{t('writing.metrics.readability')}: </span>
            <span className={`font-semibold ${readColor}`}>{t(`writing.readabilityLevel.${metrics.readability}`)}</span>
          </span>
          <span>
            <span className="text-gray-400">{t('writing.metrics.passive')}: </span>
            <span className={`font-semibold ${passiveColor}`}>{metrics.passivePct}%</span>
          </span>
        </>
      )}
    </div>
  )
}

function DimensionPreview() {
  const { t } = useTranslation()
  return (
    <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
        {t('writing.whatYouGet')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DIMENSIONS.map(d => (
          <div key={d.key} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs flex-shrink-0">✓</span>
            <span>{t(d.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ParagraphFeedbackCard({ item }) {
  const { t } = useTranslation()
  const conf = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.low
  return (
    <div className={`border rounded-xl p-4 ${conf.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${conf.bar}`}>
          {item.paragraph}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">Paragraph {item.paragraph}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${conf.bg} ${conf.color}`}>
              {t(`writing.severity.${item.severity}`)}
            </span>
          </div>
          {item.excerpt && (
            <p className="text-xs text-gray-500 italic mb-1.5">"{item.excerpt}…"</p>
          )}
          <p className={`text-sm font-medium ${conf.color}`}>{item.issue}</p>
        </div>
      </div>
    </div>
  )
}

function FeedbackDashboard({ result, onNewReview }) {
  const { t } = useTranslation()

  const scoreMap = {
    structure: normaliseScore(result.structureScore),
    clarity:   normaliseScore(result.clarityScore),
    tone:      normaliseScore(result.academicToneScore),
    grammar:   normaliseScore(result.grammarScore),
    evidence:  normaliseScore(result.evidenceScore),
    critical:  normaliseScore(result.criticalAnalysisScore),
  }

  const overallScore = Math.min(10, Math.round(
    Object.values(scoreMap).reduce((a, b) => a + (b || 0), 0) / DIMENSIONS.length
  ))

  return (
    <div className="space-y-6">
      {/* Overall + New Review */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${overallScore >= 8 ? 'text-green-600' : overallScore >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
            {overallScore}/10
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Overall Score</p>
            <p className="text-xs text-gray-400">Across 6 dimensions</p>
          </div>
        </div>
        <button
          onClick={onNewReview}
          className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
        >
          + {t('writing.newReview')}
        </button>
      </div>

      {/* Score cards grid */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {DIMENSIONS.map(d => (
          <ScoreCard
            key={d.key}
            icon={d.icon}
            label={t(d.labelKey)}
            score={scoreMap[d.key] ?? 0}
          />
        ))}
      </div>

      {/* Paragraph-level feedback */}
      {result.paragraphFeedback?.length > 0 && (
        <div>
          <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
            <span>📍</span> {t('writing.paragraphFeedback')}
          </h3>
          <div className="space-y-2">
            {result.paragraphFeedback.map((item, i) => (
              <ParagraphFeedbackCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {result.strengths?.length > 0 && (
        <div>
          <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
            <span>✅</span> {t('writing.strengths')}
          </h3>
          <ul className="space-y-2">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5 flex-shrink-0">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structure feedback */}
      {result.structureFeedback && (
        <div>
          <h3 className="font-semibold text-navy mb-2 flex items-center gap-2">
            <span>🏗️</span> {t('writing.structure')}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
            {result.structureFeedback}
          </p>
        </div>
      )}

      {/* Citation analysis */}
      <div>
        <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
          <span>📎</span> {t('writing.citations')}
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {result.citationAnalysis?.hasCitations ? (
            <Tag color="green">{t('writing.hasCitations')}</Tag>
          ) : (
            <Tag color="yellow">{t('writing.noCitations')}</Tag>
          )}
        </div>
        {result.citationAnalysis?.gaps?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {result.citationAnalysis.gaps.map((g, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                <span className="text-yellow-500 flex-shrink-0 mt-0.5">!</span> {g}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Grammar issues */}
      {result.grammarIssues?.length > 0 && (
        <div>
          <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
            <span>📝</span> {t('writing.grammarIssues')}
          </h3>
          <div className="space-y-2">
            {result.grammarIssues.map((g, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm">
                <p className="font-mono text-red-600 mb-1">"{g.original}"</p>
                <p className="text-gray-600 mb-1 text-xs">{g.issue}</p>
                <p className="text-green-700 text-xs">→ {g.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {result.improvements?.length > 0 && (
        <div>
          <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
            <span>💡</span> {t('writing.improvements')}
          </h3>
          <ul className="space-y-2">
            {result.improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-accent mt-0.5 flex-shrink-0">→</span> {imp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── History helpers ──────────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function normaliseScore(score) {
  if (score == null) return 0
  if (score > 10) return Math.round(score / 10 * 10) / 10
  return score
}

function scoreColor(score) {
  const s = normaliseScore(score)
  if (!s) return 'text-gray-400'
  return s >= 8 ? 'text-green-600' : s >= 6 ? 'text-yellow-600' : 'text-red-500'
}

function HistorySidebar({ history, loadingHistory, activeId, onLoad, onNewReview }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('writing.history.label')}
        </span>
        <button
          onClick={onNewReview}
          className="text-xs text-accent hover:text-accent-dark font-medium transition-colors"
        >
          + {t('writing.newReview')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[70vh]">
        {loadingHistory && (
          <div className="flex justify-center py-8"><Spinner size="sm" /></div>
        )}
        {!loadingHistory && history.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8 px-4">
            {t('writing.history.empty')}
          </p>
        )}
        {!loadingHistory && history.map(item => (
          <button
            key={item.id}
            onClick={() => onLoad(item.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50 ${
              activeId === item.id ? 'bg-orange-50 border-l-2 border-l-orange-400' : ''
            }`}
          >
            <p className="text-xs font-medium text-navy truncate leading-snug mb-0.5">
              {item.preview || t('writing.history.untitled')}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {item.clarity_score != null && (
                <span className={`text-xs font-semibold ${scoreColor(item.clarity_score)}`}>
                  {normaliseScore(item.clarity_score)}/10
                </span>
              )}
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WritingSupport() {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeId, setActiveId] = useState(null)

  const wordCount = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  )
  const metrics = useMemo(() => computeMetrics(text), [text])

  // Load history on mount
  useEffect(() => {
    let cancelled = false
    api.get('/api/writing/history')
      .then(res => { if (!cancelled) setHistory(res.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [])

  const refreshHistory = async () => {
    try {
      const res = await api.get('/api/writing/history')
      setHistory(res.data)
    } catch {}
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) return
    setLoading(true)
    setError('')
    setResult(null)
    setActiveId(null)
    try {
      const { data } = await api.post('/api/writing/review', { text, language: i18n.language })
      setResult(data.feedback)
      setActiveId(data.review_id)
      await refreshHistory()
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSession = async (id) => {
    if (id === activeId) return
    setLoadingSession(true)
    setError('')
    try {
      const { data } = await api.get(`/api/writing/${id}`)
      setText(data.draft_text || '')
      setResult(data.feedback)
      setActiveId(id)
    } catch {
      setError('Could not load review')
    } finally {
      setLoadingSession(false)
    }
  }

  const handleNewReview = () => {
    setResult(null)
    setError('')
    setText('')
    setActiveId(null)
  }

  const showPreview = !result && !loading && !loadingSession

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif text-navy">{t('writing.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('writing.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">

        {/* History sidebar */}
        <HistorySidebar
          history={history}
          loadingHistory={loadingHistory}
          activeId={activeId}
          onLoad={handleLoadSession}
          onNewReview={handleNewReview}
        />

        {/* Main panel */}
        <div className="min-w-0">

          {/* Input form — hidden after results */}
          {!result && !loadingSession && (
            <form onSubmit={handleReview} className="mb-4">
              <div className="relative">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={t('writing.placeholder')}
                  rows={10}
                  className="input-field resize-y w-full pb-10"
                  disabled={loading}
                />
                <div className={`absolute bottom-3 right-3 text-xs font-medium ${wordCount > MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
                  {wordCount}/{MAX_WORDS}
                </div>
              </div>

              <LiveMetricsBar metrics={metrics} wordCount={wordCount} maxWords={MAX_WORDS} />

              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">{t('writing.minWords')} · {t('writing.maxWords')}</p>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={wordCount < MIN_WORDS || wordCount > MAX_WORDS || loading}
                >
                  {t('writing.button')}
                </Button>
              </div>
            </form>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Loading */}
          {(loading || loadingSession) && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Spinner size="lg" />
              <div>
                <p className="text-navy font-medium">
                  {loading ? t('writing.loading') : 'Loading review…'}
                </p>
                {loading && <p className="text-gray-400 text-sm mt-1">Analysing 6 dimensions of your writing…</p>}
              </div>
            </div>
          )}

          {/* Dimension preview (empty state) */}
          {showPreview && wordCount === 0 && <DimensionPreview />}

          {/* Feedback dashboard */}
          {result && !loading && !loadingSession && (
            <>
              {/* Show the draft text used */}
              {text && (
                <div className="mb-5 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {t('writing.history.draftLabel')}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{text}</p>
                </div>
              )}
              <FeedbackDashboard result={result} onNewReview={handleNewReview} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
