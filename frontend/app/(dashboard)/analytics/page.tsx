'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import {
  TrendingUp,
  Zap,
  Clock,
  Sparkles,
  BarChart,
  Target
} from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-xs font-mono shadow-xl space-y-1">
        <p className="text-zinc-400 font-sans font-semibold">Date: 2026-{label}</p>
        <p className="text-blue-400">Executions: {payload[0].value}</p>
        {payload[1] && <p className="text-amber-400">Saved: ${payload[1].value}</p>}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const { token } = useAuth()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const summary = await api.getAnalytics(token)
        setData(summary)
      } catch (err) {
        console.error('Failed to load analytics', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [token])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-zinc-900 animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 bg-zinc-900 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-[50vh] bg-zinc-900 animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800/60 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Platform Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">Measure GaaS performance efficiencies, LLM execution metrics, and savings.</p>
      </div>

      {/* Stats metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Average Speed</span>
            <Clock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">{data?.avg_execution_time}s</div>
            <p className="text-xs text-zinc-500 mt-1">Avg time per workflow run</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Tokens Billed</span>
            <Zap className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">{(data?.total_tokens / 1000000).toFixed(2)}M</div>
            <p className="text-xs text-zinc-500 mt-1">Context tokens consumed</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Platform Accuracy</span>
            <Target className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">{data?.success_rate}%</div>
            <p className="text-xs text-zinc-500 mt-1">Success rate over total runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Execution and cost trends charts */}
      <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl relative">
        {/* Glowing visual effect */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent pointer-events-none" />
        
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-800/60">
          <div>
            <CardTitle className="text-white text-base">Execution Efficiency Trends</CardTitle>
            <CardDescription>Visual chart mapping daily GaaS runs vs estimated operations cost saved.</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Executions
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Savings ($)
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily_metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="executions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorExecutions)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="cost_saved" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSavings)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
