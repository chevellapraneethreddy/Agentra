from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Base ORM config helper
class ORMModel(BaseModel):
    class Config:
        from_attributes = True

# User Schemas
class UserProfile(ORMModel):
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: datetime

# Business Schemas
class BusinessBase(ORMModel):
    name: str

class BusinessCreate(BusinessBase):
    pass

class Business(BusinessBase):
    id: str
    owner_id: str
    created_at: datetime

# Employee / Agent Config
class AgentConfigBase(ORMModel):
    name: str
    role: str
    goal: Optional[str] = None
    status: str  # idle, running, paused
    system_prompt: str
    temperature: float
    capabilities: List[str]
    triggers: List[str]
    permissions: List[str]
    tools: List[str]
    knowledge_ids: List[str]
    workflows: List[str]
    completed_tasks: int
    avg_response_time: float
    productivity_score: int
    business_impact: float

class AgentConfigCreate(BaseModel):
    name: str
    role: str
    goal: str
    system_prompt: str
    temperature: float = 0.15
    capabilities: List[str] = []
    triggers: List[str] = []
    permissions: List[str] = []
    tools: List[str] = []
    knowledge_ids: List[str] = []
    workflows: List[str] = []

class AgentConfigUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    capabilities: Optional[List[str]] = None
    triggers: Optional[List[str]] = None
    permissions: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    knowledge_ids: Optional[List[str]] = None
    workflows: Optional[List[str]] = None
    completed_tasks: Optional[int] = None
    avg_response_time: Optional[float] = None
    productivity_score: Optional[int] = None
    business_impact: Optional[float] = None

class AgentConfig(AgentConfigBase):
    id: str
    business_id: str
    created_at: datetime

