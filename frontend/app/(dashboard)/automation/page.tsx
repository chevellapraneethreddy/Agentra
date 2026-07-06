'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Zap,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Mail,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Sliders,
  PlayCircle
} from 'lucide-react'

interface WorkflowStep {
  action: string
  args: Record<string, any>
}

interface WorkflowType {
  id: string
  name: string
  trigger_type: string
  conditions: Record<string, any>
  steps: WorkflowStep[]
  is_active: boolean
  created_at: string
}

interface WorkflowHistoryType {
  id: string
  workflow_id: string
  business_id: string
  trigger_source: string
  input_payload: Record<string, any>
  ai_decision: Record<string, any> | null
  actions_performed: Array<{ step: number; type: string; message: string }>
  status: string
  errors: string | null
  retries: number
  execution_time: string
  created_at: string
}

export default function AutomationCenterPage() {
  const { token } = useAuth()
  const [workflows, setWorkflows] = useState<WorkflowType[]>([])
  const [history, setHistory] = useState<WorkflowHistoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [runningId, setRunningId] = useState<string | null>(null)
  
  // Selection / Subview details
  const [selectedWf, setSelectedWf] = useState<WorkflowType | null>(null)
  
  // Run Dialog Payload Configurator
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [targetWf, setTargetWf] = useState<WorkflowType | null>(null)
  const [testPayloadStr, setTestPayloadStr] = useState('{\n  "sender": "lead@customer.com",\n  "subject": "Inquiry about pricing",\n  "body": "Hi, I am interested in your pricing demo request."\n}')

  const loadData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const wfs = await api.getWorkflows(token)
      const hist = await api.getWorkflowHistory(token)
      setWorkflows(wfs)
      setHistory(hist)
    } catch (err) {
      console.error('Error fetching workflows metrics', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  // Derive workflow metrics dynamically from logs
  const getWorkflowStats = (wfId: string) => {
    const wfRuns = history.filter((h) => h.workflow_id === wfId)
    const total = wfRuns.length
    const successful = wfRuns.filter((h) => h.status === 'success').length
    const failed = wfRuns.filter((h) => h.status === 'failed').length
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100
    const lastRun = wfRuns.length > 0 ? wfRuns[0] : null
    const lastError = wfRuns.find((h) => h.status === 'failed')?.errors || null
    
    // Status resolution
    let status = 'Paused'
    if (workflows.find(w => w.id === wfId)?.is_active) {
      if (lastRun && lastRun.status === 'failed') {
        status = 'Failed'
      } else if (lastRun && lastRun.status === 'waiting') {
        status = 'Paused'
      } else {
        status = 'Running'
      }
    }

    return {
      total,
      successRate,
      lastRunTime: lastRun ? lastRun.created_at : null,
      lastError,
      status
    }
  }

  const handleToggleActive = async (wf: WorkflowType) => {
    if (!token) return
    const updatedStatus = !wf.is_active
    try {
      await api.updateWorkflow(wf.id, {
        name: wf.name,
        trigger_type: wf.trigger_type,
        conditions: wf.conditions,
        steps: wf.steps,
        is_active: updatedStatus
      }, token)
      setWorkflows((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, is_active: updatedStatus } : w))
      )
      loadData() // refresh logs/status
    } catch (err) {
      console.error('Failed toggling workflow state', err)
    }
  }

  const handleDeleteWf = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this workflow?')) return
    try {
      await api.deleteWorkflow(id, token)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      if (selectedWf?.id === id) {
        setSelectedWf(null)
      }
      loadData()
    } catch (err) {
      console.error('Failed deleting workflow', err)
    }
  }

  const handleOpenRunDialog = (wf: WorkflowType) => {
    setTargetWf(wf)
    // Setup prefilled payloads depending on trigger_type
    if (wf.trigger_type === 'invoice_generated') {
      setTestPayloadStr('{\n  "invoice_number": "INV-58A2B",\n  "amount": 250.00,\n  "recipient": "billing@customer.com",\n  "invoice_id": "optional-invoice-id"\n}')
    } else {
      setTestPayloadStr('{\n  "sender": "lead@customer.com",\n  "subject": "Inquiry about pricing",\n  "body": "Hi, I am interested in your pricing demo request."\n}')
    }
    setIsRunOpen(true)
  }

  const handleTriggerRun = async () => {
    if (!token || !targetWf) return
    setRunningId(targetWf.id)
    setIsRunOpen(false)
    try {
      const payload = JSON.parse(testPayloadStr)
      await api.runWorkflow(targetWf.id, payload, token)
      loadData()
      alert('Workflow execution completed! Check history logs.')
    } catch (err: any) {
      alert(`Manual trigger run error: ${err.message || err}`)
    } finally {
      setRunningId(null)
      setTargetWf(null)
    }
  }

  // Get Trigger Icons
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'new_email':
        return <Mail className="text-blue-400" size={16} />
      case 'invoice_generated':
        return <FileText className="text-emerald-400" size={16} />
      case 'schedule_8am':
        return <Clock className="text-amber-400" size={16} />
      default:
        return <Zap className="text-zinc-400" size={16} />
    }
  }

  const getStepDescription = (step: WorkflowStep) => {
    const action = step.action
    const args = step.args
    switch (action) {
      case 'ai_classify_lead':
        return 'Classify lead intent with Gemini'
      case 'send_initial_reply':
        return 'Send initial automated quote response'
      case 'wait':
        return `Pause execution for ${args.days || 1} days`
      case 'send_followup_1':
        return 'Send first billing/reorder follow-up'
      case 'send_followup_2':
        return 'Send final re-engagement email'
      case 'email_invoice':
        return 'Email invoice billing copy'
      case 'check_payment_status':
        return 'Check invoice payment status in DB'
      case 'send_reminder_1':
        return 'Send first overdue alert email'
      case 'send_reminder_2':
        return 'Send final warning email'
      case 'ai_parse_meeting':
        return 'Extract meeting schedule from email body'
      case 'find_free_slot':
        return 'Scan Google Calendar for free slots'
      case 'create_meeting':
        return 'Create Google Calendar invitation event'
      case 'send_calendar_invite':
        return 'Send email invite with Calendar link'
      case 'ai_classify_issue':
        return 'Classify support issue context with Gemini'
      case 'route_support_issue':
        return 'Auto-respond or create review drafts'
      case 'generate_summary':
        return 'Compile executive daily summary report'
      case 'email_summary_to_owner':
        return 'Email summaries list to owner'
      default:
        return action.replace(/_/g, ' ')
    }
  }

  if (loading && workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-400 gap-2">
        <RefreshCw className="animate-spin text-blue-500" size={24} />
        <span>Loading AI Automation Center...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!selectedWf ? (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="text-blue-500" size={22} /> AI Automation Center
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Configure and monitor autonomous AI email agents and scheduled calendar workflows.
            </p>
          </div>
          <Button onClick={loadData} variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs flex gap-1 items-center h-9">
            <RefreshCw size={13} /> Sync Engine
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setSelectedWf(null)}
            variant="outline"
            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 p-2 h-9 w-9 rounded-lg"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{selectedWf.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                selectedWf.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>
                {selectedWf.is_active ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">Workflow ID: {selectedWf.id}</p>
          </div>
        </div>
      )}

      {/* SUBVIEW: Detail Workflow view */}
      {selectedWf ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Visual Diagram & configuration */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-zinc-950 border-zinc-900 text-zinc-300">
              <CardHeader className="border-b border-zinc-900">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Sliders size={16} className="text-blue-400" /> Workflow Configuration & Diagram
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Visual layout flow of active execution nodes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Trigger parameters */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                      {getTriggerIcon(selectedWf.trigger_type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Trigger Source: {selectedWf.trigger_type}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Activates this workflow automatically on incoming payloads.</p>
                    </div>
                  </div>
                  {selectedWf.conditions && Object.keys(selectedWf.conditions).length > 0 && (
                    <div className="text-right text-xs">
                      <span className="text-zinc-500">Conditions:</span>
                      <span className="ml-1 text-zinc-300 font-mono text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {JSON.stringify(selectedWf.conditions)}
                      </span>
                    </div>
                  )}
                </div>

                {/* VISUAL WORKFLOW DIAGRAM */}
                <div className="py-6 flex flex-col items-center">
                  {/* Start Node */}
                  <div className="flex flex-col items-center group w-full max-w-[400px]">
                    <div className="px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold w-full text-center shadow-lg shadow-blue-500/5 transition-all">
                      ⚡ Triggered: {selectedWf.trigger_type}
                    </div>
                    <div className="h-6 w-0.5 bg-gradient-to-b from-blue-500/30 to-zinc-700"></div>
                  </div>

                  {/* Steps mapping */}
                  {selectedWf.steps.map((step, index) => {
                    const isAi = step.action.startsWith('ai_')
                    return (
                      <React.Fragment key={index}>
                        <div className="flex flex-col items-center w-full max-w-[400px]">
                          <div className={`px-4 py-3 border rounded-lg text-xs w-full text-center relative group ${
                            isAi 
                              ? 'bg-purple-950/20 border-purple-800/40 text-purple-400 shadow-md shadow-purple-950/10' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                          }`}>
                            <div className="absolute top-2 left-3 font-bold text-[9px] text-zinc-500 bg-zinc-950/60 px-1 py-0.5 rounded">
                              NODE {index + 1}
                            </div>
                            <span className="font-bold block text-white mt-1 mb-0.5">{step.action.replace(/_/g, ' ').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400">{getStepDescription(step)}</span>
                          </div>
                          <div className="h-6 w-0.5 bg-gradient-to-b from-zinc-700 to-zinc-800"></div>
                        </div>
                      </React.Fragment>
                    )
                  })}

                  {/* End Node */}
                  <div className="flex flex-col items-center w-full max-w-[400px]">
                    <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold w-full text-center">
                      ✓ Completed successfully
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Execution History List for this workflow */}
          <div className="space-y-6">
            <Card className="bg-zinc-950 border-zinc-900 text-zinc-300">
              <CardHeader className="border-b border-zinc-900">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Clock size={16} className="text-blue-400" /> Execution History
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Logs of recent execution runs.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 max-h-[600px] overflow-y-auto">
                {history.filter(h => h.workflow_id === selectedWf.id).length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs italic">
                    No execution logs found for this workflow.
                  </div>
                ) : (
                  history.filter(h => h.workflow_id === selectedWf.id).map((run) => (
                    <div key={run.id} className="border border-zinc-900 bg-zinc-900/20 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded font-mono border border-zinc-800">
                            {run.trigger_source.toUpperCase()}
                          </span>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {new Date(run.execution_time).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          run.status === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : run.status === 'failed' 
                              ? 'bg-red-500/10 text-red-400' 
                              : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {run.status}
                        </span>
                      </div>

                      {/* Error trace */}
                      {run.errors && (
                        <div className="p-2 bg-red-950/20 border border-red-900/30 rounded text-red-400 text-[10px] font-mono leading-normal break-all">
                          Error: {run.errors}
                        </div>
                      )}

                      {/* Actions Performed logs */}
                      {run.actions_performed && run.actions_performed.length > 0 && (
                        <div className="space-y-1.5 pt-1.5 border-t border-zinc-900">
                          <div className="text-[10px] font-bold text-zinc-400">Steps Executed:</div>
                          <div className="space-y-1">
                            {run.actions_performed.map((act, i) => (
                              <div key={i} className="flex gap-1.5 items-start text-[10px] text-zinc-400 leading-normal">
                                <span className="text-zinc-500 font-mono">[{act.type}]</span>
                                <span>{act.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* AI Decision metadata */}
                      {run.ai_decision && Object.keys(run.ai_decision).length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-zinc-900">
                          <div className="text-[10px] font-bold text-zinc-400">Gemini Parsing Output:</div>
                          <pre className="text-[9px] font-mono bg-zinc-900/60 p-2 rounded text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                            {JSON.stringify(run.ai_decision, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* MAIN LIST VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((wf) => {
              const stats = getWorkflowStats(wf.id)
              return (
                <Card key={wf.id} className="bg-zinc-950 border-zinc-900 text-zinc-300 hover:border-zinc-800 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3 border-b border-zinc-900/60">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(wf.trigger_type)}
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">
                          {wf.trigger_type}
                        </span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        stats.status === 'Running' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : stats.status === 'Failed' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}>
                        {stats.status}
                      </span>
                    </div>
                    <CardTitle className="text-white text-sm mt-3 font-bold line-clamp-1">
                      {wf.name}
                    </CardTitle>
                    <CardDescription className="text-[10px] text-zinc-500 line-clamp-2 mt-1 leading-normal">
                      Executes {wf.steps.length} sequential nodes. Triggered dynamically by matching filters.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 pb-4 space-y-3">
                    {/* Performance metrics grid */}
                    <div className="grid grid-cols-3 gap-2 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-900">
                      <div className="text-center">
                        <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Runs</span>
                        <span className="text-xs font-bold text-white">{stats.total}</span>
                      </div>
                      <div className="text-center border-x border-zinc-900">
                        <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Success</span>
                        <span className={`text-xs font-bold ${stats.successRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{stats.successRate}%</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Nodes</span>
                        <span className="text-xs font-bold text-white">{wf.steps.length}</span>
                      </div>
                    </div>

                    {/* Expiry / Error details */}
                    {stats.lastRunTime ? (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-zinc-500">Last run:</span>
                        <span className="text-zinc-300">{new Date(stats.lastRunTime).toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic">No executions logged.</div>
                    )}

                    {stats.lastError && (
                      <div className="p-2 bg-red-950/15 border border-red-900/20 rounded text-red-400 text-[10px] font-mono line-clamp-1 flex items-center gap-1">
                        <AlertCircle size={10} /> {stats.lastError}
                      </div>
                    )}
                  </CardContent>

                  <CardContent className="pt-3 pb-3 border-t border-zinc-900 flex gap-2 items-center bg-zinc-950">
                    <Button
                      onClick={() => handleToggleActive(wf)}
                      variant="outline"
                      className={`text-[10px] h-8 px-3 flex gap-1 items-center font-bold rounded-lg cursor-pointer ${
                        wf.is_active 
                          ? 'border-emerald-900/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20' 
                          : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      {wf.is_active ? <Pause size={10} /> : <Play size={10} />}
                      {wf.is_active ? 'Disable' : 'Enable'}
                    </Button>

                    <Button
                      onClick={() => handleOpenRunDialog(wf)}
                      disabled={runningId === wf.id}
                      variant="outline"
                      className="text-[10px] h-8 flex-1 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 font-bold rounded-lg flex justify-center gap-1 cursor-pointer"
                    >
                      <PlayCircle size={11} className={runningId === wf.id ? 'animate-spin' : ''} />
                      Run Test
                    </Button>

                    <Button
                      onClick={() => setSelectedWf(wf)}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] h-8 px-2.5 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ChevronRight size={12} />
                    </Button>

                    <Button
                      onClick={() => handleDeleteWf(wf.id)}
                      className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 text-[10px] h-8 px-2.5 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Activity Timeline Table */}
          <Card className="bg-zinc-950 border-zinc-900 text-zinc-300 mt-6">
            <CardHeader className="border-b border-zinc-900">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" /> AI Operations Activity Timeline
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Audit traces of all autonomous email and calendar activities processed by workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs italic">
                  No activities logged yet. Trigger a workflow to see timeline updates.
                </div>
              ) : (
                <div className="space-y-4 relative pl-4 border-l border-zinc-900 ml-2 py-2">
                  {history.slice(0, 10).map((run) => {
                    const parentWf = workflows.find((w) => w.id === run.workflow_id)
                    const isSuccess = run.status === 'success'
                    return (
                      <div key={run.id} className="relative space-y-1.5">
                        {/* Bullet node */}
                        <div className={`absolute -left-[20px] top-1.5 h-2 w-2 rounded-full ${
                          isSuccess ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                        }`} />
                        
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-bold text-white">
                              {parentWf ? parentWf.name : 'Unknown Workflow'}
                            </span>
                            <span className="text-[10px] text-zinc-500 ml-2">
                              ({run.trigger_source})
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(run.execution_time).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-400 leading-normal pl-2 border-l border-zinc-800 bg-zinc-900/10 p-2 rounded">
                          {run.actions_performed && run.actions_performed.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {run.actions_performed.map((act, i) => (
                                <li key={i} className="text-[10px]">
                                  <span className="text-zinc-500 font-mono">[{act.type}]</span> {act.message}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="italic text-zinc-500">Initiating reasoning loop execution...</span>
                          )}
                          {run.errors && (
                            <p className="text-red-400 mt-1 font-mono text-[10px]">Error: {run.errors}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Test Payload dialog */}
      <Dialog open={isRunOpen} onOpenChange={setIsRunOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Run Workflow: {targetWf && targetWf.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Provide a custom test payload JSON to run this workflow immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-semibold">Test JSON Payload</label>
              <textarea
                value={testPayloadStr}
                onChange={(e) => setTestPayloadStr(e.target.value)}
                rows={6}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 p-3 rounded-lg text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsRunOpen(false)} variant="outline" className="flex-1 border-zinc-800 text-zinc-400 text-xs py-2">
                Cancel
              </Button>
              <Button onClick={handleTriggerRun} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2">
                Trigger Execution
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
