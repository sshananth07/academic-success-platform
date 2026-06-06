import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { Button } from '../components/ui/Button'
import { Tag } from '../components/ui/Tag'
import { Spinner } from '../components/ui/Spinner'

// ─── Constants ───────────────────────────────────────────────────────────────

const POPULAR_TOPICS = [
  'AI in Higher Education',
  'Academic Integrity',
  'Machine Learning in Healthcare',
  'Sustainable Development Goals',
  'Digital Transformation in Malaysia',
  'Renewable Energy Technologies',
  'Mental Health Among University Students',
  'Blockchain in Education',
]

const YEAR_PRESETS = [
  { label: 'Last 2 years', from: 2023, to: 2025 },
  { label: 'Last 5 years', from: 2020, to: 2025 },
  { label: 'Last 10 years', from: 2015, to: 2025 },
  { label: 'All time', from: 1900, to: 2025 },
]

const DEFAULT_FILTERS = {
  yearFrom: 2020,
  yearTo: 2025,
  sources: { semantic_scholar: true, crossref: true },
  types: { journal: true, conference: true },
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function CheckChip({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        checked
          ? 'bg-navy text-white border-navy'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
      }`}
    >
      <span className={`inline-block w-3 h-3 rounded-sm border flex-shrink-0 ${checked ? 'bg-white border-white' : 'border-gray-400'}`}>
        {checked && (
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-navy" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

function FilterPanel({ filters, onChange, disabled }) {
  const setYearFrom = v => onChange({ ...filters, yearFrom: v })
  const setYearTo = v => onChange({ ...filters, yearTo: v })
  const toggleSource = k => onChange({ ...filters, sources: { ...filters.sources, [k]: !filters.sources[k] } })
  const toggleType = k => onChange({ ...filters, types: { ...filters.types, [k]: !filters.types[k] } })

  return (
    <div className={`bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Year */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Publication Year</p>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            value={filters.yearFrom}
            onChange={e => setYearFrom(Number(e.target.value))}
            min={1900} max={filters.yearTo}
            className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-navy"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            value={filters.yearTo}
            onChange={e => setYearTo(Number(e.target.value))}
            min={filters.yearFrom} max={2025}
            className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-navy"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {YEAR_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ ...filters, yearFrom: p.from, yearTo: p.to })}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                filters.yearFrom === p.from && filters.yearTo === p.to
                  ? 'bg-navy text-white border-navy'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Source</p>
        <div className="flex flex-col gap-1.5">
          <CheckChip label="Semantic Scholar" checked={filters.sources.semantic_scholar} onChange={v => toggleSource('semantic_scholar')} />
          <CheckChip label="CrossRef" checked={filters.sources.crossref} onChange={v => toggleSource('crossref')} />
        </div>
      </div>

      {/* Type */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</p>
        <div className="flex flex-col gap-1.5">
          <CheckChip label="Journal" checked={filters.types.journal} onChange={v => toggleType('journal')} />
          <CheckChip label="Conference" checked={filters.types.conference} onChange={v => toggleType('conference')} />
        </div>
      </div>
    </div>
  )
}

// ─── Loading animation ────────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Querying Semantic Scholar & CrossRef…',
  'Filtering for relevance…',
  'Synthesising themes & findings…',
  'Identifying research gaps…',
]

