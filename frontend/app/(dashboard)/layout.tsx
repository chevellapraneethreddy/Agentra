'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Activity,
  Bot,
  Database,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Radio,
  Plug,
  Terminal,
  AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Tasks', href: '/tasks', icon: Activity },
  { name: 'AI Employee', href: '/employee', icon: Bot },
  { name: 'Prompt Studio', href: '/prompts', icon: Terminal },
  { name: 'Knowledge', href: '/knowledge', icon: Database },
  { name: 'Integrations', href: '/integrations', icon: Plug },
  { name: 'Automation', href: '/automation', icon: Radio },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'paused'>('idle')
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [hasProvider, setHasProvider] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // Fetch onboarding state and AI provider configuration status on mount
  useEffect(() => {
    if (!token || loading || !user) return
    const checkOnboardingAndProviders = async () => {
      try {
        const biz = await api.getMyBusiness(token)
        if (!biz.onboarding_completed) {
          router.replace('/onboarding')
          return
        }
        setOnboardingChecked(true)

        const providers = await api.getProviders(token)
        const active = providers.some((p: any) => p.is_active)
        setHasProvider(active)
      } catch (err) {
        console.error('Error verifying onboarding or provider configurations:', err)
        setOnboardingChecked(true) // Bypass on failures to avoid complete workspace blockages
      }
    }
    checkOnboardingAndProviders()
  }, [token, user, loading, router])

  // Fetch the agent status periodically
  useEffect(() => {
    if (!token || !onboardingChecked) return
    const fetchStatus = async () => {
      try {
        const list = await api.getEmployees(token)
        const ops = list.find((e: any) => e.name === 'Operations Employee') || list[0]
        setAgentStatus(ops?.status || 'idle')
      } catch (err) {
        console.error('Failed to load agent status in layout', err)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [token, onboardingChecked])

  if (loading || !user || !onboardingChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: 'idle' | 'running' | 'paused') => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'paused':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }
  }

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100 selection:bg-blue-600/30 selection:text-white">
      {/* Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md transition-all duration-300 relative ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 min-w-[32px] rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs text-white font-bold shadow-lg shadow-blue-600/20">
              A
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight text-white animate-in fade-in duration-300">
                Agentra
              </span>
            )}
          </div>
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all absolute -right-3 top-4 z-20"
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600/10 border border-blue-500/20 text-white shadow-sm shadow-blue-600/5'
                    : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors ${
                    isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-zinc-950/40">
          {!sidebarCollapsed && (
            <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Radio size={12} className={agentStatus === 'running' ? 'animate-pulse text-emerald-400' : 'text-zinc-500'} />
                <span>Operations Agent</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(agentStatus)}`}>
                  {agentStatus}
                </span>
                <Link href="/employee" className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline">
                  Configure
                </Link>
              </div>
            </div>
          )}
          
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all border border-transparent"
          >
            <LogOut size={18} className="text-red-400" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile Sliding Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full animate-in slide-in-from-left duration-300">
            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs text-white font-bold shadow-lg shadow-blue-600/20">
                  A
                </div>
                <span className="font-bold text-lg tracking-tight text-white">Agentra</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X size={16} />
              </button>
            </div>
            
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/10 border border-blue-500/20 text-white'
                        : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-400' : 'text-zinc-500'} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            
            <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-zinc-950/40">
              <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Radio size={12} className={agentStatus === 'running' ? 'animate-pulse text-emerald-400' : 'text-zinc-500'} />
                  <span>Operations Agent</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(agentStatus)}`}>
                    {agentStatus}
                  </span>
                </div>
              </div>
              
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all border border-transparent"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <Menu size={18} />
            </button>
            
            <h1 className="text-sm md:text-base font-semibold tracking-tight text-white capitalize">
              {pathname.substring(1).replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>

          {/* Top Header Controls */}
          <div className="flex items-center gap-4">
            {/* Live Agent Status Widget */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/40">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  agentStatus === 'running' ? 'bg-emerald-400' : agentStatus === 'paused' ? 'bg-amber-400' : 'bg-blue-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  agentStatus === 'running' ? 'bg-emerald-500' : agentStatus === 'paused' ? 'bg-amber-500' : 'bg-blue-500'
                }`}></span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium font-mono uppercase">
                OPS AGENT: {agentStatus}
              </span>
            </div>

            {/* Profile widget */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-2 border-l border-zinc-800 cursor-pointer focus:outline-none select-none text-left"
              >
                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 overflow-hidden">
                  {user && user.profileImage ? (
                    <img src={user.profileImage} alt={user.fullName || 'User'} className="h-full w-full object-cover" />
                  ) : (
                    <User size={14} />
                  )}
                </div>
                {user && (
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {user.fullName || 'User Profile'}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </div>
                )}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl z-50 p-1 divide-y divide-zinc-900 font-sans text-xs">
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex w-full items-center px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex w-full items-center px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded transition-colors"
                    >
                      Account Settings
                    </Link>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center px-3 py-2 text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded transition-colors text-left font-medium cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic page contents nested inside scroll wrapper */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-b from-[#09090b] to-[#040405]">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {!hasProvider && (
              <div className="border border-amber-500/30 bg-amber-500/5 text-amber-400 p-3.5 rounded-lg flex items-center justify-between text-xs font-sans gap-4 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Connect an AI Provider to enable AI Employees.</span>
                </div>
                <Link href="/settings" className="font-semibold underline hover:text-amber-300">
                  Settings &rarr;
                </Link>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
