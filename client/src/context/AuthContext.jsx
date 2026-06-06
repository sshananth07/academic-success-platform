import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import api from '../services/api'

const AuthContext = createContext(null)

const DEV_BYPASS = true

const DEV_USER = {
  id: 'dev-user',
  email: 'dev@student.uam.edu.my',
  name: 'Dev User',
  faculty: 'Faculty of Computer Science',
  role: 'STUDENT',
  language_pref: 'en',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_BYPASS ? DEV_USER : null)
  const [loading, setLoading] = useState(DEV_BYPASS ? false : true)

  const fetchProfile = useCallback(async (token) => {
    try {
      const { data } = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (DEV_BYPASS) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.access_token)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.access_token)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[Auth] Login failed:', error.message, error)
      throw error
    }
    console.log('[Auth] Login success:', data.user?.email)
    return data.user
  }, [])

  const register = useCallback(async ({ email, password, name, faculty }) => {
    console.log('[Auth] Attempting signup with Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('[Auth] Supabase signup failed:', error.message, error)
      throw error
    }
    if (!data.session) {
      console.error('[Auth] No session returned — email confirmation may be required')
      throw new Error('Email confirmation required. Please disable "Confirm email" in Supabase Auth settings.')
    }
    console.log('[Auth] Supabase signup success, creating profile...')
    const { data: profile } = await api.post(
      '/api/auth/profile',
      { email, name, faculty },
      { headers: { Authorization: `Bearer ${data.session.access_token}` } }
    )
    console.log('[Auth] Profile created:', profile)
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(async () => {
    if (DEV_BYPASS) return
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
