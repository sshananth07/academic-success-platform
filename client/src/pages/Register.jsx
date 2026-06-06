import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export default function Register() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', faculty: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ ...form, faculty: form.faculty || undefined })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center font-bold text-white text-lg mx-auto mb-4">AI</div>
          <h1 className="text-2xl font-serif text-navy">{t('auth.register.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('auth.register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.name')}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Muhammad Amir bin Abdullah"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.email')}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="you@student.uam.edu.my"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.faculty')}</label>
            <input
              type="text"
              value={form.faculty}
              onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))}
              className="input-field"
              placeholder="e.g. Faculty of Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.password')}</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-field"
              placeholder="Minimum 8 characters"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full justify-center">
            {t('auth.register.button')}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.register.hasAccount')}{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            {t('auth.register.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