# Customer Schemas
class CustomerBase(ORMModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Customer(CustomerBase):
    id: str
    business_id: str
    created_at: datetime

# Product Schemas
class ProductBase(ORMModel):
    name: str
    sku: str
    price: float
    description: Optional[str] = None

class ProductCreate(ProductBase):
    quantity: int = 0  # To easily initialize inventory at the same time
    safety_threshold: int = 5

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None

class Product(ProductBase):
    id: str
    business_id: str
    created_at: datetime

# Inventory Schemas
class InventoryBase(ORMModel):
    product_id: str
    quantity: int
    safety_threshold: int = 5
    status: str = "in_stock"  # in_stock, low_stock, out_of_stock

class InventoryUpdateQuantity(BaseModel):
    quantity: int
    safety_threshold: Optional[int] = None

class InventoryItem(ORMModel):
    id: str
    product_id: str
    business_id: str
    quantity: int
    safety_threshold: int
    status: str
    updated_at: datetime
    product: Optional[Product] = None

# Order Schemas
class OrderBase(ORMModel):
    customer_id: str
    total: float
    status: str = "pending" # pending, processing, completed, failed
    items: List[Dict[str, Any]] # product_id, sku, name, quantity, price

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    total: Optional[float] = None
    items: Optional[List[Dict[str, Any]]] = None

class Order(OrderBase):
    id: str
    business_id: str
    created_at: datetime
    agent_actions: List[str] = [] # Read dynamically from activities logs
    customer: Optional[Customer] = None

# Invoice Schemas
class InvoiceBase(ORMModel):
    order_id: str
    invoice_number: str
    amount: float
    status: str = "draft" # draft, sent, paid, void
    issued_at: datetime

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[float] = None
    invoice_number: Optional[str] = None

class Invoice(InvoiceBase):
    id: str
    business_id: str
    created_at: datetime
    order: Optional[Order] = None

# Tasks Schemas
class TaskBase(ORMModel):
    title: str
    status: str = "pending"
    employee_id: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    employee_id: Optional[str] = None

class Task(TaskBase):
    id: str
    business_id: str
    run_count: int
    last_run: Optional[datetime] = None
    created_at: datetime
    logs: List[Dict[str, Any]] = [] # Read dynamically from activities logs

# Activities (Logs) Schemas
class ActivityBase(ORMModel):
    message: str
    type: str # info, warning, error, action
    task_id: Optional[str] = None
    order_id: Optional[str] = None

class Activity(ActivityBase):
    id: str
    business_id: str
    created_at: datetime

# Knowledge Document Schemas
class DocumentBase(ORMModel):
    name: str
    type: str
    size: int

class Document(DocumentBase):
    id: str
    business_id: str
    status: str
    created_at: datetime

class TextSnippetCreate(BaseModel):
    title: str
    content: str

# Analytics Summary Schemas
class DailyMetric(BaseModel):
    date: str
    executions: int
    cost_saved: float
    tokens_used: int

class AnalyticsSummary(BaseModel):
    total_executions: int
    success_rate: float
    avg_execution_time: float
    total_tokens: int
    cost_saved: float
    daily_metrics: List[DailyMetric]

# Tool Connection Schemas
class ToolConnectionBase(ORMModel):
    tool_name: str
    is_connected: bool
    last_sync: Optional[datetime] = None
    logs: List[Dict[str, Any]] = []
    required_permissions: List[str] = []
    credentials: Optional[Dict[str, Any]] = None

class ToolConnectionCreate(BaseModel):
    credentials: Dict[str, Any]
    required_permissions: Optional[List[str]] = None

class ToolConnection(ToolConnectionBase):
    id: str
    business_id: str
    updated_at: datetime

# Memory Schemas
class MemoryBase(ORMModel):
    category: str
    key: str
    content: str
    impact_count: int

class MemoryCreate(BaseModel):
    category: str
    key: str
    content: str

class Memory(MemoryBase):
    id: str
    business_id: str
    last_updated: datetime
    created_at: datetime

# Workflow Schemas
class WorkflowBase(ORMModel):
    name: str
    trigger_type: str
    conditions: Dict[str, Any] = {}
    steps: List[Any] = []
    is_active: bool = True

class WorkflowCreate(BaseModel):
    name: str
    trigger_type: str
    conditions: Optional[Dict[str, Any]] = {}
    steps: List[Any]
    is_active: Optional[bool] = True

class Workflow(WorkflowBase):
    id: str
    business_id: str
    created_at: datetime

# WorkflowHistory Schemas
class WorkflowHistoryBase(ORMModel):
    workflow_id: str
    trigger_source: str
    input_payload: Dict[str, Any] = {}
    ai_decision: Optional[Dict[str, Any]] = None
    actions_performed: List[Dict[str, Any]] = []
    status: str
    errors: Optional[str] = None
    retries: int = 0
    execution_time: datetime

class WorkflowHistory(WorkflowHistoryBase):
    id: str
    business_id: str
    created_at: datetime

# Studio Prompt Schemas
class StudioPromptBase(ORMModel):
    name: str
    description: Optional[str] = ""
    category: str
    system_prompt: str
    goal: Optional[str] = ""
    rules: List[str] = []
    output_format: Optional[str] = ""
    memory_enabled: bool = True
    knowledge_enabled: bool = True
    enabled_tools: List[str] = []
    version: str = "1.0.0"
    status: str = "draft"

class StudioPromptCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str
    system_prompt: str
    goal: Optional[str] = ""
    rules: List[str] = []
    output_format: Optional[str] = ""
    memory_enabled: bool = True
    knowledge_enabled: bool = True
    enabled_tools: List[str] = []
    version: str = "1.0.0"
    status: str = "draft"

class StudioPromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    system_prompt: Optional[str] = None
    goal: Optional[str] = None
    rules: Optional[List[str]] = None
    output_format: Optional[str] = None
    memory_enabled: Optional[bool] = None
    knowledge_enabled: Optional[bool] = None
    enabled_tools: Optional[List[str]] = None
    version: Optional[str] = None
    status: Optional[str] = None

class StudioPrompt(StudioPromptBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime


