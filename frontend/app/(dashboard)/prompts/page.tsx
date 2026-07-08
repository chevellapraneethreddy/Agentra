'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Trash, 
  Copy, 
  FileText, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Archive, 
  Sparkles, 
  Cpu, 
  Layers, 
  Play, 
  Search, 
  ListFilter,
  Check
} from 'lucide-react'

const CATEGORIES = ['operations', 'marketing', 'sales', 'support', 'hr', 'finance', 'custom']
const AVAILABLE_TOOLS = ['gmail', 'calendar', 'drive', 'slack', 'whatsapp', 'crm', 'sheets']

export default function PromptStudioPage() {
  const { token } = useAuth()
  const [prompts, setPrompts] = useState<any[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Form states
  const [formOpen, setFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'custom',
    system_prompt: '',
    goal: '',
    rules: '', // newline separated in form
    output_format: '',
    memory_enabled: true,
    knowledge_enabled: true,
    enabled_tools: [] as string[],
    version: '1.0.0',
    status: 'draft'
  })

  const loadPrompts = async (selectFirst = false) => {
    if (!token) return
    try {
      setLoading(true)
      const data = await api.getPrompts(token)
      setPrompts(data)
      if (selectFirst && data.length > 0) {
        setSelectedPrompt(data[0])
      } else if (selectedPrompt) {
        const updated = data.find((p: any) => p.id === selectedPrompt.id)
        if (updated) setSelectedPrompt(updated)
      }
    } catch (err) {
      console.error('Error fetching studio prompts', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrompts(true)
  }, [token])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.system_prompt.trim()) errors.system_prompt = 'System Prompt instruction is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOpenCreateForm = () => {
    setIsEditing(false)
    setFormData({
      id: '',
      name: '',
      description: '',
      category: 'custom',
      system_prompt: '',
      goal: '',
      rules: '',
      output_format: '',
      memory_enabled: true,
      knowledge_enabled: true,
      enabled_tools: [],
      version: '1.0.0',
      status: 'draft'
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const handleOpenEditForm = (prompt: any) => {
    setIsEditing(true)
    setFormData({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description || '',
      category: prompt.category,
      system_prompt: prompt.system_prompt,
      goal: prompt.goal || '',
      rules: Array.isArray(prompt.rules) ? prompt.rules.join('\n') : '',
      output_format: prompt.output_format || '',
      memory_enabled: prompt.memory_enabled,
      knowledge_enabled: prompt.knowledge_enabled,
      enabled_tools: Array.isArray(prompt.enabled_tools) ? prompt.enabled_tools : [],
      version: prompt.version,
      status: prompt.status
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !token) return

    const payload = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      system_prompt: formData.system_prompt,
      goal: formData.goal,
      rules: formData.rules.split('\n').map(r => r.trim()).filter(Boolean),
      output_format: formData.output_format,
      memory_enabled: formData.memory_enabled,
      knowledge_enabled: formData.knowledge_enabled,
      enabled_tools: formData.enabled_tools,
      version: formData.version,
      status: formData.status
    }

    try {
      if (isEditing) {
        const updated = await api.updatePrompt(formData.id, payload, token)
        setSelectedPrompt(updated)
      } else {
        const created = await api.createPrompt(payload, token)
        setSelectedPrompt(created)
      }
      await loadPrompts()
      setFormOpen(false)
    } catch (err) {
      console.error('Error saving prompt', err)
    }
  }

  const handleUpdateStatus = async (promptId: string, status: 'draft' | 'published' | 'archived') => {
    if (!token) return
    try {
      const updated = await api.updatePrompt(promptId, { status }, token)
      setSelectedPrompt(updated)
      await loadPrompts()
    } catch (err) {
      console.error(`Error updating prompt status to ${status}`, err)
    }
  }

  const handleDuplicatePrompt = async (promptId: string) => {
    if (!token) return
    try {
      const duplicated = await api.duplicatePrompt(promptId, token)
      setSelectedPrompt(duplicated)
      await loadPrompts()
    } catch (err) {
      console.error('Error duplicating prompt', err)
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    if (!token || !confirm('Are you sure you want to permanently delete this prompt template?')) return
    try {
      await api.deletePrompt(promptId, token)
      setSelectedPrompt(null)
      await loadPrompts(true)
    } catch (err) {
      console.error('Error deleting prompt', err)
    }
  }

  const handleToolToggle = (tool: string) => {
    setFormData(prev => {
      const list = prev.enabled_tools.includes(tool)
        ? prev.enabled_tools.filter(t => t !== tool)
        : [...prev.enabled_tools, tool]
      return { ...prev, enabled_tools: list }
    })
  }

  // Filter logic
  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  // Styling helpers
  const getCategoryBadge = (category: string) => {
    switch (category.toLowerCase()) {
      case 'operations':
        return <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono text-[10px]">Operations</Badge>
      case 'marketing':
        return <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-400 font-mono text-[10px]">Marketing</Badge>
      case 'sales':
        return <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 font-mono text-[10px]">Sales</Badge>
      case 'support':
        return <Badge className="bg-pink-500/10 border-pink-500/30 text-pink-400 font-mono text-[10px]">Support</Badge>
      case 'hr':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono text-[10px]">HR</Badge>
      case 'finance':
        return <Badge className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-mono text-[10px]">Finance</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono text-[10px]">Custom</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono text-[10px] flex items-center gap-1"><CheckCircle2 size={10} /> published</Badge>
      case 'archived':
        return <Badge className="bg-zinc-800 border-zinc-700 text-zinc-400 font-mono text-[10px] flex items-center gap-1"><Archive size={10} /> archived</Badge>
      default:
        return <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 font-mono text-[10px] flex items-center gap-1"><FileText size={10} /> draft</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-2">
            <Sparkles className="text-blue-400" size={24} /> Prompt Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Design, test, version, and orchestrate agent-specific system prompts.</p>
        </div>
        <Button
          onClick={handleOpenCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 self-start cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} />
          Create Prompt
        </Button>
      </div>

      {/* Main Split Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left column: List */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900/40 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus-visible:ring-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-xs rounded px-3 outline-none focus:border-zinc-700"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
            {loading && prompts.length === 0 ? (
              <div className="py-16 text-center">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/5">
                No prompt templates found.
              </div>
            ) : (
              filteredPrompts.map(prompt => (
                <Card
                  key={prompt.id}
                  onClick={() => setSelectedPrompt(prompt)}
                  className={`bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl hover:border-zinc-700 transition-all duration-200 cursor-pointer ${
                    selectedPrompt?.id === prompt.id ? 'ring-1 ring-blue-500/50 border-zinc-700 bg-zinc-900/40' : ''
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-white truncate max-w-[170px] leading-tight">{prompt.name}</h3>
                      {getStatusBadge(prompt.status)}
                    </div>
                    
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {prompt.description || 'No description provided.'}
                    </p>

                    <div className="flex justify-between items-center border-t border-zinc-800/60 pt-2.5 mt-1 text-[10px] text-zinc-500 font-mono">
                      <div className="flex gap-2">
                        {getCategoryBadge(prompt.category)}
                        <span className="text-zinc-400">v{prompt.version}</span>
                      </div>
                      <span className="text-zinc-500 font-sans">
                        {prompt.updated_at ? new Date(prompt.updated_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Display workspace panel */}
        <div className="md:col-span-2">
          {selectedPrompt ? (
            <Card className="bg-zinc-950 border-zinc-800/80 flex flex-col h-[76h] shadow-2xl relative">
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent pointer-events-none" />
              
              <CardHeader className="border-b border-zinc-800/80 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-white text-base leading-tight">{selectedPrompt.name}</CardTitle>
                      {getCategoryBadge(selectedPrompt.category)}
                      {getStatusBadge(selectedPrompt.status)}
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">v{selectedPrompt.version}</span>
                    </div>
                    <CardDescription className="text-zinc-400 text-xs">
                      {selectedPrompt.description || 'No description configured.'}
                    </CardDescription>
                  </div>

                  {/* Actions Header bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditForm(selectedPrompt)}
                      className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs h-8 cursor-pointer"
                    >
                      <Edit3 size={12} className="mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicatePrompt(selectedPrompt.id)}
                      className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs h-8 cursor-pointer"
                    >
                      <Copy size={12} className="mr-1" /> Duplicate
                    </Button>
                    
                    {selectedPrompt.status !== 'published' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedPrompt.id, 'published')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer"
                      >
                        <CheckCircle2 size={12} className="mr-1" /> Publish
                      </Button>
                    )}

                    {selectedPrompt.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedPrompt.id, 'archived')}
                        className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs h-8 cursor-pointer"
                      >
                        <Archive size={12} className="mr-1" /> Archive
                      </Button>
                    )}

                    {selectedPrompt.status === 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedPrompt.id, 'draft')}
                        className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs h-8 cursor-pointer"
                      >
                        <FileText size={12} className="mr-1" /> Set Draft
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePrompt(selectedPrompt.id)}
                      className="border-zinc-800 text-red-400 hover:text-white hover:bg-red-900/20 text-xs h-8 cursor-pointer"
                    >
                      <Trash size={12} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col">
                <Tabs defaultValue="instructions" className="flex-1 flex flex-col">
                  <div className="border-b border-zinc-800/60 bg-zinc-950 px-4">
                    <TabsList className="bg-transparent border-none p-0 flex gap-2 h-10">
                      <TabsTrigger 
                        value="instructions" 
                        className="data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 border-b-2 border-transparent data-[state=active]:border-blue-500 rounded-none h-10 px-2 text-xs font-medium cursor-pointer"
                      >
                        Instructions & Goals
                      </TabsTrigger>
                      <TabsTrigger 
                        value="system" 
                        className="data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 border-b-2 border-transparent data-[state=active]:border-blue-500 rounded-none h-10 px-2 text-xs font-medium cursor-pointer"
                      >
                        System Instructions
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings" 
                        className="data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 border-b-2 border-transparent data-[state=active]:border-blue-500 rounded-none h-10 px-2 text-xs font-medium cursor-pointer"
                      >
                        Settings & Tools
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-zinc-950/20 text-zinc-300">
                    
                    <TabsContent value="instructions" className="space-y-4 m-0 outline-none">
                      {selectedPrompt.goal && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ultimate Goal / Mission</h4>
                          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-3 text-sm text-zinc-200 leading-relaxed font-sans">
                            {selectedPrompt.goal}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Guardrails & Operational Rules</h4>
                        {Array.isArray(selectedPrompt.rules) && selectedPrompt.rules.length > 0 ? (
                          <ul className="space-y-2 pl-1">
                            {selectedPrompt.rules.map((rule: string, idx: number) => (
                              <li key={idx} className="flex gap-2.5 items-start text-xs text-zinc-300 leading-relaxed">
                                <span className="h-4 w-4 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-mono select-none flex-shrink-0 text-[9px] mt-0.5">{idx + 1}</span>
                                <span className="font-sans">{rule}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-zinc-500 italic pl-1">No execution rules declared.</p>
                        )}
                      </div>

                      {selectedPrompt.output_format && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Output Format / Constraints</h4>
                          <pre className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                            {selectedPrompt.output_format}
                          </pre>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="system" className="space-y-1.5 m-0 outline-none">
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base System Instructions</h4>
                      <pre className="bg-zinc-900/30 border border-zinc-800/80 rounded-lg p-4 text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                        {selectedPrompt.system_prompt}
                      </pre>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-5 m-0 outline-none">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="border border-zinc-800/80 rounded-lg p-3.5 bg-zinc-900/10 space-y-2">
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Layers size={14} className="text-blue-400" /> Conversational Memory
                          </h5>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Retrieve recent logs and messages context automatically to enable context retention.
                          </p>
                          <div className="pt-1.5">
                            {selectedPrompt.memory_enabled ? (
                              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">ENABLED</Badge>
                            ) : (
                              <Badge className="bg-zinc-800 border-zinc-700 text-zinc-500 font-mono text-[10px]">DISABLED</Badge>
                            )}
                          </div>
                        </div>

                        <div className="border border-zinc-800/80 rounded-lg p-3.5 bg-zinc-900/10 space-y-2">
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <FileText size={14} className="text-purple-400" /> RAG Knowledge base
                          </h5>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Search uploaded contract files, manuals, and FAQs dynamically to enrich instructions.
                          </p>
                          <div className="pt-1.5">
                            {selectedPrompt.knowledge_enabled ? (
                              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">ENABLED</Badge>
                            ) : (
                              <Badge className="bg-zinc-800 border-zinc-700 text-zinc-500 font-mono text-[10px]">DISABLED</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Authorized Workspace Tools</h4>
                        {Array.isArray(selectedPrompt.enabled_tools) && selectedPrompt.enabled_tools.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedPrompt.enabled_tools.map((tool: string) => (
                              <Badge key={tool} variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 font-mono text-[10px] px-2 py-1 flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                {tool.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 italic">No workspace integration tools mapped to this template.</p>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-dashed border-zinc-800/80 rounded-xl py-24 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2 bg-zinc-900/5">
              <FileText size={24} className="text-zinc-700" />
              <p>No prompt template selected.</p>
              <p className="text-[10px] text-zinc-600">Select an items template on the left to start configuring.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE & EDIT FORM DIALOG MODAL */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-850 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              {isEditing ? 'Update Prompt Template' : 'Configure New Prompt Template'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Provide constraints, system directives, goals, and connection integrations parameter values.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePrompt} className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-mono font-medium">NAME *</label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-650 focus-visible:ring-blue-500"
                  placeholder="Marketing Assistant preset"
                />
                {formErrors.name && <span className="text-[10px] text-red-400 font-mono">{formErrors.name}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-mono font-medium">CATEGORY</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg h-9 px-3 outline-none focus:border-zinc-700"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-mono font-medium">DESCRIPTION</label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-650 focus-visible:ring-blue-500"
                placeholder="Briefly describe template scope..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-mono font-medium">SYSTEM PROMPT / BASE DIRECTIVES *</label>
              <textarea
                value={formData.system_prompt}
                onChange={e => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                rows={4}
                className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-3 outline-none focus:border-zinc-700 font-mono"
                placeholder="You are a helpful AI business employee. Always comply with standard..."
              />
              {formErrors.system_prompt && <span className="text-[10px] text-red-400 font-mono">{formErrors.system_prompt}</span>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-mono font-medium">AGENT MISSION / GOAL</label>
                <textarea
                  value={formData.goal}
                  onChange={e => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                  rows={3}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-3 outline-none focus:border-zinc-700"
                  placeholder="Increase sales, answer client questions, etc..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-mono font-medium">GUARDRAILS & RULES (ONE PER LINE)</label>
                <textarea
                  value={formData.rules}
                  onChange={e => setFormData(prev => ({ ...prev, rules: e.target.value }))}
                  rows={3}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-3 outline-none focus:border-zinc-700"
                  placeholder="Do not offer discounts over 10%&#10;Never mention competitors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-mono font-medium">OUTPUT FORMAT SPECIFICATIONS</label>
              <Input
                value={formData.output_format}
                onChange={e => setFormData(prev => ({ ...prev, output_format: e.target.value }))}
                className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-650 focus-visible:ring-blue-500"
                placeholder="JSON dictionary with key 'decision', clean tabular formatting..."
              />
            </div>

            {/* Checkboxes parameters */}
            <div className="border border-zinc-800/80 rounded-lg p-4 bg-zinc-900/10 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Integration Connections & Parameters</h4>
              
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.memory_enabled}
                    onChange={e => setFormData(prev => ({ ...prev, memory_enabled: e.target.checked }))}
                    className="accent-blue-500 rounded border-zinc-800 bg-zinc-900 text-zinc-300 cursor-pointer h-4 w-4"
                  />
                  Enable Memory Manager
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.knowledge_enabled}
                    onChange={e => setFormData(prev => ({ ...prev, knowledge_enabled: e.target.checked }))}
                    className="accent-blue-500 rounded border-zinc-800 bg-zinc-900 text-zinc-300 cursor-pointer h-4 w-4"
                  />
                  Enable RAG Knowledge Base
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-zinc-400 font-mono font-semibold block">AUTHORIZED WORKSPACE INTEGRATION TOOLS</label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_TOOLS.map(tool => {
                    const isChecked = formData.enabled_tools.includes(tool)
                    return (
                      <div
                        key={tool}
                        onClick={() => handleToolToggle(tool)}
                        className={`border rounded-lg p-2 flex items-center justify-between text-xs cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'border-blue-500/50 bg-blue-500/5 text-blue-400' 
                            : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span>{tool.toUpperCase()}</span>
                        {isChecked && <Check size={12} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-mono font-medium">TEMPLATE VERSION</label>
                <Input
                  value={formData.version}
                  onChange={e => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-650 focus-visible:ring-blue-500"
                  placeholder="1.0.0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-mono font-medium">STATUS</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg h-9 px-3 outline-none focus:border-zinc-700"
                >
                  <option value="draft">DRAFT</option>
                  <option value="published">PUBLISHED</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-850 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <Save size={14} />
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
