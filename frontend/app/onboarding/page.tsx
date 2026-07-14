'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Settings2, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  HelpCircle,
  Mail,
  Calendar,
  Layers,
  MessageSquare,
  Network,
  Database,
  Plug,
  Lock
} from 'lucide-react'

const PROVIDER_METADATA: Record<string, { name: string; defaultModel: string; models: string[]; placeholder: string; keyPrefix: string }> = {
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    placeholder: 'sk-...',
    keyPrefix: 'sk-'
  },
  anthropic: {
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-5-sonnet',
    models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    placeholder: 'sk-ant-...',
    keyPrefix: 'sk-ant-'
  },
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-1.5-pro',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    placeholder: 'AIzaSy...',
    keyPrefix: 'AIzaSy'
  },
  openrouter: {
    name: 'OpenRouter',
    defaultModel: 'meta-llama/llama-3-70b-instruct',
    models: ['meta-llama/llama-3-70b-instruct', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-flash-1.5'],
    placeholder: 'sk-or-...',
    keyPrefix: 'sk-or-'
  },
  ollama: {
    name: 'Ollama (Local LLM)',
    defaultModel: 'llama3',
    models: ['llama3', 'mistral', 'phi3', 'gemma'],
    placeholder: 'http://localhost:11434',
    keyPrefix: 'http'
  }
}

