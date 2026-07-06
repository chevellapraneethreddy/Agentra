'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading Agentra...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#09090b] px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 font-semibold text-xl tracking-tight text-white mb-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs text-white font-bold">A</div>
            <span>Agentra</span>
          </div>
          <p className="text-sm text-zinc-400">Generative AI as a Service</p>
        </div>
        
        <div className="border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl px-8 py-10 rounded-2xl shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}
