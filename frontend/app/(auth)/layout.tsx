'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [copied, setCopied] = useState(false)
  const [terminalLine, setTerminalLine] = useState(0)
  
  type OsTab = 'powershell' | 'cmd' | 'macos' | 'linux'
  const [selectedTab, setSelectedTab] = useState<OsTab>('powershell')
  const [isPublished, setIsPublished] = useState(false)

  const [cliExists, setCliExists] = useState(false)

  // OS detection, NPM registry check, and CLI existence check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const platform = window.navigator.platform.toLowerCase();
      if (platform.indexOf('win') !== -1 || ua.indexOf('windows') !== -1) {
        setSelectedTab('powershell');
      } else if (platform.indexOf('mac') !== -1 || ua.indexOf('mac') !== -1) {
        setSelectedTab('macos');
      } else if (platform.indexOf('linux') !== -1 || ua.indexOf('linux') !== -1) {
        setSelectedTab('linux');
      }
    }

    fetch('https://registry.npmjs.org/@agentra-a/cli/latest')
      .then(res => {
        if (res.status === 200) {
          setIsPublished(true);
        }
      })
      .catch(() => {});

    fetch('/api/cli-status')
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          setCliExists(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Simulation typing ticks
  useEffect(() => {
    const timer1 = setTimeout(() => setTerminalLine(1), 1000)
    const timer2 = setTimeout(() => setTerminalLine(2), 2200)
    const timer3 = setTimeout(() => setTerminalLine(3), 3200)
    const timer4 = setTimeout(() => setTerminalLine(4), 4500)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  const getCommandText = (): string => {
    if (isPublished) {
      return 'npx @agentra-a/cli@latest';
    }
    switch (selectedTab) {
      case 'powershell':
        return 'cd agentra-cli\nnpm install\nnpm run build\nnpm link\nagentra';
      case 'cmd':
        return 'cd agentra-cli && npm install && npm run build && npm link && agentra';
      case 'macos':
      case 'linux':
      default:
        return 'cd agentra-cli && npm install && npm run build && npm link && agentra';
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getCommandText());
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#050507] text-zinc-100 selection:bg-blue-600/30 overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Authentic Login Card */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight text-white mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center text-xs text-white font-bold">A</div>
              <span className="font-mono uppercase tracking-wider text-sm">Agentra</span>
            </Link>
            <p className="text-xs text-zinc-400">Generative AI as a Service Platform</p>
          </div>
          
          <div className="border border-zinc-900 bg-zinc-950/40 backdrop-blur-xl px-6 py-8 sm:px-8 sm:py-10 rounded-2xl shadow-2xl">
            {children}
          </div>
        </div>

        {/* Right Column: Install Agentra CLI Section */}
        <div className="lg:col-span-7 space-y-6 text-left hidden lg:block">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-500/25 bg-blue-500/5 text-blue-450 text-[9px] font-mono uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Terminal Mode
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Install Agentra CLI</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
              Run and orchestrate your autonomous AI Employees directly from your developer console in one command.
            </p>
          </div>

          {/* Premium Paperclip styled Terminal Mockup */}
          <div className="border border-zinc-800/80 bg-zinc-950/70 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3 bg-zinc-950/40">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-850" />
                <span className="h-2 w-2 rounded-full bg-zinc-850" />
                <span className="h-2 w-2 rounded-full bg-zinc-850" />
              </div>
              {/* Tabs */}
              {(cliExists || isPublished) && (
                <div className="flex bg-zinc-900/60 border border-zinc-850 p-0.5 rounded-lg text-[9px] font-mono text-zinc-400 gap-1 select-none">
                  {(['powershell', 'cmd', 'macos', 'linux'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer capitalize font-semibold ${
                        selectedTab === tab 
                          ? 'bg-zinc-950 text-white shadow border border-zinc-850' 
                          : 'text-zinc-550 hover:text-zinc-300'
                      }`}
                    >
                      {tab === 'powershell' ? 'PowerShell' : tab === 'cmd' ? 'CMD' : tab === 'macos' ? 'macOS' : 'Linux'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Terminal screen */}
            <div className="p-5 font-mono text-xs text-zinc-300 space-y-2.5 min-h-[180px] bg-zinc-950/20">
              {(!cliExists && !isPublished) ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-center space-y-2 select-none">
                  <div className="text-zinc-600 animate-pulse text-lg font-bold tracking-widest uppercase">Coming Soon</div>
                  <p className="text-[10px] text-zinc-500 max-w-[220px] leading-relaxed">
                    The Agentra CLI is currently in early preview. Check back soon for public releases!
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-zinc-550 border-b border-zinc-900 pb-2">
                    <span>Console Session</span>
                    <span className="uppercase">{selectedTab === 'powershell' ? 'powershell' : selectedTab === 'cmd' ? 'cmd' : 'bash'}</span>
                  </div>

                  {/* Typing Line 1 */}
                  <div className="flex justify-between items-start group">
                    <div className="flex flex-col gap-1.5 flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-zinc-555 font-mono text-[9px] uppercase border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900 font-bold">
                          {isPublished ? 'NPM Registry' : 'Local Development'}
                        </span>
                      </div>
                      {isPublished ? (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500 font-semibold">$</span>
                          <span className="text-white font-semibold">npx @agentra-a/cli@latest</span>
                        </div>
                      ) : selectedTab === 'powershell' ? (
                        <div className="space-y-1 font-mono text-xs text-left">
                          <div><span className="text-blue-500">$</span> <span className="text-white font-semibold">cd agentra-cli</span></div>
                          <div><span className="text-blue-500">$</span> <span className="text-white font-semibold">npm install</span></div>
                          <div><span className="text-blue-500">$</span> <span className="text-white font-semibold">npm run build</span></div>
                          <div><span className="text-blue-500">$</span> <span className="text-white font-semibold">npm link</span></div>
                          <div><span className="text-blue-500">$</span> <span className="text-white font-semibold">agentra</span></div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-left">
                          <span className="text-blue-500 mt-0.5">$</span>
                          <span className="text-white font-semibold break-all leading-relaxed">{getCommandText()}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="p-1.5 rounded border border-zinc-850 bg-zinc-900/60 hover:text-white text-zinc-400 hover:bg-zinc-850 transition-all cursor-pointer self-start"
                      title="Copy installation command"
                    >
                      {copied ? (
                        <span className="text-[10px] text-emerald-400 px-1 font-sans">Copied!</span>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Trigger Typing Sequence Lines */}
                  {terminalLine >= 1 && (
                    <div className="text-zinc-500">
                      Installing packages... <span className="text-blue-400 animate-pulse">ora spinner</span>
                    </div>
                  )}

                  {terminalLine >= 2 && (
                    <div className="text-emerald-400">
                      ✔ Installed dependencies (Commander, Inquirer, Chalk, Axios).
                    </div>
                  )}

                  {terminalLine >= 3 && (
                    <div className="text-zinc-300">
                      <span className="text-blue-500">$</span> <span className="text-white font-semibold">agentra login</span>
                    </div>
                  )}

                  {terminalLine >= 4 && (
                    <div className="space-y-1">
                      <div className="text-emerald-400">✔ Credentials verified dynamically.</div>
                      <div className="text-white font-bold mt-1">Welcome to Agentra CLI</div>
                      <div className="text-zinc-450 text-[11px]">
                        Connected Workspace: <span className="text-blue-400 font-semibold">My GaaS Business</span><br />
                        AI Employees Ready: <span className="text-blue-400 font-semibold">8 Agents</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
