'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Play, Search, PlusCircle, Trash, ListTodo, AlertTriangle, UserPlus, ShoppingBag, Plus, Sparkles } from 'lucide-react'

export default function OrdersPage() {
  const { token } = useAuth()
  
  // Data lists
  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchOrders, setSearchOrders] = useState('')
  const [searchCustomers, setSearchCustomers] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  
  // Order Dialog states
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductQty, setSelectedProductQty] = useState(1)
  
  // Customer Dialog states
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false)
  const [custName, setCustName] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custAddress, setCustAddress] = useState('')

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const [ordersData, customersData, productsData] = await Promise.all([
        api.getOrders(token),
        api.getCustomers(token),
        api.getProducts(token)
      ])
      setOrders(ordersData)
      setCustomers(customersData)
      setProducts(productsData)
      
      // Default selects
      if (customersData.length > 0) setSelectedCustomerId(customersData[0].id)
      if (productsData.length > 0) setSelectedProductId(productsData[0].id)
    } catch (err) {
      console.error('Error fetching orders page data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !custName || !custEmail) return
    try {
      await api.createCustomer({
        name: custName,
        email: custEmail,
        phone: custPhone || undefined,
        address: custAddress || undefined
      }, token)
      setCustName('')
      setCustEmail('')
      setCustPhone('')
      setCustAddress('')
      setIsCreateCustomerOpen(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to create customer')
    }
  }

  const handleDeleteCustomer = async (custId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      await api.deleteCustomer(custId, token)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Cannot delete customer')
    }
  }

  const addProductToOrder = () => {
    const prod = products.find(p => p.id === selectedProductId)
    if (!prod) return
    
    // Check if already in order items
    const existing = orderItems.find(item => item.product_id === selectedProductId)
    if (existing) {
      setOrderItems(prev => prev.map(item => 
        item.product_id === selectedProductId 
          ? { ...item, quantity: item.quantity + selectedProductQty } 
          : item
      ))
    } else {
      setOrderItems(prev => [...prev, {
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        quantity: selectedProductQty
      }])
    }
  }

  const removeProductFromOrder = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.product_id !== productId))
  }

  const calculateOrderTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedCustomerId || orderItems.length === 0) return
    
    try {
      const orderPayload = {
        customer_id: selectedCustomerId,
        total: calculateOrderTotal(),
        items: orderItems
      }
      await api.createOrder(orderPayload, token)
      setOrderItems([])
      setIsCreateOrderOpen(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to create order')
    }
  }

  const triggerAgent = async (orderId: string) => {
    if (!token) return
    setActionLoading(orderId)
    try {
      const updatedOrder = await api.triggerOrderExecution(orderId, token)
      await loadData()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute operations agent')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter lists
  const filteredOrders = orders.filter(
    (order) =>
      order.customer?.name.toLowerCase().includes(searchOrders.toLowerCase()) ||
      order.id.toLowerCase().includes(searchOrders.toLowerCase())
  )

  const filteredCustomers = customers.filter(
    (cust) =>
      cust.name.toLowerCase().includes(searchCustomers.toLowerCase()) ||
      cust.email.toLowerCase().includes(searchCustomers.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono">completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono animate-pulse">processing</Badge>
      case 'failed':
        return <Badge className="bg-red-500/10 border-red-500/30 text-red-400 font-mono">failed</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="orders" className="w-full">
        {/* Header section with tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Fulfillment Operations</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage orders and customer accounts processed by AI Employees.</p>
          </div>
          
          <TabsList className="bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
            <TabsTrigger value="orders" className="text-xs px-4 py-2 font-semibold">Orders Queue</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs px-4 py-2 font-semibold">Customers Registry</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Orders Queue */}
        <TabsContent value="orders" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 max-w-sm border border-zinc-800 rounded-lg bg-zinc-950 px-3 py-1.5 focus-within:border-blue-500/80 transition-all w-full">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search by ID, customer..."
                value={searchOrders}
                onChange={(e) => setSearchOrders(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
              />
            </div>

            {/* Create Order Dialog */}
            <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
              <DialogTrigger className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer text-xs">
                <ShoppingBag size={14} />
                Deploy Simulation Order
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white text-base">Compile Simulation Order</DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Choose customer details and attach product items. Auto-calculates billing.
                  </DialogDescription>
                </DialogHeader>
                
                {customers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No customers found. Please add a customer in the Customers registry tab first.
                  </div>
                ) : (
                  <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-semibold">Select Customer</label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2 text-xs focus:border-blue-500 outline-none"
                      >
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-zinc-900 pt-3 space-y-2">
                      <label className="text-xs text-zinc-300 font-semibold">Add Catalog Items</label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-zinc-500">Product</span>
                          <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2 text-xs focus:border-blue-500 outline-none"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)})</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20 space-y-1">
                          <span className="text-[10px] text-zinc-500">Qty</span>
                          <Input
                            type="number"
                            min="1"
                            value={selectedProductQty}
                            onChange={(e) => setSelectedProductQty(parseInt(e.target.value) || 1)}
                            className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={addProductToOrder}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white h-9 px-3 flex items-center gap-1 text-xs"
                        >
                          <Plus size={14} /> Add
                        </Button>
                      </div>
                    </div>

                    {/* Order items lists */}
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Added Items:</span>
                      {orderItems.length === 0 ? (
                        <p className="text-xs text-zinc-600 italic">No items added to checkouts.</p>
                      ) : (
                        orderItems.map((item) => (
                          <div key={item.product_id} className="flex justify-between items-center bg-zinc-900/60 border border-zinc-900 p-2 rounded-lg text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{item.name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">SKU: {item.sku} × {item.quantity}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-zinc-300">${(item.price * item.quantity).toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => removeProductFromOrder(item.product_id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Summary cost */}
                    <div className="border-t border-zinc-900 pt-3 flex justify-between items-center">
                      <span className="text-xs text-zinc-400 font-semibold">Computed Invoice Total:</span>
                      <span className="text-lg font-bold text-white font-mono">${calculateOrderTotal().toFixed(2)}</span>
                    </div>

                    <Button type="submit" disabled={orderItems.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4 text-xs font-semibold py-2.5">
                      Publish Order payload to DB
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Orders table */}
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-24 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-sm">
                  No orders registered in database.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-zinc-800/80">
                      <TableHead className="text-zinc-400 text-xs">ID</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Customer Name</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Item Summary</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Order Total</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Status</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                        <TableCell className="font-mono text-zinc-400 text-xs">{order.id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-white text-xs font-semibold">
                          {order.customer?.name || 'Unknown customer'}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs truncate max-w-[200px]">
                          {order.items.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')}
                        </TableCell>
                        <TableCell className="text-right text-zinc-200 text-xs font-mono">${order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailsOpen(true)
                            }}
                            className="bg-transparent border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs h-7"
                          >
                            Trace logs
                          </Button>
                          
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              disabled={actionLoading === order.id}
                              onClick={() => triggerAgent(order.id)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7 flex inline-flex items-center gap-1"
                            >
                              {actionLoading === order.id ? (
                                <>
                                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                                  Agent running...
                                </>
                              ) : (
                                <>
                                  <Play size={10} fill="currentColor" />
                                  Autopilot Fulfill
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Customers Registry */}
        <TabsContent value="customers" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 max-w-sm border border-zinc-800 rounded-lg bg-zinc-950 px-3 py-1.5 focus-within:border-blue-500/80 transition-all w-full">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search by customer name, email..."
                value={searchCustomers}
                onChange={(e) => setSearchCustomers(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
              />
            </div>

            {/* Create Customer Dialog */}
            <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
              <DialogTrigger className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer text-xs">
                <UserPlus size={14} />
                Register Client Profile
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                <DialogHeader>
                  <DialogTitle className="text-white text-base">Register Client Profile</DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Write client profile details into the PostgreSQL customers registry.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 font-medium">Business / Client Name</label>
                    <Input
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Oscorp Industries"
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 font-medium">Contact Email</label>
                    <Input
                      required
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="oscorp@billing.com"
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 font-medium">Phone</label>
                    <Input
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="1-800-444-9900"
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 font-medium">Address</label>
                    <Input
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="12 New York Ave, Manhattan, NY"
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-2 text-xs font-semibold py-2.5">
                    Commit Profile to database
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Customers Registry table */}
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-24 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-sm">
                  No clients profiles registered.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-zinc-800/80">
                      <TableHead className="text-zinc-400 text-xs">Customer Name</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Contact Email</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Phone Number</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Billing Address</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((cust) => (
                      <TableRow key={cust.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                        <TableCell className="text-white text-xs font-semibold">{cust.name}</TableCell>
                        <TableCell className="text-zinc-300 text-xs font-mono">{cust.email}</TableCell>
                        <TableCell className="text-zinc-400 text-xs">{cust.phone || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400 text-xs truncate max-w-[200px]">{cust.address || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCustomer(cust.id)}
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

      {/* Details Dialog displaying agent traces */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader className="border-b border-zinc-800 pb-4">
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="text-white text-sm flex items-center gap-2">
                    <span>Order Trace:</span>
                    <span className="font-mono text-zinc-400 text-xs">{selectedOrder.id.slice(0, 8)}...</span>
                  </DialogTitle>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <DialogDescription className="text-zinc-400 text-xs mt-1">
                  Full LangGraph agent reasoning steps and execution logs retrieved from PostgreSQL.
                </DialogDescription>
              </DialogHeader>

              {/* Order Info Panel */}
              <div className="grid grid-cols-3 gap-4 py-4 text-xs border-b border-zinc-800 bg-zinc-900/10 rounded-lg px-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">Customer</span>
                  <span className="text-white font-semibold">{selectedOrder.customer?.name || 'Loading...'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">Total Cost</span>
                  <span className="text-white font-semibold font-mono">${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">Time Received</span>
                  <span className="text-zinc-300">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Agent Traces Section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <ListTodo size={14} className="text-blue-400" />
                  AI Employee Agent State Traces
                </h3>
                
                <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-4">
                  {selectedOrder.agent_actions.map((action: string, idx: number) => {
                    const isLast = idx === selectedOrder.agent_actions.length - 1
                    return (
                      <div key={idx} className="relative text-xs">
                        <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border ${
                          isLast && selectedOrder.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-400 ring-2 ring-emerald-500/20'
                            : isLast && selectedOrder.status === 'failed'
                            ? 'bg-red-500 border-red-400 ring-2 ring-red-500/20'
                            : 'bg-zinc-800 border-zinc-700'
                        }`} />
                        
                        <p className={`font-sans leading-relaxed ${isLast ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                          {action}
                        </p>
                      </div>
                    )
                  })}
                  {selectedOrder.agent_actions.length === 0 && (
                    <p className="text-xs text-zinc-500 italic pl-1">Awaiting LangGraph agent trigger run...</p>
                  )}
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex justify-between items-center border-t border-zinc-800 pt-4 mt-6">
                <span className="text-[10px] text-zinc-500">Authorized Gemini 2.5 Pro LangGraph executor trace.</span>
                
                {selectedOrder.status === 'pending' && (
                  <Button
                    size="sm"
                    disabled={actionLoading === selectedOrder.id}
                    onClick={() => triggerAgent(selectedOrder.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 text-xs"
                  >
                    <Play size={12} fill="currentColor" />
                    Fulfill Order Now
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
