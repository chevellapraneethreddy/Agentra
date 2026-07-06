const getApiBaseUrl = () => {
  // Check if window is defined (browser side execution)
  if (typeof window !== 'undefined') {
    const host = window.location.host
    // Match Codespaces app.github.dev or gitpod.io workspaces URLs
    if (host.includes('.app.github.dev') || host.includes('.gitpod.io')) {
      // Reconstruct port 8000 URL from port 3005 URL structure
      const backendHost = host.replace('-3005.', '-8000.').replace('3005-', '8000-')
      return `${window.location.protocol}//${backendHost}/api/v1`
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
}

const API_BASE_URL = getApiBaseUrl()

interface FetchOptions extends RequestInit {
  token?: string | null
}

export async function apiCall(endpoint: string, options: FetchOptions = {}) {
  const { token, headers, ...rest } = options

  const defaultHeaders: Record<string, string> = {}
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  if (!(rest.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json'
  }

  const requestUrl = `${API_BASE_URL}${endpoint}`
  const method = rest.method || 'GET'
  
  console.log(`[API Request] Dispatching: ${method} ${requestUrl}`, {
    headers: { ...defaultHeaders, ...headers },
    body: rest.body
  })

  let response: Response
  try {
    response = await fetch(requestUrl, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      } as any,
    })
  } catch (err: any) {
    console.error(`[API Network Error] Connection failed for ${method} ${requestUrl}:`, err)
    throw new Error(
      `Network connection failed to ${requestUrl}. Actual error: ${err.message || err.toString()}. ` +
      `Please ensure the FastAPI backend is running (typically 'python run.py' on port 8000).`
    )
  }

  console.log(`[API Response] Status ${response.status} for ${method} ${endpoint}`)

  if (!response.ok) {
    if (response.status === 204) {
      return null
    }
    const errText = await response.text()
    console.error(`[API Error Response] Status ${response.status} | Payload:`, errText)
    
    let errorDetail = 'API call failed'
    try {
      const parsed = JSON.parse(errText)
      errorDetail = parsed.detail || errorDetail
    } catch {
      errorDetail = errText || errorDetail
    }
    throw new Error(errorDetail)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

// API Endpoints helpers
export const api = {
  // Orders
  getOrders: (token: string | null) => 
    apiCall('/orders/', { token }),
  createOrder: (order: { customer_id: string; total: number; items: any[] }, token: string | null) => 
    apiCall('/orders/', { token, method: 'POST', body: JSON.stringify(order) }),
  triggerOrderExecution: (orderId: string, token: string | null) => 
    apiCall(`/orders/${orderId}/trigger`, { token, method: 'POST' }),

  // Inventory
  getInventory: (token: string | null) => 
    apiCall('/inventory/', { token }),
  updateInventoryQuantity: (itemId: string, quantity: number, token: string | null) => 
    apiCall(`/inventory/${itemId}/quantity`, { 
      token, 
      method: 'PUT', 
      body: JSON.stringify({ quantity }) 
    }),

  // Tasks
  getTasks: (token: string | null) => 
    apiCall('/tasks/', { token }),
  runTask: (taskId: string, token: string | null) => 
    apiCall(`/tasks/${taskId}/run`, { token, method: 'POST' }),

  // AI Employee Configuration & Management
  getEmployees: (token: string | null) => 
    apiCall('/employee/', { token }),
  hireEmployee: (payload: any, token: string | null) => 
    apiCall('/employee/', { token, method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (empId: string, payload: any, token: string | null) => 
    apiCall(`/employee/${empId}`, { token, method: 'PUT', body: JSON.stringify(payload) }),
  terminateEmployee: (empId: string, token: string | null) => 
    apiCall(`/employee/${empId}`, { token, method: 'DELETE' }),


  // Knowledge Base
  getDocuments: (token: string | null) => 
    apiCall('/knowledge/documents', { token }),
  uploadDocumentFile: (file: File, token: string | null) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiCall('/knowledge/documents', { 
      token, 
      method: 'POST', 
      body: formData 
    })
  },
  addTextSnippet: (title: string, content: string, token: string | null) => 
    apiCall('/knowledge/snippets', { 
      token, 
      method: 'POST', 
      body: JSON.stringify({ title, content }) 
    }),
  deleteDocument: (docId: string, token: string | null) => 
    apiCall(`/knowledge/documents/${docId}`, { token, method: 'DELETE' }),

  // Analytics
  getAnalytics: (token: string | null) => 
    apiCall('/analytics/summary', { token }),

  // Products CRUD
  getProducts: (token: string | null) =>
    apiCall('/products/', { token }),
  createProduct: (product: { name: string; sku: string; price: number; description?: string; quantity?: number; safety_threshold?: number }, token: string | null) =>
    apiCall('/products/', { token, method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (productId: string, product: any, token: string | null) =>
    apiCall(`/products/${productId}`, { token, method: 'PUT', body: JSON.stringify(product) }),
  deleteProduct: (productId: string, token: string | null) =>
    apiCall(`/products/${productId}`, { token, method: 'DELETE' }),

  // Customers CRUD
  getCustomers: (token: string | null) =>
    apiCall('/customers/', { token }),
  createCustomer: (customer: { name: string; email: string; phone?: string; address?: string }, token: string | null) =>
    apiCall('/customers/', { token, method: 'POST', body: JSON.stringify(customer) }),
  updateCustomer: (customerId: string, customer: any, token: string | null) =>
    apiCall(`/customers/${customerId}`, { token, method: 'PUT', body: JSON.stringify(customer) }),
  deleteCustomer: (customerId: string, token: string | null) =>
    apiCall(`/customers/${customerId}`, { token, method: 'DELETE' }),

  // Invoices CRUD
  getInvoices: (token: string | null) =>
    apiCall('/invoices/', { token }),
  createInvoice: (invoice: { order_id: string; invoice_number: string; amount: number; status: string; issued_at: string }, token: string | null) =>
    apiCall('/invoices/', { token, method: 'POST', body: JSON.stringify(invoice) }),
  updateInvoice: (invoiceId: string, invoice: any, token: string | null) =>
    apiCall(`/invoices/${invoiceId}`, { token, method: 'PUT', body: JSON.stringify(invoice) }),
  deleteInvoice: (invoiceId: string, token: string | null) =>
    apiCall(`/invoices/${invoiceId}`, { token, method: 'DELETE' }),

  // Tool Connections API
  getConnections: (token: string | null) =>
    apiCall('/connections/', { token }),
  connectTool: (toolName: string, credentials: any, token: string | null) =>
    apiCall(`/connections/${toolName}/connect`, { token, method: 'POST', body: JSON.stringify({ credentials }) }),
  disconnectTool: (toolName: string, token: string | null) =>
    apiCall(`/connections/${toolName}`, { token, method: 'DELETE' }),
  testConnection: (toolName: string, token: string | null) =>
    apiCall(`/connections/${toolName}/test`, { token, method: 'POST' }),
  sendTestEmail: (recipientEmail: string | null, token: string | null) =>
    apiCall('/connections/gmail/send-test', { token, method: 'POST', body: JSON.stringify({ recipient_email: recipientEmail }) }),

  // AI Workflows API
  getWorkflows: (token: string | null) =>
    apiCall('/workflows/', { token }),
  createWorkflow: (workflow: any, token: string | null) =>
    apiCall('/workflows/', { token, method: 'POST', body: JSON.stringify(workflow) }),
  updateWorkflow: (workflowId: string, workflow: any, token: string | null) =>
    apiCall(`/workflows/${workflowId}`, { token, method: 'PUT', body: JSON.stringify(workflow) }),
  deleteWorkflow: (workflowId: string, token: string | null) =>
    apiCall(`/workflows/${workflowId}`, { token, method: 'DELETE' }),
  runWorkflow: (workflowId: string, payload: any, token: string | null) =>
    apiCall(`/workflows/run/${workflowId}`, { token, method: 'POST', body: JSON.stringify(payload) }),
  getWorkflowHistory: (token: string | null) =>
    apiCall('/workflows/history', { token }),

  // Semantic RAG Search
  searchKnowledge: (query: string, token: string | null) =>
    apiCall('/knowledge/search', { token, method: 'POST', body: JSON.stringify({ query }) }),

  // AI Memory API
  getMemories: (token: string | null) =>
    apiCall('/memory/', { token }),
  deleteMemory: (memoryId: string, token: string | null) =>
    apiCall(`/memory/${memoryId}`, { token, method: 'DELETE' }),
}
