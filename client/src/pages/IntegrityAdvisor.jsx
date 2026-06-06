import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../services/api'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'Can I use ChatGPT for assignments?',
  'How much paraphrasing is acceptable?',
  'What is self-plagiarism?',
  'How should I cite AI tools?',
  'What counts as academic misconduct?',
  'Can I reuse my own previous work?',
]

const CATEGORIES = [
  { key: 'integrity', icon: '🎓', questions: ['What is academic integrity?', 'What counts as academic misconduct?', 'What are the penalties for integrity violations?'] },
  { key: 'ai',        icon: '🤖', questions: ['Can I use ChatGPT for assignments?', 'How should I cite AI tools?', 'What AI tools are allowed in exams?'] },
  { key: 'plagiarism',icon: '📋', questions: ['How much paraphrasing is acceptable?', 'What is self-plagiarism?', 'How is plagiarism detected?'] },
  { key: 'citation',  icon: '📚', questions: ['How do I cite a website in APA?', 'How do I cite an AI chatbot?', 'What is an annotated bibliography?'] },
  { key: 'assessment',icon: '📝', questions: ['Can I collaborate with classmates on assignments?', 'What is contract cheating?', 'Are open-book exams allowed?'] },
]

const CONFIDENCE_CONFIG = {
  High:   { color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500',  bar: 'w-full' },
  Medium: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500', bar: 'w-2/3' },
  Low:    { color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',     dot: 'bg-gray-400',   bar: 'w-1/3' },
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }) {
  const { t } = useTranslation()
  const isUser = msg.role === 'user'
  const conf = msg.confidence ? CONFIDENCE_CONFIG[msg.confidence] : null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold mr-2.5 flex-shrink-0 mt-1">
          ⚖️
        </div>
      )}

      <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-navy text-white rounded-br-sm'
            : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
        }`}>
          {msg.streaming && msg.content === '' ? (
            <div className="flex items-center gap-2 text-gray-400 py-0.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs">{t('chat.typing')}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          )}
        </div>

        {/* Source citation panel (assistant only) */}
        {!isUser && !msg.streaming && msg.sourcesDetail?.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 w-full text-xs">
            <p className="font-semibold text-blue-700 mb-1.5 flex items-center gap-1.5">
              <span>📄</span> {t('chat.basedOn')}
            </p>
            <ul className="space-y-1">
              {msg.sourcesDetail.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="text-blue-800 font-medium truncate">{s.document}</span>
                  <span className="text-blue-500 flex-shrink-0">
                    {Math.round(s.similarity * 100)}% match
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence indicator (assistant only, after streaming) */}
        {!isUser && !msg.streaming && msg.confidence && conf && (
          <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs font-medium ${conf.bg} ${conf.color}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${conf.dot}`} />
            <span>{t('chat.policyMatch')}: {t(`chat.confidence.${msg.confidence}`)}</span>
            <div className="w-16 h-1 bg-white rounded-full overflow-hidden flex-shrink-0">
              <div className={`h-full rounded-full ${conf.dot} ${conf.bar}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty state with suggested questions + categories ────────────────────────

function EmptyState({ onSend }) {
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState(null)

  const catData = activeCategory ? CATEGORIES.find(c => c.key === activeCategory) : null
  const questions = catData ? catData.questions : SUGGESTED_QUESTIONS

  return (
    <div className="flex flex-col items-center justify-start pt-8 px-2 gap-8">
      {/* Hero */}
      <div className="text-center">
        <div className="text-5xl mb-3">⚖️</div>
        <h2 className="text-lg font-semibold text-navy mb-1">{t('chat.title')}</h2>
        <p className="text-sm text-gray-400 max-w-sm">{t('chat.subtitle')}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
          <span>📄</span>
          {t('chat.disclaimer')}
        </div>
      </div>

      {/* Category chips */}
      <div className="w-full max-w-lg">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 text-center">
          {t('chat.categories.label')}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeCategory === cat.key
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
              }`}
            >
              <span>{cat.icon}</span>
              {t(`chat.categories.${cat.key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested questions */}
      <div className="w-full max-w-lg">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 text-center">
          {t('chat.suggestedQuestions')}
        </p>
        <div className="flex flex-col gap-2">
          {questions.map(q => (
            <button
              key={q}
              onClick={() => onSend(q)}
              className="w-full text-left text-sm text-gray-700 bg-white border border-gray-100 hover:border-navy hover:text-navy hover:shadow-sm rounded-xl px-4 py-3 transition-all flex items-center justify-between group"
            >
              <span>{q}</span>
              <span className="text-gray-300 group-hover:text-navy transition-colors flex-shrink-0 ml-2">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DEV_BYPASS = true

export default function IntegrityAdvisor() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || streaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      let token = null
      if (!DEV_BYPASS) {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
      }

      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      })

      if (!response.ok) throw new Error('Request failed')

      const newSessionId = response.headers.get('x-session-id')
      if (newSessionId && !sessionId) setSessionId(newSessionId)

      const sourcesRaw = response.headers.get('x-sources-detail')
      const sourcesDetail = sourcesRaw ? JSON.parse(sourcesRaw) : []
      const confidence = response.headers.get('x-confidence') || 'Low'

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.corrected) {
              accumulated = parsed.corrected
            } else if (parsed.content) {
              accumulated += parsed.content
            }
            setMessages(prev =>
              prev.map((m, i) => i === prev.length - 1 ? { ...m, content: accumulated } : m)
            )
          } catch {}
        }
      }

      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, streaming: false, sourcesDetail, confidence }
            : m
        )
      )
    } catch {
      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: t('common.error'), streaming: false }
            : m
        )
      )
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewChat = () => {
    setMessages([])
    setSessionId(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-navy leading-tight">{t('chat.title')}</h1>
            <p className="text-xs text-gray-400">{t('chat.disclaimer')}</p>
          </div>
        </div>
        <button
          onClick={startNewChat}
          className="text-sm text-accent hover:text-accent-dark font-medium border border-gray-200 hover:border-accent rounded-lg px-3 py-1.5 transition-colors"
        >
          + {t('chat.newChat')}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onSend={sendMessage} />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            className="input-field flex-1 resize-none max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' }}
            disabled={streaming}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="self-end"
          >
            {streaming ? <Spinner size="sm" /> : t('chat.send')}
          </Button>
        </div>
      </div>
    </div>
  )
}
