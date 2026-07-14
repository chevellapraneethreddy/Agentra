'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface User {
  id: string
  email: string
  fullName?: string
  profileImage?: string
  provider?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, running in local dev/sandbox mode.')
      // Check local storage for sandbox user
      const storedUser = localStorage.getItem('agentra_sandbox_user')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        setToken(`dev-token-${parsed.email}`)
      }
      setLoading(false)
      return
    }

    // Initialize real Supabase session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || '',
            profileImage: session.user.user_metadata?.avatar_url || '',
            provider: session.user.app_metadata?.provider || 'email',
          })
          setToken(session.access_token)
        }
      } catch (err) {
        console.error('Error fetching initial session:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || '',
          profileImage: session.user.user_metadata?.avatar_url || '',
          provider: session.user.app_metadata?.provider || 'email',
        })
        setToken(session.access_token)
      } else {
        setUser(null)
        setToken(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        // Dev Sandbox Auth Logic
        // Accept any email/password for sandbox ease
        const sandboxUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email,
          fullName: email.split('@')[0].toUpperCase(),
          profileImage: '',
          provider: 'email'
        }
        setUser(sandboxUser)
        setToken(`dev-token-${email}`)
        localStorage.setItem('agentra_sandbox_user', JSON.stringify(sandboxUser))
        router.push('/dashboard')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.session) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name || '',
          profileImage: data.user.user_metadata?.avatar_url || '',
          provider: data.user.app_metadata?.provider || 'email',
        })
        setToken(data.session.access_token)
        router.push('/dashboard')
      }
    } catch (error: any) {
      setLoading(false)
      throw new Error(error.message || 'Login failed')
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        // Dev Sandbox Google Login Simulation
        const sandboxUser = {
          id: 'dev-google-uuid-sandbox',
          email: 'google-user@agentra.ai',
          fullName: 'Google Dev Sandbox User',
          profileImage: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
          provider: 'google',
        }
        setUser(sandboxUser)
        setToken('dev-token-google-user@agentra.ai')
        localStorage.setItem('agentra_sandbox_user', JSON.stringify(sandboxUser))
        router.push('/dashboard')
        return
      }

      // Real Supabase Google Login
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setLoading(false)
      throw new Error(error.message || 'Google login failed')
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        const sandboxUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email,
          fullName,
          profileImage: '',
          provider: 'email'
        }
        setUser(sandboxUser)
        setToken(`dev-token-${email}`)
        localStorage.setItem('agentra_sandbox_user', JSON.stringify(sandboxUser))
        router.push('/dashboard')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) throw error

      if (data.session) {
        setUser({
          id: data.user?.id || '',
          email: data.user?.email || '',
          fullName,
          profileImage: data.user?.user_metadata?.avatar_url || '',
          provider: data.user?.app_metadata?.provider || 'email',
        })
        setToken(data.session.access_token)
        router.push('/dashboard')
      } else {
        // If email confirmation is required
        alert('Check your email for the confirmation link.')
        router.push('/login')
      }
    } catch (error: any) {
      setLoading(false)
      throw new Error(error.message || 'Signup failed')
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        setUser(null)
        setToken(null)
        localStorage.removeItem('agentra_sandbox_user')
        router.push('/login')
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setToken(null)
      router.push('/login')
    } catch (error: any) {
      console.error('Signout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