export default function OnboardingPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [usageMode, setUsageMode] = useState<'ai' | 'manual' | null>(null)
  
  // AI Provider config states
  const [selectedProvider, setSelectedProvider] = useState<string>('openai')
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null)

  // Integrations states
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    gmail: true,
    calendar: false,
    drive: false,
    whatsapp: false,
    slack: false,
    crm: false,
    database: false,
    custom_api: false
  })

  // Watch for provider change to update default model and clear keys/status
  useEffect(() => {
    const meta = PROVIDER_METADATA[selectedProvider]
    if (meta) {
      setSelectedModel(meta.defaultModel)
      setApiKey('')
      setTestResult(null)
    }
  }, [selectedProvider])

  // Redirect if already logged in and onboarding is completed
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
      return
    }
    
    if (token) {
      api.getMyBusiness(token).then((biz: any) => {
        if (biz.onboarding_completed) {
          router.replace('/dashboard')
        }
      }).catch(err => {
        console.error('Failed checking onboarding state:', err)
      })
    }
  }, [user, token, loading, router])

  const handleChooseManualMode = async () => {
    if (!token) return
    try {
      await api.updateMyBusiness({ onboarding_completed: true }, token)
      router.push('/dashboard')
    } catch (err) {
      console.error('Error completing manual onboarding', err)
    }
  }

  const handleTestConnection = async () => {
    if (!token || !apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.testProviderConnection({
        provider_name: selectedProvider,
        api_key: apiKey,
        model_name: selectedModel
      }, token)
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error occurred.' })
    } finally {
      setTesting(false)
    }
  }

  const handleConnectProvider = async () => {
    if (!token || !apiKey.trim()) return
    setConnecting(true)
    try {
      const res = await api.connectProvider({
        provider_name: selectedProvider,
        api_key: apiKey,
        default_model: selectedModel,
        is_active: true,
        is_default: true
      }, token)
      if (res.id) {
        setConnectedProvider(selectedProvider)
        setStep(3) // Advance to integrations
      }
    } catch (err) {
      console.error('Failed saving provider:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleToggleIntegration = (name: string) => {
    setIntegrations(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const handleFinishSetup = async () => {
    if (!token) return
    try {
      await api.updateMyBusiness({ onboarding_completed: true }, token)
      router.push('/dashboard')
    } catch (err) {
      console.error('Error finishing setup:', err)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center p-4">
      {/* Onboarding Wizard Card Container */}
      <Card className="w-full max-w-xl bg-zinc-950 border-zinc-800/80 shadow-2xl relative overflow-hidden p-6 md:p-8 space-y-6">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        {/* Header Progress indicator */}
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-4">
          <span>Agentra Onboarding</span>
          <div className="flex gap-1">
            <span className={`h-1.5 w-6 rounded ${step >= 1 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
            <span className={`h-1.5 w-6 rounded ${step >= 2 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
            <span className={`h-1.5 w-6 rounded ${step >= 3 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
          </div>
        </div>

        {/* STEP 1: WELCOME & CHOOSE MODE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
                <Sparkles size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to Agentra</h2>
              <p className="text-sm text-zinc-400">Configure your business workforce operating model workspace.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div 
                onClick={() => setUsageMode('ai')}
                className={`border rounded-xl p-5 cursor-pointer transition-all duration-200 space-y-3 relative flex flex-col justify-between ${
                  usageMode === 'ai' 
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/50' 
                    : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">Option 1</span>
                    <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[9px]">RECOMMENDED</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">🤖 AI Mode</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Connect your own API key to delegate work and provision autonomous AI Employees.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setUsageMode('manual')}
                className={`border rounded-xl p-5 cursor-pointer transition-all duration-200 space-y-3 relative flex flex-col justify-between ${
                  usageMode === 'manual' 
                    ? 'border-zinc-500 bg-zinc-500/5 ring-1 ring-zinc-500/50' 
                    : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <span className="text-xs font-mono text-zinc-500 font-semibold uppercase tracking-wider">Option 2</span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">📊 Manual Mode</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Skip AI providers connections and configure business tools manually.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                disabled={!usageMode}
                onClick={usageMode === 'ai' ? () => setStep(2) : handleChooseManualMode}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/25"
              >
                Continue <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CONNECT AI PROVIDER */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Settings2 className="text-blue-400" size={18} /> Connect AI Provider
              </h2>
              <p className="text-xs text-zinc-400">Agentra is LLM-agnostic. Bring your own keys to handle AI cost directly.</p>
            </div>

            <div className="grid grid-cols-5 gap-2 border-b border-zinc-900 pb-4">
              {Object.keys(PROVIDER_METADATA).map(p => {
                const isSelected = selectedProvider === p
                return (
                  <div
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`border rounded-lg p-2 text-center text-[10px] font-mono cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/5 text-blue-400 font-semibold' 
                        : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {PROVIDER_METADATA[p].name.split(' ')[0]}
                  </div>
                )
              })}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                  {selectedProvider === 'ollama' ? 'LOCAL ENDPOINT URL' : 'API KEY'}
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={PROVIDER_METADATA[selectedProvider]?.placeholder}
                    className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-650 focus-visible:ring-blue-500 pr-9"
                  />
                  <div className="absolute right-3 top-2.5 text-zinc-600">
                    <Lock size={14} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">DEFAULT MODEL</label>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg h-9 px-3 outline-none focus:border-zinc-750"
                >
                  {PROVIDER_METADATA[selectedProvider]?.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {testResult && (
                <div className={`border rounded-lg p-3 flex gap-2 items-start text-xs ${
                  testResult.success 
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' 
                    : 'border-red-500/30 bg-red-500/5 text-red-400'
                }`}>
                  {testResult.success ? <Check size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={testing || !apiKey.trim()}
                  onClick={handleTestConnection}
                  className="flex-1 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer text-xs h-9 disabled:opacity-50"
                >
                  {testing ? 'Testing connection...' : 'Test Connection'}
                </Button>
                <Button
                  type="button"
                  disabled={connecting || !apiKey.trim()}
                  onClick={handleConnectProvider}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer text-xs h-9 disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect Provider'}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft size={12} /> Back
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: WORKSPACE INTEGRATIONS */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Plug className="text-blue-400" size={18} /> Enable Workspace Integrations
              </h2>
              <p className="text-xs text-zinc-400">Select which workspace tools your AI Employees can leverage.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-1">
              {[
                { id: 'gmail', name: 'Gmail', icon: Mail, desc: 'Sync mail notifications.' },
                { id: 'calendar', name: 'Google Calendar', icon: Calendar, desc: 'Schedule booking events.' },
                { id: 'drive', name: 'Google Drive', icon: Database, desc: 'Store processed reports.' },
                { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, desc: 'Alert customer channels.' },
                { id: 'slack', name: 'Slack', icon: MessageSquare, desc: 'Coordinate team notifications.' },
                { id: 'crm', name: 'CRM Sheets', icon: Layers, desc: 'Sync client databases.' },
                { id: 'database', name: 'SQL Database', icon: Database, desc: 'Query transaction SKUs.' },
                { id: 'custom_api', name: 'Custom REST API', icon: Network, desc: 'Integrate custom endpoints.' }
              ].map(item => {
                const active = integrations[item.id]
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleIntegration(item.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-150 flex gap-3 items-start select-none ${
                      active 
                        ? 'border-blue-500/50 bg-blue-500/5' 
                        : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border ${
                      active 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-400'
                    }`}>
                      <item.icon size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold ${active ? 'text-white' : 'text-zinc-400'}`}>{item.name}</h4>
                      <p className="text-[10px] text-zinc-500 leading-tight">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft size={12} /> Back
              </Button>
              <Button
                onClick={handleFinishSetup}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1.5 text-xs shadow-lg shadow-blue-500/25"
              >
                Finish Setup <Check size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
