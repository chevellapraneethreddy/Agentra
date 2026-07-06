'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
        <p className="text-sm text-zinc-400 mt-1">Sign in to manage your AI Employees</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/30 border border-red-800/40 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-300" htmlFor="email">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="bg-zinc-950/60 border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300" htmlFor="password">
              Password
            </label>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-zinc-950/60 border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-all duration-200 mt-2 shadow-lg shadow-blue-500/20"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying credentials...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="text-center text-xs text-zinc-400 mt-4">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-blue-400 hover:text-blue-300 hover:underline">
          Hire an AI Employee (Sign Up)
        </Link>
      </div>
      
      {/* Dev helper notice */}
      <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Sandbox Mode active by default. Enter any email and password to log in instantly.
        </p>
      </div>
    </div>
  )
}
