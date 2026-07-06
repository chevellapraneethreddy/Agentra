'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Database, Trash2, Key, Receipt, Trash, MessageSquare, Mail, Calendar as CalendarIcon, FileSpreadsheet, Send, ShieldAlert } from 'lucide-react'

interface ToolItem {
  id: string
  name: string
  label: string
  desc: string
  icon: React.ComponentType<any>
  fields: { name: string; label: string; placeholder: string; type: string; required: boolean }[]
}

const INTEGRATION_TOOLS: ToolItem[] = [
  {
    id: 'slack',
    name: 'slack',
    label: 'Slack Workspace Alert',
    desc: 'Dispatched sales notifications, stockout warnings, and worker log sweeps directly to your channels.',
    icon: MessageSquare,
    fields: [
      { name: 'webhook_url', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...', type: 'text', required: true }
    ]
  },
  {
    id: 'whatsapp',
    name: 'whatsapp',
    label: 'WhatsApp Cloud API',
    desc: 'Send automated order confirmations and fulfillment tracking codes directly to buyer phones.',
    icon: Send,
    fields: [
      { name: 'phone_number_id', label: 'Meta Phone Number ID', placeholder: '109827364523910', type: 'text', required: true },
      { name: 'access_token', label: 'WhatsApp System User Access Token', placeholder: 'EAAG...', type: 'password', required: true }
    ]
  },
  {
    id: 'gmail',
    name: 'gmail',
    label: 'Gmail SMTP Delivery',
    desc: 'Automates Gmail PDF invoice delivery and tracking code dispatch via secure SMTP.',
    icon: Mail,
    fields: [
      { name: 'sender_email', label: 'Gmail Account Email Address', placeholder: 'billing@mycompany.com', type: 'email', required: true },
      { name: 'app_password', label: 'Gmail App Specific Password', placeholder: 'abcd efgh ijkl mnop', type: 'password', required: true }
    ]
  },
  {
    id: 'google_sheets',
    name: 'google_sheets',
    label: 'Google Sheets Logs',
    desc: 'Append stock ledger adjustments, reorder SKU lines, and procurement logs directly to a shared spreadsheet.',
    icon: FileSpreadsheet,
    fields: [
      { name: 'spreadsheet_id', label: 'Google Spreadsheet ID', placeholder: '1BxiMVs0XRA5nFMdKv1a6pbgH6u...', type: 'text', required: true },
      { name: 'oauth_access_token', label: 'Google Developer OAuth Token', placeholder: 'ya29.a0AfH...', type: 'password', required: true }
    ]
  },
  {
    id: 'google_calendar',
    name: 'google_calendar',
    label: 'Google Calendar Sweeps',
    desc: 'Book supplier restock meetings and daily operations audit blocks automatically on your calendar.',
    icon: CalendarIcon,
    fields: [
      { name: 'oauth_access_token', label: 'Google Developer OAuth Token', placeholder: 'ya29.a0AfH...', type: 'password', required: true }
    ]
  }
]

export default function SettingsPage() {
  const { user, token, signOut } = useAuth()
  
  // Settings configurations
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  
  // Invoices ledger data
  const [invoices, setInvoices] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  // Tool Connections states
  const [connections, setConnections] = useState<any[]>([])
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null)
  const [connectionInputs, setConnectionInputs] = useState<Record<string, string>>({})
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [savingConnection, setSavingConnection] = useState(false)

  // Integration toggles
  const [shopifyEnabled, setShopifyEnabled] = useState(true)
  const [stripeEnabled, setStripeEnabled] = useState(true)
  const [fedexEnabled, setFedexEnabled] = useState(false)
  const [emailSync, setEmailSync] = useState(true)

  const loadInvoices = async () => {
    if (!token) return
    try {
      setLoadingInvoices(true)
      const data = await api.getInvoices(token)
      setInvoices(data)
    } catch (err) {
      console.error('Failed to load invoices', err)
    } finally {
      setLoadingInvoices(false)
    }
  }

  const loadConnections = async () => {
    if (!token) return
    try {
      setLoadingConnections(true)
      const data = await api.getConnections(token)
      setConnections(data)
    } catch (err) {
      console.error('Failed to load tool connections', err)
    } finally {
      setLoadingConnections(false)
    }
  }

  useEffect(() => {
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co')
    setSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key-here')
    setIsConfigured(isSupabaseConfigured())
    loadInvoices()
    loadConnections()
  }, [token])

  const handleClearSandbox = () => {
    if (confirm('Are you sure you want to clear your local sandbox session? This will log you out.')) {
      localStorage.removeItem('agentra_sandbox_user')
      signOut()
    }
  }

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Keys applied. To make these changes permanent, write them to your frontend/.env.local and restart your server.')
  }

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: string) => {
    if (!token) return
    try {
      await api.updateInvoice(invoiceId, { status }, token)
      await loadInvoices()
    } catch (err) {
      console.error('Failed to update invoice status', err)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to delete this invoice?')) return
    try {
      await api.deleteInvoice(invoiceId, token)
      await loadInvoices()
    } catch (err) {
      console.error('Failed to delete invoice', err)
    }
  }

  // Connection management
  const handleOpenConnect = (tool: ToolItem) => {
    setSelectedTool(tool)
    const emptyInputs: Record<string, string> = {}
    tool.fields.forEach(field => {
      emptyInputs[field.name] = ''
    })
    setConnectionInputs(emptyInputs)
    setIsConnectOpen(true)
  }

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedTool) return
    setSavingConnection(true)
    try {
      await api.connectTool(selectedTool.name, connectionInputs, token)
      setIsConnectOpen(false)
      setSelectedTool(null)
      await loadConnections()
      alert(`${selectedTool.label} connected successfully.`)
    } catch (err: any) {
      alert(err.message || 'Connection failed.')
    } finally {
      setSavingConnection(false)
    }
  }

  const handleDisconnectTool = async (toolName: string) => {
    if (!token) return
    if (!confirm(`Are you sure you want to disconnect ${toolName.toUpperCase()} integration? credentials will be purged.`)) return
    try {
      await api.disconnectTool(toolName, token)
      await loadConnections()
    } catch (err: any) {
      alert(err.message || 'Disconnect failed')
    }
  }

  const getConnectionStatus = (toolName: string) => {
    const conn = connections.find(c => c.tool_name === toolName)
    return conn ? conn.is_connected : false
  }

  const getInvoiceStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono text-[10px]">paid</Badge>
      case 'sent':
        return <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono text-[10px]">sent</Badge>
      case 'void':
        return <Badge className="bg-red-500/10 border-red-500/30 text-red-400 font-mono text-[10px]">void</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono text-[10px]">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Workspace Configuration</h1>
            <p className="text-sm text-zinc-400 mt-1">Configure credentials, workspace integrations, and review commercial invoice records.</p>
          </div>
          
          <TabsList className="bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
            <TabsTrigger value="general" className="text-xs px-4 py-2 font-semibold">General Settings</TabsTrigger>
            <TabsTrigger value="connections" className="text-xs px-4 py-2 font-semibold">Connected Tools</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs px-4 py-2 font-semibold">Invoices Ledger</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left Column */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-base">Company Profile</CardTitle>
                  <CardDescription>Configure contact name and email properties for GaaS emails.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Contact Person</label>
                      <Input
                        value={user?.fullName || ''}
                        readOnly
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 cursor-not-allowed text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Contact Email</label>
                      <Input
                        value={user?.email || ''}
                        readOnly
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 cursor-not-allowed text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Contact profiles are inherited from your active Supabase identity session token.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-base">Supabase Connection Credentials</CardTitle>
                    <CardDescription>Setup database connection parameters to authenticate clients.</CardDescription>
                  </div>
                  <Badge className={isConfigured ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono' : 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-mono animate-pulse'}>
                    {isConfigured ? 'LIVE AUTH ACTIVE' : 'SANDBOX BYPASS'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveKeys} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                        <Database size={12} className="text-zinc-500" />
                        NEXT_PUBLIC_SUPABASE_URL
                      </label>
                      <Input
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                        <Key size={12} className="text-zinc-500" />
                        NEXT_PUBLIC_SUPABASE_ANON_KEY
                      </label>
                      <Input
                        type="password"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <p className="text-[10px] text-zinc-500 max-w-sm leading-normal">
                        To connect your own DB permanently, edit `frontend/.env.local` and `backend/.env` with your project secrets.
                      </p>
                      <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                        Apply Keys
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-base">Channel Connectors</CardTitle>
                  <CardDescription>Toggle live system sync parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">Shopify Webhooks</span>
                      <span className="text-[10px] text-zinc-500">Sync items and orders</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={shopifyEnabled}
                      onChange={(e) => setShopifyEnabled(e.target.checked)}
                      className="accent-blue-600 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">Stripe Payments API</span>
                      <span className="text-[10px] text-zinc-500">Auto-verify payment values</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={stripeEnabled}
                      onChange={(e) => setStripeEnabled(e.target.checked)}
                      className="accent-blue-600 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">FedEx Shipping API</span>
                      <span className="text-[10px] text-zinc-500">Auto-book shipments</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={fedexEnabled}
                      onChange={(e) => setFedexEnabled(e.target.checked)}
                      className="accent-blue-600 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">SMTP Email Sync</span>
                      <span className="text-[10px] text-zinc-500">Send notifications to customer</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailSync}
                      onChange={(e) => setEmailSync(e.target.checked)}
                      className="accent-blue-600 h-4 w-4 cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-base">Developer Tools</CardTitle>
                  <CardDescription>Clear sandbox cache variables.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button
                    type="button"
                    onClick={handleClearSandbox}
                    className="w-full bg-red-950/20 hover:bg-red-950/30 text-red-400 border border-red-900/30 hover:border-red-900/60 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                  >
                    <Trash2 size={14} />
                    Clear Sandbox Cache
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Connected Tools */}
        <TabsContent value="connections" className="mt-6 space-y-6">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h2 className="text-white font-semibold text-base">API Tool Connections</h2>
              <p className="text-zinc-400 text-xs mt-1">Configure credentials for automation integrations. Prompt notifications will alert you when credentials are missing.</p>
            </div>
          </div>

          {loadingConnections ? (
            <div className="py-24 text-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATION_TOOLS.map((tool) => {
                const isConnected = getConnectionStatus(tool.name)
                const ToolIcon = tool.icon
                return (
                  <Card key={tool.id} className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between h-48">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                            <ToolIcon size={16} />
                          </div>
                          <CardTitle className="text-white text-xs font-bold leading-none">{tool.label}</CardTitle>
                        </div>
                        <Badge className={isConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[9px] font-mono' : 'bg-zinc-900 border-zinc-800 text-zinc-500 text-[9px] font-mono'}>
                          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </Badge>
                      </div>
                      <CardDescription className="text-[10px] text-zinc-400 leading-normal pt-2">
                        {tool.desc}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0 pb-4 px-6 flex justify-end">
                      {isConnected ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDisconnectTool(tool.name)}
                          className="hover:bg-red-950/20 text-red-400 hover:text-red-300 text-[10px] h-7 border border-transparent hover:border-red-900/30 font-semibold cursor-pointer"
                        >
                          Disconnect Integration
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenConnect(tool)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-7 font-bold px-4 py-1.5 shadow shadow-blue-600/20 cursor-pointer"
                        >
                          Connect
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Connection prompt modal */}
          <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
              {selectedTool && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-white text-base flex items-center gap-2">
                      <ShieldAlert size={16} className="text-blue-400 animate-pulse" />
                      <span>Setup connection: {selectedTool.label}</span>
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-xs">
                      Enter credentials for the AI Employee to utilize this tool automatically. Keys are encrypted and not hardcoded.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleConnectSubmit} className="space-y-4 pt-2">
                    {selectedTool.fields.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">{field.label}</label>
                        <Input
                          required={field.required}
                          type={field.type}
                          value={connectionInputs[field.name] || ''}
                          onChange={(e) => setConnectionInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="bg-zinc-900 border-zinc-800 text-white text-xs font-mono"
                        />
                      </div>
                    ))}

                    <Button type="submit" disabled={savingConnection} className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4 text-xs font-semibold py-2.5">
                      {savingConnection ? 'Verifying & Saving...' : 'Save credentials & Activate Tool'}
                    </Button>
                  </form>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 3: Invoices Ledger */}
        <TabsContent value="invoices" className="mt-6 space-y-6">
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center gap-2 pb-4 border-b border-zinc-800/50">
              <Receipt size={18} className="text-blue-400" />
              <div>
                <CardTitle className="text-white text-base">Invoices Ledger</CardTitle>
                <CardDescription>Fulfillment billing records auto-compiled by Operations Agent.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingInvoices ? (
                <div className="py-20 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No invoices issued yet. Trigger an Autopilot order fulfillment to auto-generate invoices.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-zinc-800/80">
                      <TableHead className="text-zinc-400 text-xs">Invoice Ref</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Order ID</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Issue Date</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Invoice Value</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Status</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                        <TableCell className="text-white text-xs font-semibold font-mono">{inv.invoice_number}</TableCell>
                        <TableCell className="font-mono text-zinc-400 text-xs">{inv.order_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-zinc-300 text-xs">{new Date(inv.issued_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right text-zinc-200 text-xs font-mono">${inv.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <select
                            value={inv.status}
                            onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded px-1.5 py-0.5 focus:border-blue-500 outline-none"
                          >
                            <option value="draft">draft</option>
                            <option value="sent">sent</option>
                            <option value="paid">paid</option>
                            <option value="void">void</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="hover:bg-red-950/20 text-red-400 hover:text-red-300 p-2"
                          >
                            <Trash size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
