'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Brain, User, Tag, Truck, Layers, Users, BarChart3, Trash2, ShieldAlert, Play, Pause, PowerOff, UserPlus, Clock, Zap, DollarSign, Settings, ListTodo, Plus } from 'lucide-react'

interface EmployeeType {
  id: string
  name: string
  role: string
  goal: string
  status: string
  system_prompt: string
  temperature: number
  capabilities: string[]
  triggers: string[]
  permissions: string[]
  tools: string[]
  completed_tasks: number
  avg_response_time: number
  productivity_score: number
  business_impact: number
}

export default function EmployeePage() {
  const { token } = useAuth()
  
  // Data list
  const [employees, setEmployees] = useState<EmployeeType[]>([])
  const [memories, setMemories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMemories, setLoadingMemories] = useState(true)
  
  // Selection drawer
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeType | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [editGoal, setEditGoal] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  
  // Hiring Wizard states
  const [isHireOpen, setIsHireOpen] = useState(false)
  const [hireName, setHireName] = useState('')
  const [hireRole, setHireRole] = useState('')
  const [hireGoal, setHireGoal] = useState('')
  const [hirePrompt, setHirePrompt] = useState('')
  const [hireTools, setHireTools] = useState<string[]>([])
  const [hiring, setHiring] = useState(false)

  const loadData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await api.getEmployees(token)
      setEmployees(data)
    } catch (err) {
      console.error('Error fetching employees list', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMemories = async () => {
    if (!token) return
    try {
      setLoadingMemories(true)
      const data = await api.getMemories(token)
      setMemories(data)
    } catch (err) {
      console.error('Error loading memories', err)
    } finally {
      setLoadingMemories(false)
    }
  }

  useEffect(() => {
    loadData()
    loadMemories()
  }, [token])

  const handleToggleStatus = async (empId: string, currentStatus: string) => {
    if (!token) return
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      // Optimistic update
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status: nextStatus } : e))
      await api.updateEmployee(empId, { status: nextStatus }, token)
      await loadData()
    } catch (err) {
      console.error('Failed to toggle employee status', err)
    }
  }

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !hireName || !hireRole || !hireGoal || !hirePrompt) return
    setHiring(true)
    try {
      const payload = {
        name: hireName,
        role: hireRole,
        goal: hireGoal,
        system_prompt: hirePrompt,
        temperature: 0.15,
        tools: hireTools,
        permissions: ['send_alerts', 'read_inventory']
      }
      await api.hireEmployee(payload, token)
      setHireName('')
      setHireRole('')
      setHireGoal('')
      setHirePrompt('')
      setHireTools([])
      setIsHireOpen(false)
      await loadData()
      alert('AI Employee hired and provisioned successfully.')
    } catch (err: any) {
      alert(err.message || 'Hiring failed.')
    } finally {
      setHiring(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!token || !selectedEmployee) return
    setSavingConfig(true)
    try {
      const payload = {
        system_prompt: editPrompt,
        goal: editGoal
      }
      const updated = await api.updateEmployee(selectedEmployee.id, payload, token)
      setSelectedEmployee(updated)
      await loadData()
      alert('AI Employee instructions updated.')
    } catch (err) {
      console.error(err)
      alert('Failed to update config.')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleDecommission = async (empId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to decommission and terminate this AI Employee?')) return
    try {
      await api.terminateEmployee(empId, token)
      setIsDetailsOpen(false)
      setSelectedEmployee(null)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Termination failed.')
    }
  }

  const handleDeleteMemory = async (memoryId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to forget this operational memory?')) return
    try {
      await api.deleteMemory(memoryId, token)
      await loadMemories()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleToolSelection = (tool: string) => {
    setHireTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])
  }

  const getMemoryCategoryDetails = (category: string) => {
    switch (category.toLowerCase()) {
      case 'customer_preference':
        return { label: 'Customer Preference', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', icon: User }
      case 'product_trend':
        return { label: 'Product Trend', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', icon: Tag }
      case 'supplier_history':
        return { label: 'Supplier History', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: Truck }
      case 'inventory_trend':
        return { label: 'Inventory Trend', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: Layers }
      case 'workload':
        return { label: 'Employee Workload', color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', icon: Users }
      case 'business_pattern':
        return { label: 'Business Pattern', color: 'bg-pink-500/10 border-pink-500/30 text-pink-400', icon: BarChart3 }
      default:
        return { label: 'General', color: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400', icon: Brain }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'working':
      case 'running':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] font-mono">working</Badge>
      case 'paused':
        return <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px] font-mono">paused</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 text-[10px] font-mono">idle</Badge>
    }
  }

  // Filter memories matching selected employee details
  const filteredMemories = memories.filter(m => {
    if (!selectedEmployee) return false
    // Filter customer specific preference memories if matching key
    return true // For simple listing
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">AI Workspace Directory</h1>
          <p className="text-sm text-zinc-400 mt-1">Hire, configure prompts, and audit performance metrics of AI Employee presets.</p>
        </div>
        
        {/* Hire Wizard Trigger */}
        <Dialog open={isHireOpen} onOpenChange={setIsHireOpen}>
          <DialogTrigger className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer text-xs">
            <UserPlus size={14} />
            Hire AI Employee
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-base">Hire AI Employee</DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Configure role title, primary goal, system instructions, and tool access guidelines.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleHireSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Employee Name</label>
                  <Input
                    required
                    value={hireName}
                    onChange={(e) => setHireName(e.target.value)}
                    placeholder="Support Assistant"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Role Title</label>
                  <Input
                    required
                    value={hireRole}
                    onChange={(e) => setHireRole(e.target.value)}
                    placeholder="Client Care Representative"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-semibold">Primary Goal</label>
                <Input
                  required
                  value={hireGoal}
                  onChange={(e) => setHireGoal(e.target.value)}
                  placeholder="Resolve buyer ticketing issues and verify delivery status log histories."
                  className="bg-zinc-900 border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-semibold">System Prompts Instructions</label>
                <textarea
                  required
                  value={hirePrompt}
                  onChange={(e) => setHirePrompt(e.target.value)}
                  rows={4}
                  placeholder="You are Support Assistant. Resolve shipping ticketing issues, consult knowledge documents, and send Gmail tracking logs."
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white p-2.5 rounded-lg outline-none focus:border-blue-500 font-sans"
                />
              </div>

              {/* Tools Selection Checkboxes */}
              <div className="space-y-2 border-t border-zinc-900 pt-3">
                <label className="text-xs text-zinc-300 font-semibold">Grant Tools Access</label>
                <div className="grid grid-cols-3 gap-2">
                  {['slack', 'gmail', 'whatsapp', 'google_sheets', 'google_calendar'].map((t) => (
                    <div
                      key={t}
                      onClick={() => toggleToolSelection(t)}
                      className={`p-2 border rounded-lg cursor-pointer text-center text-[10px] font-bold capitalize transition-all select-none ${
                        hireTools.includes(t) ? 'bg-blue-600/15 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={hiring} className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4 text-xs font-semibold py-2.5">
                {hiring ? 'Deploying...' : 'Publish AI Employee to workspace'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-32 text-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between h-[360px]">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-white text-sm font-bold">{emp.name}</CardTitle>
                    <span className="text-[10px] font-semibold text-zinc-500">{emp.role}</span>
                  </div>
                  {getStatusBadge(emp.status)}
                </div>
                <CardDescription className="text-[11px] text-zinc-400 leading-normal pt-2 h-14 overflow-hidden text-ellipsis">
                  {emp.goal}
                </CardDescription>
              </CardHeader>

              {/* Metrics block */}
              <CardContent className="py-2 border-y border-zinc-900 bg-zinc-950/20 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <ListTodo size={14} className="text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Completed Tasks</span>
                    <span className="text-white font-mono font-bold">{emp.completed_tasks}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <Clock size={14} className="text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Response Time</span>
                    <span className="text-white font-mono font-bold">{emp.avg_response_time}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <Zap size={14} className="text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Efficiency Score</span>
                    <span className="text-white font-mono font-bold">{emp.productivity_score}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <DollarSign size={14} className="text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Business Impact</span>
                    <span className="text-white font-mono font-bold">${emp.business_impact.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>

              {/* Action buttons */}
              <CardContent className="pt-4 pb-4 px-6 flex justify-between items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEmployee(emp)
                    setEditPrompt(emp.system_prompt)
                    setEditGoal(emp.goal)
                    setIsDetailsOpen(true)
                  }}
                  className="bg-transparent border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-[10px] h-7 px-3 flex items-center gap-1"
                >
                  <Settings size={12} />
                  Configure
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleToggleStatus(emp.id, emp.status)}
                  className={`text-[10px] h-7 px-3 font-bold flex items-center gap-1 shadow cursor-pointer ${
                    emp.status === 'active'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {emp.status === 'active' ? (
                    <>
                      <Pause size={10} fill="currentColor" />
                      Pause Worker
                    </>
                  ) : (
                    <>
                      <Play size={10} fill="currentColor" />
                      Run Webhooks
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog displaying config & memories */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedEmployee && (
            <Tabs defaultValue="prompt" className="w-full">
              <DialogHeader className="border-b border-zinc-800 pb-4">
                <div className="flex items-start justify-between pr-4">
                  <div className="space-y-1">
                    <DialogTitle className="text-white text-base font-bold">{selectedEmployee.name}</DialogTitle>
                    <span className="text-[10px] font-semibold text-zinc-500">{selectedEmployee.role}</span>
                  </div>
                  <TabsList className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
                    <TabsTrigger value="prompt" className="text-[10px] px-3 py-1 font-semibold">System Instructions</TabsTrigger>
                    <TabsTrigger value="memories" className="text-[10px] px-3 py-1 font-semibold flex items-center gap-1">
                      <Brain size={10} className="text-blue-400" />
                      Learned Memories
                    </TabsTrigger>
                  </TabsList>
                </div>
              </DialogHeader>

              {/* Tab 1: System prompt editing */}
              <TabsContent value="prompt" className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Goal Description</label>
                  <Input
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-white text-xs font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Instructions Prompt Template</label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    rows={8}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white p-2.5 rounded-lg outline-none focus:border-blue-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Footer action buttons */}
                <div className="flex justify-between items-center border-t border-zinc-900 pt-3">
                  {selectedEmployee.name !== 'Operations Employee' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDecommission(selectedEmployee.id)}
                      className="hover:bg-red-950/20 text-red-400 hover:text-red-300 border border-transparent hover:border-red-900/30 flex items-center gap-1.5 text-xs h-9 cursor-pointer"
                    >
                      <PowerOff size={14} />
                      Decommission Worker
                    </Button>
                  ) : (
                    <span className="text-[10px] text-zinc-600">Preset Operations Employee can't be deleted.</span>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsDetailsOpen(false)}
                      className="bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-300 text-xs h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={savingConfig}
                      onClick={handleSaveDetails}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9"
                    >
                      {savingConfig ? 'Applying...' : 'Save Instructions'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Specific Employee Memories */}
              <TabsContent value="memories" className="space-y-4 pt-4">
                <div className="flex items-center gap-1.5 pb-2 text-xs">
                  <Brain size={14} className="text-blue-400 animate-pulse" />
                  <span className="text-zinc-300 font-semibold">Learned RAG memory logs for {selectedEmployee.name}</span>
                </div>

                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4 relative border-l border-zinc-800 pl-6 ml-4">
                  {filteredMemories.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-4 pl-1">AI Employee has not compiled reflection memories yet. Run webhook tasks to trigger learning.</p>
                  ) : (
                    filteredMemories.map((mem) => {
                      const details = getMemoryCategoryDetails(mem.category)
                      const CategoryIcon = details.icon
                      return (
                        <div key={mem.id} className="relative group">
                          <span className="absolute -left-[35px] top-1 bg-zinc-950 border border-zinc-800 p-1.5 rounded-full text-zinc-400">
                            <CategoryIcon size={10} />
                          </span>

                          <div className="bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 p-3.5 rounded-xl space-y-2 transition-all">
                            <div className="flex items-center justify-between text-[10px]">
                              <Badge className={`text-[8px] font-mono leading-none ${details.color}`}>
                                {details.label}
                              </Badge>
                              <div className="flex items-center gap-3">
                                <span className="text-zinc-500">{new Date(mem.last_updated).toLocaleDateString()}</span>
                                <button
                                  onClick={() => handleDeleteMemory(mem.id)}
                                  className="text-red-400 hover:text-red-300 p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                              {mem.content}
                            </p>

                            <div className="flex justify-between items-center text-[9px] pt-1.5 border-t border-zinc-950">
                              <span className="text-zinc-600 font-bold uppercase">Chronological learning log</span>
                              <Badge className="bg-blue-600/10 border-blue-500/20 text-blue-400 text-[9px] font-mono">
                                Impacted {mem.impact_count} decisions
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
