'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, PlayCircle, Terminal, RefreshCw, Layers, ShieldCheck, Cpu } from 'lucide-react'

export default function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  const loadTasks = async (selectFirst = false) => {
    if (!token) return
    try {
      setReloading(true)
      const data = await api.getTasks(token)
      setTasks(data)
      if (selectFirst && data.length > 0) {
        setSelectedTask(data[0])
      } else if (selectedTask) {
        // Refresh currently selected task too
        const updated = data.find((t: any) => t.id === selectedTask.id)
        if (updated) setSelectedTask(updated)
      }
    } catch (err) {
      console.error('Error fetching tasks', err)
    } finally {
      setReloading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks(true)
  }, [token])

  const handleRunTask = async (taskId: string) => {
    if (!token) return
    setRunningId(taskId)
    try {
      const updatedTask = await api.runTask(taskId, token)
      await loadTasks()
      setSelectedTask(updatedTask)
    } catch (err) {
      console.error('Error running task', err)
    } finally {
      setRunningId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono">completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono animate-pulse">in_progress</Badge>
      case 'failed':
        return <Badge className="bg-red-500/10 border-red-500/30 text-red-400 font-mono">failed</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono">{status}</Badge>
    }
  }

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-amber-400'
      case 'error':
        return 'text-red-400 animate-pulse'
      case 'action':
        return 'text-blue-400 font-semibold'
      default:
        return 'text-zinc-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Operations Workers</h1>
          <p className="text-sm text-zinc-400 mt-1">Configure and monitor scheduled background execution scripts.</p>
        </div>
        <Button
          onClick={() => loadTasks(false)}
          variant="outline"
          disabled={reloading}
          className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 self-start flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={reloading ? 'animate-spin' : ''} />
          {reloading ? 'Reloading...' : 'Reload'}
        </Button>
      </div>

      {/* Main double column grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Tasks list */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider pl-1">Tasks List</h2>
          {loading && tasks.length === 0 ? (
            <div className="py-12 text-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
            </div>
          ) : (
            tasks.map((task) => (
              <Card
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl hover:border-zinc-700 transition-all duration-200 cursor-pointer ${
                  selectedTask?.id === task.id ? 'ring-1 ring-blue-500/50 border-zinc-700 bg-zinc-900/40' : ''
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-bold text-white leading-tight truncate max-w-[150px]">{task.title}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  
                  <div className="flex flex-col gap-1 text-[11px] text-zinc-400 font-mono">
                    <div className="flex justify-between">
                      <span>RUN COUNT:</span>
                      <span className="text-white">{task.run_count} runs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LAST RUN:</span>
                      <span className="text-zinc-300 truncate max-w-[120px]">{task.last_run || 'Never'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-800/80 pt-2.5 mt-1">
                    <span className="text-[10px] text-zinc-500 font-sans">Agent: Operations</span>
                    
                    <Button
                      size="sm"
                      disabled={runningId === task.id || task.status === 'in_progress'}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRunTask(task.id)
                      }}
                      className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs h-7 px-2.5 flex items-center gap-1.5"
                    >
                      <Play size={10} fill="currentColor" />
                      {runningId === task.id ? 'Running' : 'Run Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right Side: Console terminal for logs */}
        <Card className="md:col-span-2 bg-zinc-950 border-zinc-800/80 flex flex-col h-[65vh] shadow-2xl relative">
          {/* Subtle Linear light glow */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent pointer-events-none" />
          
          <CardHeader className="border-b border-zinc-800 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-blue-400" />
              <div>
                <CardTitle className="text-white text-sm font-mono">
                  {selectedTask ? `Console: ${selectedTask.title}` : 'GaaS Worker Console'}
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs">
                  {selectedTask ? `Task ID: ${selectedTask.id}` : 'Select a task to display terminal output.'}
                </CardDescription>
              </div>
            </div>
            
            {selectedTask && (
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                <Cpu size={10} />
                <span>OPS-AG_001</span>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-zinc-950/60 space-y-2.5">
            {selectedTask ? (
              <>
                <div className="text-zinc-500 border-b border-zinc-900 pb-1.5 flex justify-between text-[10px]">
                  <span>[SYSTEM LOGS STREAM INIT]</span>
                  <span>AWAITING EVENTS...</span>
                </div>
                
                {selectedTask.logs.map((log: any, index: number) => (
                  <div key={index} className="flex gap-4 hover:bg-zinc-900/20 py-0.5 rounded px-1 transition-colors leading-relaxed">
                    <span className="text-zinc-600 select-none text-[10px] font-mono whitespace-nowrap">{log.timestamp}</span>
                    <span className="text-blue-500 font-bold select-none text-[10px] font-mono">[{log.type.toUpperCase()}]</span>
                    <span className={`flex-1 font-mono ${getLogTypeColor(log.type)}`}>
                      {log.message}
                    </span>
                  </div>
                ))}

                {selectedTask.logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-600 gap-2">
                    <Layers size={24} className="text-zinc-700" />
                    <p className="text-xs">No execution history recorded for this task yet.</p>
                    <p className="text-[10px] text-zinc-700">Click &quot;Run Now&quot; to trigger active workers.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 text-zinc-600 gap-2">
                <Terminal size={28} className="text-zinc-700" />
                <p>No Active Task Selected</p>
                <p className="text-[10px] text-zinc-700">Select an execution context from the left sidebar list.</p>
              </div>
            )}
          </CardContent>
          
          <div className="border-t border-zinc-900 p-3 bg-zinc-950 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-emerald-500" />
              Agent sandbox security verified.
            </span>
            <span>UTF-8 | LF</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
