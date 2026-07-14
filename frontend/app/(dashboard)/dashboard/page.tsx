'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  Clock,
  ArrowRight,
  Terminal,
  Activity,
  Play
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('agentra_cache_orders')
      return c ? JSON.parse(c) : []
    }
    return []
  })
  const [inventory, setInventory] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('agentra_cache_inventory')
      return c ? JSON.parse(c) : []
    }
    return []
  })
  const [analytics, setAnalytics] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('agentra_cache_analytics')
      return c ? JSON.parse(c) : null
    }
    return null
  })
  const [tasks, setTasks] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const c = sessionStorage.getItem('agentra_cache_tasks')
      return c ? JSON.parse(c) : []
    }
    return []
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('agentra_cache_analytics')
    }
    return true
  })
  const [triggering, setTriggering] = useState(false)

  const loadDashboardData = async () => {
    if (!token) return
    const start = performance.now()
    try {
      const [ordersData, inventoryData, analyticsData, tasksData] = await Promise.all([
        api.getOrders(token),
        api.getInventory(token),
        api.getAnalytics(token),
        api.getTasks(token)
      ])
      const apiDuration = performance.now() - start
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Profiling] Dashboard API response time: ${apiDuration.toFixed(2)}ms`)
      }

      const recentOrders = ordersData.slice(0, 3)
      setOrders(recentOrders)
      setInventory(inventoryData)
      setAnalytics(analyticsData)
      setTasks(tasksData)

      // Update sessionStorage caches
      sessionStorage.setItem('agentra_cache_orders', JSON.stringify(recentOrders))
      sessionStorage.setItem('agentra_cache_inventory', JSON.stringify(inventoryData))
      sessionStorage.setItem('agentra_cache_analytics', JSON.stringify(analyticsData))
      sessionStorage.setItem('agentra_cache_tasks', JSON.stringify(tasksData))
    } catch (err) {
      console.error('Error loading dashboard data', err)
    } finally {
      setLoading(false)
      const totalDuration = performance.now() - start
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Profiling] Dashboard render/hydration time: ${totalDuration.toFixed(2)}ms`)
      }
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [token])

  const triggerAuditSync = async () => {
    if (!token) return
    setTriggering(true)
    try {
      // Find the Inventory Audit task
      const auditTask = tasks.find(t => t.title.includes('Inventory'))
      if (auditTask) {
        await api.runTask(auditTask.id, token)
        await loadDashboardData()
        alert('Operations Agent successfully completed audit sync!')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTriggering(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono">completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono">processing</Badge>
      case 'failed':
        return <Badge className="bg-red-500/10 border-red-500/30 text-red-400 font-mono">failed</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono">{status}</Badge>
    }
  }

  // Calculate stock out alerts
  const lowStockCount = inventory.filter(item => item.status === 'low_stock').length
  const outOfStockCount = inventory.filter(item => item.status === 'out_of_stock').length

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-zinc-900 animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-zinc-900 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-96 bg-zinc-900 animate-pulse rounded-xl md:col-span-2" />
          <div className="h-96 bg-zinc-900 animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Operations Overview</h1>
          <p className="text-sm text-zinc-400 mt-1">Autonomous workflows running on GaaS core engine.</p>
        </div>
        <Button
          onClick={triggerAuditSync}
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/10 self-start"
        >
          <Play size={14} className={triggering ? 'animate-spin' : ''} />
          {triggering ? 'Syncing...' : 'Trigger Inventory Audit'}
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Operations</span>
            <ShoppingCart className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">{analytics?.total_executions}</div>
            <p className="text-xs text-zinc-500 mt-1">Fulfillments & sync runs</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stock Alerts</span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">{outOfStockCount + lowStockCount}</div>
            <p className="text-xs text-zinc-500 mt-1">
              <span className="text-red-400 font-medium">{outOfStockCount} critical</span> stockouts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Success Accuracy</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">{analytics?.success_rate}%</div>
            <p className="text-xs text-zinc-500 mt-1">Target error threshold &lt; 2%</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Est. Costs Saved</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white font-mono">${analytics?.cost_saved}</div>
            <p className="text-xs text-zinc-500 mt-1">vs human operations cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Side: Recent Orders Table */}
        <Card className="md:col-span-2 bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-800/50">
            <div>
              <CardTitle className="text-white text-base">Recent Incoming Orders</CardTitle>
              <CardDescription>Live business operations queue.</CardDescription>
            </div>
            <Link href="/orders" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader className="border-b border-zinc-800/80">
                <TableRow className="hover:bg-transparent border-zinc-800/80">
                  <TableHead className="text-zinc-400 text-xs">ID</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Customer</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Items</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-right">Value</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                    <TableCell className="font-mono text-zinc-300 text-xs">{order.id}</TableCell>
                    <TableCell className="text-white text-xs font-semibold">{order.customer_name}</TableCell>
                    <TableCell className="text-zinc-400 text-xs truncate max-w-[200px]">
                      {order.items?.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')}
                    </TableCell>
                    <TableCell className="text-right text-zinc-200 text-xs font-mono">${order.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{getStatusBadge(order.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Side: Active Operations Agent Actions Feed */}
        <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-800/50">
            <div>
              <CardTitle className="text-white text-base">Active Log Stream</CardTitle>
              <CardDescription>Live Operations Agent execution logs.</CardDescription>
            </div>
            <Terminal size={16} className="text-zinc-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {/* Combine actions and display step by step */}
              {orders.flatMap(order => 
                order.agent_actions.slice(-2).map((action: string, i: number) => ({
                  action,
                  time: order.created_at,
                  id: `${order.id}-${i}`
                }))
              ).slice(0, 6).map((item) => (
                <div key={item.id} className="text-xs space-y-1 pl-3 border-l-2 border-blue-500/50">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-mono text-[10px]">{item.time}</span>
                    <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-400 font-mono scale-90">OPS-FLOW</Badge>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans">{item.action}</p>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center text-xs text-zinc-500 py-8">
                  No active logs. Operations agent is idle.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
