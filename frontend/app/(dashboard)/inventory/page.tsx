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
import { Search, PackageCheck, AlertTriangle, AlertCircle, RefreshCw, PlusCircle, Trash, PackageOpen } from 'lucide-react'

export default function InventoryPage() {
  const { token } = useAuth()
  
  // Data states
  const [inventory, setInventory] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchStock, setSearchStock] = useState('')
  const [searchCatalog, setSearchCatalog] = useState('')
  
  // Inventory Edit states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingQty, setEditingQty] = useState<number>(0)
  const [editingSafety, setEditingSafety] = useState<number>(5)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Product Create states
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodSku, setProdSku] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodQty, setProdQty] = useState('10')
  const [prodSafety, setProdSafety] = useState('5')

  const loadData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const [inventoryData, productsData] = await Promise.all([
        api.getInventory(token),
        api.getProducts(token)
      ])
      setInventory(inventoryData)
      setProducts(productsData)
    } catch (err) {
      console.error('Error fetching inventory page data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const handleSaveQuantity = async (itemId: string) => {
    if (!token) return
    setUpdatingId(itemId)
    try {
      await api.updateInventoryQuantity(itemId, editingQty, token)
      setEditingId(null)
      await loadData()
    } catch (err) {
      console.error('Failed to update quantity', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStartEdit = (item: any) => {
    setEditingId(item.id)
    setEditingQty(item.quantity)
    setEditingSafety(item.safety_threshold)
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !prodName || !prodSku || !prodPrice) return
    try {
      await api.createProduct({
        name: prodName,
        sku: prodSku,
        price: parseFloat(prodPrice),
        description: prodDesc || undefined,
        quantity: parseInt(prodQty) || 0,
        safety_threshold: parseInt(prodSafety) || 5
      }, token)
      setProdName('')
      setProdSku('')
      setProdPrice('')
      setProdDesc('')
      setProdQty('10')
      setProdSafety('5')
      setIsCreateProductOpen(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to create product')
    }
  }

  const handleDeleteProduct = async (prodId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to delete this product? All inventory logs will be purged.')) return
    try {
      await api.deleteProduct(prodId, token)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete product')
    }
  }

  // Filter lists
  const filteredStock = inventory.filter(
    (item) =>
      item.product?.name.toLowerCase().includes(searchStock.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(searchStock.toLowerCase())
  )

  const filteredCatalog = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchCatalog.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in_stock':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono">in_stock</Badge>
      case 'low_stock':
        return <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 font-mono">low_stock</Badge>
      case 'out_of_stock':
        return <Badge className="bg-red-500/10 border-red-500/30 text-red-400 font-mono">out_of_stock</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono">{status}</Badge>
    }
  }

  // Calculate totals
  const totalItems = inventory.reduce((acc, curr) => acc + curr.quantity, 0)
  const lowStockItems = inventory.filter((item) => item.status === 'low_stock')
  const outOfStockItems = inventory.filter((item) => item.status === 'out_of_stock')

  return (
    <div className="space-y-6">
      <Tabs defaultValue="stock" className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Warehouse Inventory</h1>
            <p className="text-sm text-zinc-400 mt-1">Real-time SKU quantities and product listings catalog.</p>
          </div>
          
          <TabsList className="bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
            <TabsTrigger value="stock" className="text-xs px-4 py-2 font-semibold">Stock Levels</TabsTrigger>
            <TabsTrigger value="catalog" className="text-xs px-4 py-2 font-semibold">Product Catalog</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Stock levels */}
        <TabsContent value="stock" className="mt-6 space-y-6">
          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Units in Stock</span>
                <PackageCheck className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white font-mono">{loading ? '...' : totalItems}</div>
                <p className="text-xs text-zinc-500 mt-1">Across all registered SKUs</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Low Stock Warnings</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-400 font-mono">{loading ? '...' : lowStockItems.length}</div>
                <p className="text-xs text-zinc-500 mt-1">Items below safety margin</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Critical Stockouts</span>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400 font-mono">{loading ? '...' : outOfStockItems.length}</div>
                <p className="text-xs text-zinc-500 mt-1">Items requiring urgent re-ordering</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 max-w-sm border border-zinc-800 rounded-lg bg-zinc-950 px-3 py-1.5 focus-within:border-blue-500/80 transition-all w-full">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search stock by SKU, product name..."
                value={searchStock}
                onChange={(e) => setSearchStock(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
              />
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 text-xs h-9"
            >
              <RefreshCw size={14} /> Reload
            </Button>
          </div>

          {/* Stock Levels table */}
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-24 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
                </div>
              ) : filteredStock.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-sm">
                  No stock allocations registered.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-zinc-800/80">
                      <TableHead className="text-zinc-400 text-xs">SKU</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Product Name</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Safety Threshold</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Available Qty</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Status</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.map((item) => (
                      <TableRow key={item.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                        <TableCell className="font-mono text-zinc-400 text-xs">{item.product?.sku}</TableCell>
                        <TableCell className="text-white text-xs font-semibold">{item.product?.name}</TableCell>
                        <TableCell className="text-right text-zinc-300 text-xs font-mono">{item.safety_threshold}</TableCell>
                        <TableCell className="text-right text-zinc-200 text-xs font-mono">
                          {editingId === item.id ? (
                            <div className="flex justify-end">
                              <Input
                                type="number"
                                value={editingQty}
                                onChange={(e) => setEditingQty(parseInt(e.target.value) || 0)}
                                className="w-20 bg-zinc-950 border-zinc-800 text-white text-right h-7 text-xs font-mono"
                              />
                            </div>
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell className="text-right">{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          {editingId === item.id ? (
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                disabled={updatingId === item.id}
                                onClick={() => handleSaveQuantity(item.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-2.5"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                                className="bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-300 text-xs h-7 px-2.5"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(item)}
                              className="bg-transparent border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs h-7"
                            >
                              Modify Stock
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

        {/* Tab 2: Products Catalog */}
        <TabsContent value="catalog" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 max-w-sm border border-zinc-800 rounded-lg bg-zinc-950 px-3 py-1.5 focus-within:border-blue-500/80 transition-all w-full">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search catalog by SKU, product name..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
              />
            </div>

            {/* Create Product Dialog */}
            <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
              <DialogTrigger className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer text-xs">
                <PlusCircle size={14} />
                Register SKU Product
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                <DialogHeader>
                  <DialogTitle className="text-white text-base">Create SKU Product</DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs">
                    Write a new product catalog definition into the database. Autogenerates matching inventory logs.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateProduct} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 font-medium">Product Title</label>
                    <Input
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Super Computer Microchip"
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">SKU Code</label>
                      <Input
                        required
                        value={prodSku}
                        onChange={(e) => setProdSku(e.target.value)}
                        placeholder="MCHP-SUP-901"
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Unit Price ($ USD)</label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="145.00"
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Initial Quantity</label>
                      <Input
                        type="number"
                        value={prodQty}
                        onChange={(e) => setProdQty(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Safety threshold</label>
                      <Input
                        type="number"
                        value={prodSafety}
                        onChange={(e) => setProdSafety(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 font-medium">Catalog description</label>
                    <Input
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      placeholder="High-performance integrated processor core..."
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-2 text-xs font-semibold py-2.5">
                    Publish SKU to DB Catalog
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Product Catalog table */}
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-24 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-sm">
                  No products cataloged in database.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-zinc-800/80">
                      <TableHead className="text-zinc-400 text-xs">SKU</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Product Name</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Description</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Unit Price</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCatalog.map((prod) => (
                      <TableRow key={prod.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                        <TableCell className="font-mono text-zinc-400 text-xs">{prod.sku}</TableCell>
                        <TableCell className="text-white text-xs font-semibold">{prod.name}</TableCell>
                        <TableCell className="text-zinc-400 text-xs truncate max-w-[250px]">{prod.description || 'N/A'}</TableCell>
                        <TableCell className="text-right text-zinc-200 text-xs font-mono">${prod.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(prod.id)}
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
