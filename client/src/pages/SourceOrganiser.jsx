import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { Button } from '../components/ui/Button'
import { Tag } from '../components/ui/Tag'
import { Spinner } from '../components/ui/Spinner'

// ─── Source type detection (client-side) ─────────────────────────────────────

const DOI_RE = /\b(10\.\d{4,}[\w./()-]+)/i
const URL_RE = /^https?:\/\//i
const ARXIV_RE = /arxiv\.org/i
const ISBN_RE = /\b(97[89][\d -]{10,}|\d{9}[\dX])\b/i
const CONF_RE = /\b(proceedings|conference|symposium|workshop|ICML|NeurIPS|ICLR|CVPR|ACL|EMNLP|AAAI|IEEE|ACM)\b/i
const THESIS_RE = /\b(thesis|dissertation|PhD|master'?s|doctoral)\b/i
const REPORT_RE = /\b(report|white paper|technical note|working paper|policy brief)\b/i

function detectSourceType(raw) {
  const s = raw.trim()
  if (DOI_RE.test(s)) return 'journal-article'
  if (ARXIV_RE.test(s)) return 'journal-article'
  if (ISBN_RE.test(s)) return 'book'
  if (THESIS_RE.test(s)) return 'thesis'
  if (CONF_RE.test(s)) return 'conference-paper'
  if (REPORT_RE.test(s)) return 'report'
  if (URL_RE.test(s)) return 'website'
  return 'unknown'
}

// ─── APA preview skeleton ─────────────────────────────────────────────────────

function buildApaPreview(raw) {
  const s = raw.trim()
  const doiMatch = s.match(DOI_RE)
  if (doiMatch) return `[Author(s)]. ([Year]). [Title]. [Journal], [Volume]([Issue]). https://doi.org/${doiMatch[1]}`
  if (URL_RE.test(s)) {
    try {
      const url = new URL(s)
      return `[Author(s)]. ([Year]). [Page title]. ${url.hostname}. ${s}`
    } catch {
      return `[Author(s)]. ([Year]). [Page title]. Retrieved from ${s}`
    }
  }
  if (ISBN_RE.test(s)) return `[Author(s)]. ([Year]). ${s}. [Publisher].`
  return `[Author(s)]. ([Year]). ${s}. [Source details].`
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  'journal-article':  { color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: '📄' },
  'book':             { color: 'bg-green-100 text-green-700 border-green-200',    icon: '📕' },
  'website':          { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🌐' },
  'conference-paper': { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎤' },
  'report':           { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '📊' },
  'thesis':           { color: 'bg-pink-100 text-pink-700 border-pink-200',       icon: '🎓' },
  'unknown':          { color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: '❓' },
}

const CREDIBILITY_COLOR = {
  'peer-reviewed':   'green',
  'grey-literature': 'yellow',
  'news':            'blue',
  'blog':            'red',
  'unknown':         'gray',
}

const MAX_SOURCES = 15

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

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

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportBibTeX(references) {
  downloadFile(references.map(r => (r.bibtex || '').replace(/\\n/g, '\n')).join('\n\n'), 'references.bib', 'text/plain')
}

function exportRIS(references) {
  downloadFile(references.map(r => (r.ris || '').replace(/\\n/g, '\n')).join('\n\n'), 'references.ris', 'application/x-research-info-systems')
}

function exportWord(references) {
  const lines = references.map((r, i) => `${i + 1}. ${r.citation}`).join('\n\n')
  const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 ${lines.replace(/\n/g, '\\par ')}}`
  downloadFile(rtf, 'references.doc', 'application/msword')
}

// ─── History sidebar ──────────────────────────────────────────────────────────

function HistorySidebar({ history, loadingHistory, activeId, onLoad, onNewSession }) {
  const { t } = useTranslation()

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('sources.history.label')}
        </span>
        <button
          onClick={onNewSession}
          className="text-xs text-accent hover:text-accent-dark font-medium transition-colors"
        >
          + {t('sources.newSession')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[70vh]">
        {loadingHistory && (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        )}
        {!loadingHistory && history.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8 px-4">
            {t('sources.history.empty')}
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
              {item.preview}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">
                {item.source_count} {item.source_count === 1 ? t('sources.history.sources') : t('sources.history.sources_plural')}
              </span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Input source card (before generation) ───────────────────────────────────

function SourceInputCard({ source, onRemove }) {
  const { t } = useTranslation()
  const type = detectSourceType(source.raw)
  const typeConf = TYPE_CONFIG[type] || TYPE_CONFIG.unknown
  const preview = buildApaPreview(source.raw)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0 mt-0.5">{typeConf.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${typeConf.color}`}>
              {t(`sources.sourceTypeShort.${type}`)}
            </span>
          </div>
          <p className="text-sm text-gray-700 break-all leading-relaxed">{source.raw}</p>
          <div className="mt-2.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 font-semibold mb-0.5">{t('sources.preview.label')}</p>
            <p className="text-xs text-gray-500 font-mono leading-relaxed">{preview}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors ml-1 mt-0.5"
          aria-label="Remove source"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Generated reference card (after generation) ─────────────────────────────

function ReferenceCard({ reference: r }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const typeConf = TYPE_CONFIG[r.sourceType] || TYPE_CONFIG.unknown

  const copyApa = () => {
    navigator.clipboard.writeText(r.citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap">
        <span className="text-base">{typeConf.icon}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeConf.color}`}>
          {t(`sources.sourceType.${r.sourceType || 'unknown'}`)}
        </span>
        <Tag color={CREDIBILITY_COLOR[r.credibility] || 'gray'}>
          {t(`sources.credibility.${r.credibility}`) || r.credibility}
        </Tag>
        {r.accessible && <Tag color="green">{t('sources.accessible')}</Tag>}
        <span className="text-xs text-gray-400 ml-auto truncate max-w-[200px]">{r.input}</span>
      </div>
      <div className="px-4 pt-3 pb-1">
        <p className="font-mono text-sm text-navy leading-relaxed">{r.citation}</p>
      </div>
      {r.annotation && (
        <div className="px-4 pb-3 pt-1">
          <p className="text-xs text-gray-500 leading-relaxed">{r.annotation}</p>
        </div>
      )}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={copyApa}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
          }`}
        >
          {copied ? `✓ ${t('sources.export.copied')}` : t('sources.export.copyApa')}
        </button>
        {r.bibtex && (
          <button
            onClick={() => downloadFile((r.bibtex || '').replace(/\\n/g, '\n'), 'reference.bib', 'text/plain')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-navy hover:text-navy transition-colors bg-white"
          >
            BibTeX
          </button>
        )}
        {r.ris && (
          <button
            onClick={() => downloadFile((r.ris || '').replace(/\\n/g, '\n'), 'reference.ris', 'application/x-research-info-systems')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-navy hover:text-navy transition-colors bg-white"
          >
            RIS
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SourceOrganiser() {
  const { t, i18n } = useTranslation()

  // Input state
  const [sources, setSources] = useState([])
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef(null)
  const nextId = useRef(1)

  // Results state
  const [references, setReferences] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [error, setError] = useState('')
  const [bulkCopied, setBulkCopied] = useState(false)

  // History state
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Load history on mount
  useEffect(() => {
    let cancelled = false
    api.get('/api/sources/history')
      .then(res => { if (!cancelled) setHistory(res.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [])

  const refreshHistory = async () => {
    try {
      const res = await api.get('/api/sources/history')
      setHistory(res.data)
    } catch {}
  }

  // Duplicate detection
  const normalisedSet = new Set(sources.map(s => normalise(s.raw)))
  const inputIsDuplicate = inputVal.trim() ? normalisedSet.has(normalise(inputVal)) : false

  const addSource = useCallback(() => {
    const raw = inputVal.trim()
    if (!raw || sources.length >= MAX_SOURCES) return
    setSources(prev => [...prev, { id: nextId.current++, raw }])
    setInputVal('')
    inputRef.current?.focus()
  }, [inputVal, sources.length])

  const removeSource = id => setSources(prev => prev.filter(s => s.id !== id))

  const handleKeyDown = e => {
    if (e.key === 'Enter') { e.preventDefault(); addSource() }
  }

  const handleOrganise = async () => {
    if (sources.length === 0) return
    setLoading(true)
    setError('')
    setReferences([])
    setActiveSessionId(null)
    try {
      const { data } = await api.post('/api/sources/organise', {
        inputs: sources.map(s => s.raw).slice(0, MAX_SOURCES),
        language: i18n.language,
      })
      setReferences(data.references || [])
      setActiveSessionId(data.list_id)
      await refreshHistory()
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSession = async (id) => {
    if (id === activeSessionId) return
    setLoadingSession(true)
    setError('')
    try {
      const { data } = await api.get(`/api/sources/${id}`)
      setReferences(data.references || [])
      setActiveSessionId(id)
      // Restore inputs as source cards
      const restored = (data.inputs || []).map(raw => ({ id: nextId.current++, raw }))
      setSources(restored)
    } catch {
      setError(t('sources.history.loadError'))
    } finally {
      setLoadingSession(false)
    }
  }

  const handleNewSession = () => {
    setSources([])
    setReferences([])
    setActiveSessionId(null)
    setError('')
    setInputVal('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const copyAllApa = () => {
    navigator.clipboard.writeText(references.map(r => r.citation).join('\n\n'))
    setBulkCopied(true)
    setTimeout(() => setBulkCopied(false), 2000)
  }

  const hasResults = references.length > 0 && !loading && !loadingSession

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif text-navy">{t('sources.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('sources.subtitle')}</p>
      </div>

      {/* Two-column layout: sidebar + main */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">

        {/* ── History sidebar ── */}
        <HistorySidebar
          history={history}
          loadingHistory={loadingHistory}
          activeId={activeSessionId}
          onLoad={handleLoadSession}
          onNewSession={handleNewSession}
        />

        {/* ── Main panel ── */}
        <div className="min-w-0">

          {/* Input section */}
          {!hasResults && (
            <>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('sources.addPlaceholder')}
                    className={`input-field w-full pr-10 ${inputIsDuplicate ? 'border-red-300 bg-red-50 focus:border-red-400' : ''}`}
                    disabled={loading || sources.length >= MAX_SOURCES}
                  />
                  {inputVal.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm">
                      {(TYPE_CONFIG[detectSourceType(inputVal)] || TYPE_CONFIG.unknown).icon}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={addSource}
                  disabled={!inputVal.trim() || inputIsDuplicate || sources.length >= MAX_SOURCES || loading}
                >
                  + {t('sources.addSource')}
                </Button>
              </div>

              {inputIsDuplicate && (
                <p className="text-xs text-red-600 mb-2 flex items-center gap-1">⚠️ {t('sources.duplicate')}</p>
              )}
              {sources.length >= MAX_SOURCES && (
                <p className="text-xs text-orange-600 mb-2">{t('sources.maxReached')}</p>
              )}

              {sources.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {sources.map(s => (
                    <SourceInputCard key={s.id} source={s} onRemove={() => removeSource(s.id)} />
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 mb-4">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Add your sources above</p>
                  <p className="text-xs text-gray-400">URLs, DOIs, paper titles, or book ISBNs</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {['10.1037/0000165-000', 'https://www.gov.my/report', 'The impact of AI on education'].map(ex => (
                      <button
                        key={ex}
                        onClick={() => { setInputVal(ex); inputRef.current?.focus() }}
                        className="text-xs px-2.5 py-1 bg-gray-100 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sources.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{sources.length}/{MAX_SOURCES} {t('sources.maxSources')}</p>
                  <Button onClick={handleOrganise} loading={loading} disabled={sources.length === 0 || loading}>
                    {t('sources.button')}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Loading states */}
          {(loading || loadingSession) && (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Spinner size="lg" />
              <p>{loading ? t('sources.loading') : 'Loading session…'}</p>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <div>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-navy">
                    {t('sources.results')}
                    <span className="text-gray-400 font-normal text-sm ml-1">({references.length})</span>
                  </h2>
                  <button
                    onClick={handleNewSession}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    + {t('sources.newSession')}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={copyAllApa}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      bulkCopied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
                    }`}
                  >
                    {bulkCopied ? `✓ ${t('sources.export.copied')}` : t('sources.export.copyAll')}
                  </button>
                  <button
                    onClick={() => exportBibTeX(references)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-navy hover:text-navy transition-colors bg-white"
                  >
                    {t('sources.export.bibtex')}
                  </button>
                  <button
                    onClick={() => exportRIS(references)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-navy hover:text-navy transition-colors bg-white"
                  >
                    {t('sources.export.ris')}
                  </button>
                  <button
                    onClick={() => exportWord(references)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-navy hover:text-navy transition-colors bg-white"
                  >
                    {t('sources.export.word')}
                  </button>
                </div>
              </div>

              {/* Reference cards */}
              <div className="space-y-4">
                {references.map((ref, i) => (
                  <ReferenceCard key={i} reference={ref} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