function LoadingSteps() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % LOADING_STEPS.length), 2200)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <Spinner size="lg" />
      <div>
        <p className="text-navy font-medium">{LOADING_STEPS[step]}</p>
        <p className="text-gray-400 text-sm mt-1">This usually takes 10–20 seconds</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {LOADING_STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-6 bg-navy' : 'w-1.5 bg-gray-200'}`} />
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onChipClick }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center gap-8">
      {/* Hero illustration */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-6xl">🔬</div>
        <h2 className="text-xl font-semibold text-navy">Start your literature search</h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Search any research topic and get a structured synthesis of academic papers in seconds.
        </p>
        <ul className="mt-1 space-y-1.5 text-sm text-gray-500 text-left">
          {['Discover key papers from Semantic Scholar & CrossRef', 'Identify themes, findings & contradictions', 'Spot research gaps for your study', 'Save sources directly to the Source Organiser'].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Popular topics */}
      <div className="w-full max-w-lg">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Popular Topics</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {POPULAR_TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => onChipClick(topic)}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded-full hover:bg-blue-100 hover:border-blue-200 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Three-column results ─────────────────────────────────────────────────────

function PaperList({ papers, selectedIdx, onSelect }) {
  if (!papers?.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">No papers found for these filters.</div>
  )
  return (
    <div className="divide-y divide-gray-50">
      {papers.map((p, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${selectedIdx === i ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
        >
          <p className={`text-sm font-medium leading-snug mb-1 ${selectedIdx === i ? 'text-navy' : 'text-gray-800'}`}>
            {p.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{p.year}</span>
            {p.citationCount > 0 && (
              <span className="text-xs text-blue-600 font-medium">{p.citationCount} cited</span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded text-gray-500 ${
              p.source === 'Semantic Scholar' ? 'bg-purple-50' : 'bg-orange-50'
            }`}>
              {p.source === 'Semantic Scholar' ? 'SS' : 'CR'}
            </span>
            {p.type === 'conference' && (
              <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Conf.</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function PaperDetail({ paper, onSaveToSources, saving, saved }) {
  if (!paper) return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">👈</div>
      <p className="text-sm">Select a paper to view details</p>
    </div>
  )
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-navy text-base leading-snug mb-1">{paper.title}</h3>
        <p className="text-xs text-gray-500">{paper.authors} · {paper.year}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {paper.citationCount > 0 && <Tag color="blue">{paper.citationCount} cited</Tag>}
        {paper.isOpenAccess && <Tag color="green">Open Access</Tag>}
        <Tag color="gray">{paper.source}</Tag>
        {paper.type && <Tag color="gray">{paper.type}</Tag>}
      </div>
      {paper.abstract ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Abstract</p>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-6">{paper.abstract}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No abstract available.</p>
      )}
      <div className="flex gap-2 pt-1 flex-wrap">
        {paper.url && (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline font-medium"
          >
            View paper →
          </a>
        )}
        <button
          onClick={() => onSaveToSources(paper)}
          disabled={saving || saved}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            saved
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-navy hover:text-navy'
          } disabled:opacity-60`}
        >
          {saved ? '✓ Saved to Sources' : saving ? 'Saving…' : '📚 Save to Sources'}
        </button>
      </div>
    </div>
  )
}

function buildMarkdown(result, topic) {
  const lines = [`# AI Synthesis: ${topic}`, '']

  if (result.themes?.length) {
    lines.push('## Key Themes', '')
    result.themes.forEach(t => {
      lines.push(`### ${t.name}`)
      lines.push(t.description)
      if (t.papers?.length) lines.push(`*Papers: ${t.papers.join(', ')}*`)
      lines.push('')
    })
  }

  if (result.majorFindings?.length) {
    lines.push('## Major Findings', '')
    result.majorFindings.forEach(f => {
      lines.push(`- ${f.finding}`)
      if (f.supportedBy?.length) lines.push(`  *(${f.year} · ${f.supportedBy.join(', ')})*`)
    })
    lines.push('')
  }

  if (result.contradictions?.length) {
    lines.push('## Contradictions', '')
    result.contradictions.forEach(c => {
      lines.push(`- **A:** ${c.claim1}`)
      lines.push(`  **B:** ${c.claim2}`)
    })
    lines.push('')
  }

  if (result.researchGaps?.length) {
    lines.push('## Research Gaps', '')
    result.researchGaps.forEach(g => lines.push(`- ${g}`))
    lines.push('')
  }

  return lines.join('\n')
}

function AISynthesis({ result, topic }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState({ themes: true, findings: true, contradictions: true, gaps: true })
  const [copied, setCopied] = useState(false)
  const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }))

  const handleCopy = () => {
    navigator.clipboard.writeText(buildMarkdown(result, topic))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const md = buildMarkdown(result, topic)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `synthesis-${topic.toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const Section = ({ id, title, children }) => (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      <button
        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => toggle(id)}
      >
        <span className="font-semibold text-navy text-sm">{title}</span>
        <span className="text-gray-400">{open[id] ? '▾' : '▸'}</span>
      </button>
      {open[id] && <div className="p-4">{children}</div>}
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">AI Synthesis</span>
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
          {topic}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            title="Copy as Markdown"
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
              copied
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            title="Download as Markdown"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            .md
          </button>
        </div>
      </div>

      {result.themes?.length > 0 && (
        <Section id="themes" title={`🎯 ${t('research.themes')}`}>
          <div className="space-y-3">
            {result.themes.map((theme, i) => (
              <div key={i}>
                <h4 className="font-semibold text-gray-800 text-sm mb-0.5">{theme.name}</h4>
                <p className="text-gray-600 text-xs mb-1.5">{theme.description}</p>
                <div className="flex flex-wrap gap-1">
                  {theme.papers?.map((p, j) => <Tag key={j} color="navy">{p}</Tag>)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.majorFindings?.length > 0 && (
        <Section id="findings" title={`💡 ${t('research.findings')}`}>
          <div className="space-y-2">
            {result.majorFindings.map((f, i) => (
              <div key={i} className="border-l-2 border-accent pl-3">
                <p className="text-gray-700 text-xs">{f.finding}</p>
                <p className="text-gray-400 text-xs mt-0.5">{f.year} · {f.supportedBy?.join(', ')}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.contradictions?.length > 0 && (
        <Section id="contradictions" title={`⚡ ${t('research.contradictions')}`}>
          <div className="space-y-2">
            {result.contradictions.map((c, i) => (
              <div key={i} className="bg-yellow-50 rounded-lg p-2.5 text-xs">
                <p className="text-gray-700"><strong>A:</strong> {c.claim1}</p>
                <p className="text-gray-700 mt-1"><strong>B:</strong> {c.claim2}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.researchGaps?.length > 0 && (
        <Section id="gaps" title={`🔭 ${t('research.gaps')}`}>
          <ul className="space-y-1.5">
            {result.researchGaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-accent mt-0.5 flex-shrink-0">→</span>
                {g}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

// ─── Save toast ───────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 3000)
    return () => clearTimeout(id)
  }, [onDismiss])
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2">
      <span>✓</span>
      {message}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchDiscovery() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [searchedTopic, setSearchedTopic] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [result, setResult] = useState(null)
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [savedPapers, setSavedPapers] = useState(new Set())
  const [savingPaper, setSavingPaper] = useState(null)
  const [toast, setToast] = useState(null)
  const inputRef = useRef(null)

  const buildFiltersPayload = () => ({
    year_from: filters.yearFrom,
    year_to: filters.yearTo,
    sources: Object.entries(filters.sources).filter(([, v]) => v).map(([k]) => k),
    types: Object.entries(filters.types).filter(([, v]) => v).map(([k]) => k),
  })

  const runSearch = async (searchTopic) => {
    const trimmed = searchTopic.trim()
    if (!trimmed || trimmed.length < 3) return
    setLoading(true)
    setError('')
    setResult(null)
    setPapers([])
    setSelectedPaper(null)
    setSelectedIdx(null)
    setSavedPapers(new Set())
    try {
      const { data } = await api.post('/api/research/discover', {
        topic: trimmed,
        language: i18n.language,
        filters: buildFiltersPayload(),
      })
      setResult(data.result)
      setPapers(data.result?.sources || [])
      setSearchedTopic(trimmed)
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runSearch(topic)
  }

  const handleChipClick = (chipTopic) => {
    setTopic(chipTopic)
    runSearch(chipTopic)
  }

  const handleSelectPaper = (idx) => {
    setSelectedIdx(idx)
    setSelectedPaper(papers[idx])
  }

  const handleSaveToSources = async (paper) => {
    const key = paper.url || paper.title
    setSavingPaper(key)
    try {
      await api.post('/api/sources/organise', {
        inputs: [paper.url || paper.title],
        language: i18n.language,
      })
      setSavedPapers(prev => new Set([...prev, key]))
      setToast('Saved to Source Organiser')
    } catch {
      setToast('Could not save — try again')
    } finally {
      setSavingPaper(null)
    }
  }

  const handleNewSearch = () => {
    setResult(null)
    setError('')
    setTopic('')
    setPapers([])
    setSelectedPaper(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const showEmpty = !loading && !result && !error

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-navy">{t('research.title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('research.subtitle')}</p>
        </div>
        {result && !loading && (
          <button
            onClick={handleNewSearch}
            className="flex-shrink-0 text-sm text-blue-600 font-medium border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors mt-1"
          >
            + {t('research.newSearch')}
          </button>
        )}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={t('research.placeholder')}
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowFilters(f => !f)}
            className={`px-3 py-2.5 text-sm font-medium border rounded-lg transition-colors flex items-center gap-1.5 ${
              showFilters ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm3 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Filters
          </button>
          <Button type="submit" loading={loading} disabled={topic.trim().length < 3 || loading}>
            {t('research.button')}
          </Button>
        </div>

        {/* Inline quick chips */}
        {showEmpty && !showFilters && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {POPULAR_TOPICS.slice(0, 4).map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4">
          <FilterPanel filters={filters} onChange={setFilters} disabled={loading} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingSteps />}

      {/* Empty state */}
      {showEmpty && <EmptyState onChipClick={handleChipClick} />}

      {/* Three-column results */}
      {result && !loading && (
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-[280px_1fr_1fr] gap-4 items-start">
          {/* Col 1: Paper list */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-3 py-3 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Papers
              </span>
              <span className="text-xs text-gray-400">{papers.length} found</span>
            </div>
            <div className="p-2 max-h-[70vh] overflow-y-auto">
              <PaperList papers={papers} selectedIdx={selectedIdx} onSelect={handleSelectPaper} />
            </div>
          </div>

          {/* Col 2: Paper detail */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paper Details</span>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <PaperDetail
                paper={selectedPaper}
                onSaveToSources={handleSaveToSources}
                saving={savingPaper === (selectedPaper?.url || selectedPaper?.title)}
                saved={selectedPaper && savedPapers.has(selectedPaper.url || selectedPaper.title)}
              />
            </div>
          </div>

          {/* Col 3: AI Synthesis */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Synthesis</span>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <AISynthesis result={result} topic={searchedTopic} />
            </div>
          </div>
        </div>
      )}

      {/* Save toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
