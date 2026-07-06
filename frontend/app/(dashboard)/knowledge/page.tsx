'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Upload, PlusCircle, Trash, BookOpen, Search, Sparkles, FileSpreadsheet, Image as ImageIcon, FileCode, CheckCircle2, AlertCircle } from 'lucide-react'

export default function KnowledgePage() {
  const { token } = useAuth()
  
  // Data lists
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Snippet states
  const [snippetTitle, setSnippetTitle] = useState('')
  const [snippetContent, setSnippetContent] = useState('')
  const [isSnippetOpen, setIsSnippetOpen] = useState(false)

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const loadDocuments = async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await api.getDocuments(token)
      setDocuments(data)
    } catch (err) {
      console.error('Error fetching knowledge documents', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [token])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !token) return
    
    const file = files[0]
    setUploading(true)
    try {
      await api.uploadDocumentFile(file, token)
      await loadDocuments()
      alert(`${file.name} uploaded. The AI Operations Agent is parsing text and generating vector chunks in the background.`)
    } catch (err) {
      console.error(err)
      alert('Upload failed.')
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !snippetTitle || !snippetContent) return
    
    try {
      await api.addTextSnippet(snippetTitle, snippetContent, token)
      setSnippetTitle('')
      setSnippetContent('')
      setIsSnippetOpen(false)
      await loadDocuments()
    } catch (err) {
      console.error(err)
      alert('Failed to register snippet.')
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to delete this document? All associated vector embeddings will be permanently purged.')) return
    
    try {
      await api.deleteDocument(docId, token)
      await loadDocuments()
    } catch (err) {
      console.error(err)
      alert('Delete failed.')
    }
  }

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !searchQuery) return
    
    setSearching(true)
    setSearched(true)
    try {
      const data = await api.searchKnowledge(searchQuery, token)
      setSearchResults(data)
    } catch (err) {
      console.error(err)
      alert('Semantic query failed.')
    } finally {
      setSearching(false)
    }
  }

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t === 'pdf') return <FileText className="text-red-400" size={16} />
    if (t === 'docx' || t === 'doc') return <FileText className="text-blue-400" size={16} />
    if (t === 'csv') return <FileSpreadsheet className="text-emerald-400" size={16} />
    if (['png', 'jpg', 'jpeg', 'webp'].includes(t)) return <ImageIcon className="text-purple-400" size={16} />
    return <FileCode className="text-zinc-400" size={16} />
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'indexed':
        return <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono text-[10px]">indexed</Badge>
      case 'indexing':
        return <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 font-mono text-[10px] animate-pulse">indexing</Badge>
      case 'failed':
        return <Badge className="bg-red-500/10 border-red-500/30 text-red-400 font-mono text-[10px]">failed</Badge>
      default:
        return <Badge className="bg-zinc-500/10 border-zinc-500/30 text-zinc-400 font-mono text-[10px]">{status}</Badge>
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="repository" className="w-full">
        {/* Header section with tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Business Knowledge Base</h1>
            <p className="text-sm text-zinc-400 mt-1">Upload guidelines, buyer contracts, and manuals. AI Employees read these prior to fulfillment decisions.</p>
          </div>
          
          <TabsList className="bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
            <TabsTrigger value="repository" className="text-xs px-4 py-2 font-semibold">Repository Base</TabsTrigger>
            <TabsTrigger value="search" className="text-xs px-4 py-2 font-semibold flex items-center gap-1">
              <Sparkles size={12} className="text-blue-400" />
              Semantic Explorer
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Document Repository */}
        <TabsContent value="repository" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* File Upload Trigger */}
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.docx,.doc,.csv,image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className={`bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 inline-flex select-none transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Upload size={14} />
                  {uploading ? 'Parsing & Indexing...' : 'Upload PDF / Word / CSV / Image'}
                </label>
              </div>

              {/* Direct Snippet Trigger */}
              <Dialog open={isSnippetOpen} onOpenChange={setIsSnippetOpen}>
                <DialogTrigger className="border border-zinc-800 hover:bg-zinc-900 bg-transparent text-zinc-300 font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all">
                  <PlusCircle size={14} />
                  Add Direct Rule Snippet
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <DialogHeader>
                    <DialogTitle className="text-white text-base">Write Knowledge Snippet</DialogTitle>
                    <DialogDescription className="text-zinc-400 text-xs">
                      Enter general rules, shipping guidelines, or buyer preferences. They are instantly vectorized.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSnippet} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Snippet Title</label>
                      <Input
                        required
                        value={snippetTitle}
                        onChange={(e) => setSnippetTitle(e.target.value)}
                        placeholder="Acme Corp Shipping Guidelines"
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Snippet Content</label>
                      <textarea
                        required
                        value={snippetContent}
                        onChange={(e) => setSnippetContent(e.target.value)}
                        rows={6}
                        placeholder="Acme Corporation requires all electronic component deliveries to use FedEx Priority Overnight. Payments are subject to Net-30 invoice codings."
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2.5 rounded-lg outline-none focus:border-blue-500 font-sans leading-relaxed"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-2 text-xs font-semibold py-2.5">
                      Save & Index Snippet
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <p className="text-[10px] text-zinc-500 leading-normal max-w-sm text-left sm:text-right">
              Supported: PDF, DOCX, CSV, PNG, JPG. Image OCR extracts text via Gemini 2.5 Pro.
            </p>
          </div>

          {/* Files List Table */}
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-24 text-center">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border border-primary border-t-transparent" />
                </div>
              ) : documents.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-sm flex flex-col items-center justify-center gap-2">
                  <BookOpen size={24} className="text-zinc-600" />
                  <span>No knowledge documents indexed. Upload files to train AI Employees.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-b border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-zinc-800/80">
                      <TableHead className="text-zinc-400 text-xs">File Type</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Document Name</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">File Size</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Created Date</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Indexing Status</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-zinc-900/30 border-zinc-800/40">
                        <TableCell className="text-center w-12">
                          <div className="flex justify-center p-1 rounded bg-zinc-950 border border-zinc-800 w-8">
                            {getFileIcon(doc.type)}
                          </div>
                        </TableCell>
                        <TableCell className="text-white text-xs font-semibold">{doc.name}</TableCell>
                        <TableCell className="text-right text-zinc-300 text-xs font-mono">{formatBytes(doc.size)}</TableCell>
                        <TableCell className="text-right text-zinc-400 text-xs">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDocument(doc.id)}
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

        {/* Tab 2: Semantic search explorer */}
        <TabsContent value="search" className="mt-6 space-y-6">
          <Card className="bg-zinc-900/20 border-zinc-800/80 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-zinc-800/50 flex flex-row items-center gap-2">
              <Sparkles size={18} className="text-blue-400 animate-pulse" />
              <div>
                <CardTitle className="text-white text-base">Semantic RAG Explorer</CardTitle>
                <CardDescription>Enter natural queries. The system embeds text and searches matching document segments via cosine similarity.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSemanticSearch} className="flex gap-2 max-w-2xl">
                <div className="flex items-center gap-2 border border-zinc-800 rounded-lg bg-zinc-950 px-3 py-1.5 focus-within:border-blue-500/80 transition-all w-full">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    required
                    type="text"
                    placeholder="Enter query (e.g. 'What are the payment terms for Oscorp?')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500 w-full font-sans"
                  />
                </div>
                <Button type="submit" disabled={searching} className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 h-9">
                  {searching ? 'Querying...' : 'Semantic Search'}
                </Button>
              </form>

              {/* Search Results list */}
              <div className="mt-6 space-y-4">
                {searching ? (
                  <div className="py-12 text-center">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border border-primary border-t-transparent" />
                  </div>
                ) : searched && searchResults.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-1.5">
                    <AlertCircle size={14} />
                    No semantically matching passages found. Try uploading rules guidelines documents first.
                  </div>
                ) : (
                  searchResults.map((res, idx) => (
                    <Card key={res.chunk_id} className="bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 transition-all duration-300">
                      <CardHeader className="py-2.5 px-4 bg-zinc-900/35 border-b border-zinc-900 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">Passage {idx + 1}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[10px] text-blue-400 font-mono font-semibold">{res.document_name}</span>
                        </div>
                        <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-400 text-[10px] font-mono">
                          Match: {Math.round(res.score * 100)}%
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans italic">
                          &ldquo;{res.text}&rdquo;
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
