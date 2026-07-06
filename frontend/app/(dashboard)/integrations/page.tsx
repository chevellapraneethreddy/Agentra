'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Mail, Calendar, HardDrive, Table as TableIcon, MessageSquare, ShoppingBag, Users, Database, Link2, RefreshCw, PowerOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'

interface ConnectionType {
  id: string
  business_id: string
  tool_name: string
  credentials: Record<string, any>
  is_connected: boolean
  last_sync: string | null
  logs: Array<{ timestamp: string; message: string; type: string }>
  required_permissions: string[]
  updated_at: string
}

export default function IntegrationsPage() {
  const { token } = useAuth()
  const [connections, setConnections] = useState<ConnectionType[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  
  // Connect Dialog states
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Dynamic configuration form states
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackToken, setSlackToken] = useState('')
  const [slackChannel, setSlackChannel] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waBusiId, setWaBusiId] = useState('')
  const [shopifyUrl, setShopifyUrl] = useState('')
  const [shopifyToken, setShopifyToken] = useState('')
  const [hubspotToken, setHubspotToken] = useState('')
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [supabaseBucket, setSupabaseBucket] = useState('invoices')

  // Send Email states
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendResult, setSendResult] = useState<any | null>(null)
  const [sendError, setSendError] = useState<any | null>(null)

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSendingEmail(true)
    setSendResult(null)
    setSendError(null)
    try {
      const res = await api.sendTestEmail(recipientEmail || null, token)
      setSendResult(res)
      loadConnections() // Refresh logs
    } catch (err: any) {
      console.error(err)
      let errorPayload = {
        status_code: 500,
        code: 500,
        message: err.message || 'Failed to send test email',
        request_id: 'N/A'
      }
      try {
        if (err.message && err.message.includes('{')) {
          const jsonText = err.message.substring(err.message.indexOf('{'))
          const parsedDetail = JSON.parse(jsonText)
          if (parsedDetail.message || parsedDetail.code) {
            errorPayload = { ...errorPayload, ...parsedDetail }
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse error details JSON', parseErr)
      }
      setSendError(errorPayload)
    } finally {
      setSendingEmail(false)
    }
  }

  const loadConnections = async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await api.getConnections(token)
      setConnections(data)
    } catch (err) {
      console.error('Error fetching integrations connections', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [token])

  const handleTestConnection = async (toolName: string) => {
    if (!token) return
    setTesting(toolName)
    try {
      await api.testConnection(toolName, token)
      await loadConnections()
      alert(`Test connection completed. Review the health logs inside the card.`)
    } catch (err: any) {
      alert(err.message || 'Connection test failed')
    } finally {
      setTesting(null)
    }
  }

  const handleDisconnect = async (toolName: string) => {
    if (!token) return
    if (!confirm(`Are you sure you want to disconnect ${toolName.replace('_', ' ')}? This purges credential keys.`)) return
    try {
      await api.disconnectTool(toolName, token)
      await loadConnections()
    } catch (err) {
      console.error(err)
    }
  }

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedTool) return
    setConnecting(true)

    // Build credentials object dynamically based on tool
    let credentials: Record<string, any> = {}
    if (['gmail', 'google_calendar', 'google_drive', 'google_sheets'].includes(selectedTool)) {
      credentials = {
        client_id: clientId || 'sandbox',
        client_secret: clientSecret || 'sandbox',
        oauth_access_token: 'sandbox',
        oauth_refresh_token: 'sandbox'
      }
    } else if (selectedTool === 'slack') {
      credentials = {
        webhook_url: slackWebhook || 'sandbox',
        bot_token: slackToken || 'sandbox',
        default_channel: slackChannel || '#general'
      }
    } else if (selectedTool === 'whatsapp') {
      credentials = {
        access_token: waToken || 'sandbox',
        phone_number_id: waPhoneId || 'sandbox',
        waba_id: waBusiId || 'sandbox'
      }
    } else if (selectedTool === 'shopify') {
      credentials = {
        shopify_shop_url: shopifyUrl || 'sandbox',
        shopify_access_token: shopifyToken || 'sandbox'
      }
    } else if (selectedTool === 'hubspot') {
      credentials = {
        hubspot_access_token: hubspotToken || 'sandbox'
      }
    } else if (selectedTool === 'supabase') {
      credentials = {
        supabase_url: supabaseUrl || 'sandbox',
        supabase_key: supabaseKey || 'sandbox',
        bucket_name: supabaseBucket || 'invoices'
      }
    }

    try {
      await api.connectTool(selectedTool, credentials, token)
      setIsConnectOpen(false)
      // Reset inputs
      setClientId('')
      setClientSecret('')
      setSlackWebhook('')
      setSlackToken('')
      setSlackChannel('')
      setWaToken('')
      setWaPhoneId('')
      setWaBusiId('')
      setShopifyUrl('')
      setShopifyToken('')
      setHubspotToken('')
      setSupabaseUrl('')
      setSupabaseKey('')
      setSupabaseBucket('invoices')
      
      await loadConnections()
      
      // If Google services, explain the OAuth redirect login flow
      if (['gmail', 'google_calendar', 'google_drive', 'google_sheets'].includes(selectedTool) && clientId) {
        alert('Credentials configured. Click Google OAuth Link to grant account access.')
      }
    } catch (err: any) {
      alert(err.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const getToolDetails = (toolName: string) => {
    switch (toolName) {
      case 'gmail':
        return { label: 'Gmail', icon: Mail, desc: 'Read, send, reply and catalog sales emails.' }
      case 'google_calendar':
        return { label: 'Google Calendar', icon: Calendar, desc: 'Book supplier sweeps and operations check-ins.' }
      case 'google_drive':
        return { label: 'Google Drive', icon: HardDrive, desc: 'Upload billing logs and invoice PDF receipts.' }
      case 'google_sheets':
        return { label: 'Google Sheets', icon: TableIcon, desc: 'Log low-stock items and procurement tables.' }
      case 'whatsapp':
        return { label: 'WhatsApp API', icon: MessageSquare, desc: 'Dispatch instant template texts to client numbers.' }
      case 'slack':
        return { label: 'Slack Alerts', icon: MessageSquare, desc: 'Notify team channels of checkout operations.' }
      case 'shopify':
        return { label: 'Shopify Store', icon: ShoppingBag, desc: 'Audit incoming checkouts and update inventory levels.' }
      case 'hubspot':
        return { label: 'HubSpot CRM', icon: Users, desc: 'Update contact logs and synchronize deals pipeline.' }
      case 'supabase':
        return { label: 'Supabase Storage', icon: Database, desc: 'Store corporate training documents and invoices.' }
      default:
        return { label: toolName, icon: Link2, desc: 'External business connection.' }
    }
  }

  // Generate Google OAuth authorize link dynamically using DB business ID
  const getGoogleAuthLink = (tool: ConnectionType) => {
    const cid = tool.credentials.client_id
    if (!cid || cid === 'sandbox') return '#'
    
    const scopesMap: Record<string, string> = {
      gmail: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
      google_calendar: 'https://www.googleapis.com/auth/calendar.events',
      google_drive: 'https://www.googleapis.com/auth/drive.file',
      google_sheets: 'https://www.googleapis.com/auth/spreadsheets'
    }
    const scopes = encodeURIComponent(scopesMap[tool.tool_name] || '')
    let redirectUrl = 'http://localhost:8000/api/v1/connections/oauth/callback'
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      redirectUrl = `${window.location.origin}/api/v1/connections/oauth/callback`
    }
    const redirect = encodeURIComponent(redirectUrl)
    const state = encodeURIComponent(`${tool.tool_name}:${tool.business_id}`)
    
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cid}&redirect_uri=${redirect}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Live Integrations Hub</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure workspace API connections to grant tools capabilities to hired AI Employees.</p>
      </div>

      {loading ? (
        <div className="py-32 text-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => {
            const tool = getToolDetails(conn.tool_name)
            const ToolIcon = tool.icon
            const isGoogle = ['gmail', 'google_calendar', 'google_drive', 'google_sheets'].includes(conn.tool_name)
            const hasGoogleClientId = conn.credentials.client_id && conn.credentials.client_id !== 'sandbox'

            return (
              <Card key={conn.id} className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between min-h-[380px]">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-blue-400">
                        <ToolIcon size={18} />
                      </span>
                      <div>
                        <CardTitle className="text-white text-sm font-bold">{tool.label}</CardTitle>
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Sync Module</span>
                      </div>
                    </div>
                    {conn.is_connected ? (
                      <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[9px] font-mono flex items-center gap-1">
                        <CheckCircle2 size={10} /> connected
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-500/10 border-zinc-800 text-zinc-400 text-[9px] font-mono">disconnected</Badge>
                    )}
                  </div>
                  <CardDescription className="text-[11px] text-zinc-400 leading-relaxed pt-3 h-12 overflow-hidden">
                    {tool.desc}
                  </CardDescription>
                </CardHeader>

                {/* Scope permissions & logs */}
                <CardContent className="py-3 border-t border-zinc-900 bg-zinc-950/20 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Required permissions:</span>
                    <div className="flex flex-wrap gap-1">
                      {conn.required_permissions.slice(0, 2).map((perm, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] bg-zinc-900 border-zinc-800 text-zinc-400 font-mono py-0 px-1.5 truncate max-w-[150px]">
                          {perm.split('/').pop()}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Recent sync logs:</span>
                      {conn.last_sync && (
                        <span>Last sync: {new Date(conn.last_sync).toLocaleTimeString()}</span>
                      )}
                    </div>
                    <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-lg h-20 overflow-y-auto font-mono text-[9px] space-y-1">
                      {conn.logs.length === 0 ? (
                        <span className="text-zinc-600 italic">No logs recorded.</span>
                      ) : (
                        conn.logs.slice(-3).map((log, i) => (
                          <div key={i} className={`flex items-start gap-1 ${log.type === 'error' ? 'text-red-400' : 'text-zinc-400'}`}>
                            <span>[{log.type === 'error' ? '!' : '✓'}]</span>
                            <span className="break-all">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>

                {/* Actions */}
                <CardContent className="pt-3 pb-3 border-t border-zinc-900 flex gap-2 items-center">
                  {!conn.is_connected ? (
                    <Button
                      onClick={() => {
                        setSelectedTool(conn.tool_name)
                        setIsConnectOpen(true)
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-1.5 rounded-lg h-8 cursor-pointer"
                    >
                      Connect Integration
                    </Button>
                  ) : (
                    <>
                      {isGoogle && hasGoogleClientId && (
                        <a
                          href={getGoogleAuthLink(conn)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] h-8 flex items-center justify-center gap-1 font-semibold"
                        >
                          <ShieldCheck size={13} className="text-blue-400" />
                          OAuth Link
                        </a>
                      )}
                      
                      <Button
                        disabled={testing === conn.tool_name}
                        onClick={() => handleTestConnection(conn.tool_name)}
                        variant="outline"
                        className="bg-transparent border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-[10px] h-8 flex items-center justify-center gap-1 px-3"
                      >
                        <RefreshCw size={11} className={testing === conn.tool_name ? 'animate-spin' : ''} />
                        Test
                      </Button>

                      {conn.tool_name === 'gmail' && (
                        <Button
                          onClick={() => {
                            setSendResult(null)
                            setSendError(null)
                            setRecipientEmail('')
                            setIsSendEmailOpen(true)
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-8 font-semibold px-3 rounded-lg cursor-pointer"
                        >
                          Send Test Email
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => handleDisconnect(conn.tool_name)}
                        className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 text-[10px] h-8 px-2.5 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PowerOff size={11} />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Send Test Email modal */}
      <Dialog open={isSendEmailOpen} onOpenChange={setIsSendEmailOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Mail className="text-blue-400" size={18} /> Send Gmail Test Email
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Test sending an email using your real Google OAuth authorization parameters.
            </DialogDescription>
          </DialogHeader>

          {/* Success View */}
          {sendResult && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span className="font-bold">✅ Email Sent Successfully</span>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Sender:</span>
                  <span className="text-zinc-300 font-mono">{sendResult.sender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Recipient:</span>
                  <span className="text-zinc-300 font-mono">{sendResult.recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Message ID:</span>
                  <span className="text-zinc-300 font-mono break-all max-w-[200px]">{sendResult.message_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Thread ID:</span>
                  <span className="text-zinc-300 font-mono break-all max-w-[200px]">{sendResult.thread_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Timestamp:</span>
                  <span className="text-zinc-300">{new Date(sendResult.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <Button onClick={() => setIsSendEmailOpen(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold py-2">
                Done
              </Button>
            </div>
          )}

          {/* Error View */}
          {sendError && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span className="font-bold">❌ Sending Failed</span>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">HTTP Status:</span>
                  <span className="text-red-400 font-bold">{sendError.status_code || 500}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Error Code:</span>
                  <span className="text-red-400 font-mono">{sendError.code || 500}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Error Message:</span>
                  <span className="text-zinc-300 break-words max-w-[200px] text-right">{sendError.message}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Request ID:</span>
                  <span className="text-zinc-300 font-mono break-all max-w-[200px]">{sendError.request_id || 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => { setSendError(null); setSendResult(null); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold py-2">
                  Retry
                </Button>
                <Button onClick={() => setIsSendEmailOpen(false)} variant="outline" className="flex-1 border-zinc-800 text-zinc-400 text-xs font-semibold py-2">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Standard Input Form */}
          {!sendResult && !sendError && (
            <form onSubmit={handleSendTestEmail} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold">Recipient Email (Optional)</label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter recipient email or leave blank"
                  className="bg-zinc-900 border-zinc-800 text-white text-xs"
                />
                <p className="text-[10px] text-zinc-500 leading-normal">
                  If left empty, this will default to sending to your own authenticated Google account email.
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-lg space-y-1.5 text-xs text-zinc-400">
                <div className="font-semibold text-zinc-300">Subject:</div>
                <div className="font-mono text-zinc-300">Agentra Test Email</div>
                <div className="border-t border-zinc-800 my-1 pt-1 font-semibold text-zinc-300">Body Preview:</div>
                <div className="whitespace-pre-line leading-relaxed italic text-[11px]">
                  {"Congratulations!\n\nYour Gmail integration with Agentra is working successfully.\n\nYour AI Employee can now securely send emails on your behalf.\n\nRegards,\nAgentra AI Workforce"}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsSendEmailOpen(false)} variant="outline" className="flex-1 border-zinc-800 text-zinc-400 text-xs font-semibold py-2.5">
                  Cancel
                </Button>
                <Button type="submit" disabled={sendingEmail} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5">
                  {sendingEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Setup modal */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              Connect {selectedTool && getToolDetails(selectedTool).label}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Setup API access credentials below. Leave values empty to enable Virtual Sandbox Demo mode.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnectSubmit} className="space-y-4 pt-2">
            {/* 1. Google forms */}
            {selectedTool && ['gmail', 'google_calendar', 'google_drive', 'google_sheets'].includes(selectedTool) && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Google Client ID</label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter Google Client ID"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Google Client Secret</label>
                  <Input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter Google Client Secret"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* 2. Slack forms */}
            {selectedTool === 'slack' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Slack Incoming Webhook URL</label>
                  <Input
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Slack Bot OAuth Token</label>
                  <Input
                    type="password"
                    value={slackToken}
                    onChange={(e) => setSlackToken(e.target.value)}
                    placeholder="xoxb-..."
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Default Channel</label>
                  <Input
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    placeholder="#general"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* 3. WhatsApp forms */}
            {selectedTool === 'whatsapp' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Meta Developer Token</label>
                  <Input
                    type="password"
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder="EAA..."
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Phone Number ID</label>
                  <Input
                    value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)}
                    placeholder="e.g. 104239845"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">WhatsApp Business Account ID</label>
                  <Input
                    value={waBusiId}
                    onChange={(e) => setWaBusiId(e.target.value)}
                    placeholder="e.g. 108349503"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* 4. Shopify forms */}
            {selectedTool === 'shopify' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Shopify Admin URL</label>
                  <Input
                    value={shopifyUrl}
                    onChange={(e) => setShopifyUrl(e.target.value)}
                    placeholder="mystore.myshopify.com"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Admin Access Token</label>
                  <Input
                    type="password"
                    value={shopifyToken}
                    onChange={(e) => setShopifyToken(e.target.value)}
                    placeholder="shpat_..."
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* 5. HubSpot forms */}
            {selectedTool === 'hubspot' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">HubSpot Private App Access Token</label>
                  <Input
                    type="password"
                    value={hubspotToken}
                    onChange={(e) => setHubspotToken(e.target.value)}
                    placeholder="pat-na1-..."
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* 6. Supabase forms */}
            {selectedTool === 'supabase' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Supabase Endpoint URL</label>
                  <Input
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://mystore.supabase.co"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Supabase Service Role Key (JWT)</label>
                  <Input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="Enter key"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Bucket Name</label>
                  <Input
                    value={supabaseBucket}
                    onChange={(e) => setSupabaseBucket(e.target.value)}
                    placeholder="invoices"
                    className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={connecting} className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4 text-xs font-semibold py-2.5">
              {connecting ? 'Configuring...' : 'Verify & Enable Connection'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
