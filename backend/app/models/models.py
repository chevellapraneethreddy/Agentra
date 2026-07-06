from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Numeric
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True) # Matching Supabase Auth UUID
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    businesses = relationship("Business", back_populates="owner", cascade="all, delete-orphan")

class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False, default="My GaaS Business")
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="businesses")
    employees = relationship("Employee", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    inventory_items = relationship("Inventory", back_populates="business", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="business", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="business", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="business", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="business", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="business", cascade="all, delete-orphan")
    documents = relationship("KnowledgeDocument", back_populates="business", cascade="all, delete-orphan")
    tool_connections = relationship("ToolConnection", back_populates="business", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="business", cascade="all, delete-orphan")

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, default="Operations Agent")
    role = Column(String, nullable=False, default="Business Operations Executive")
    goal = Column(String, nullable=True)
    status = Column(String, nullable=False, default="idle") # idle, running, paused
    system_prompt = Column(String, nullable=False)
    temperature = Column(Float, nullable=False, default=0.15)
    capabilities = Column(JSON, nullable=False, default=list)
    triggers = Column(JSON, nullable=False, default=list)
    permissions = Column(JSON, nullable=False, default=list)
    tools = Column(JSON, nullable=False, default=list)
    knowledge_ids = Column(JSON, nullable=False, default=list)
    workflows = Column(JSON, nullable=False, default=list)
    completed_tasks = Column(Integer, nullable=False, default=0)
    avg_response_time = Column(Float, nullable=False, default=4.2)
    productivity_score = Column(Integer, nullable=False, default=95)
    business_impact = Column(Float, nullable=False, default=150.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="employees")
    tasks = relationship("Task", back_populates="employee")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="customers")
    orders = relationship("Order", back_populates="customer")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="products")
    inventory = relationship("Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    safety_threshold = Column(Integer, nullable=False, default=5)
    status = Column(String, nullable=False, default="in_stock") # in_stock, low_stock, out_of_stock
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    business = relationship("Business", back_populates="inventory_items")
    product = relationship("Product", back_populates="inventory")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="pending") # pending, processing, completed, failed
    items = Column(JSON, nullable=False) # JSON list containing item descriptions, quantity, SKU, prices
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    invoices = relationship("Invoice", back_populates="order", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="order")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="draft") # draft, sent, paid, void
    issued_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="invoices")
    order = relationship("Order", back_populates="invoices")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending") # pending, in_progress, completed, failed
    run_count = Column(Integer, nullable=False, default=0)
    last_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="tasks")
    employee = relationship("Employee", back_populates="tasks")
    activities = relationship("Activity", back_populates="task")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="notifications")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(String, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    message = Column(String, nullable=False)
    type = Column(String, nullable=False, default="info") # info, warning, error, action
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="activities")
    task = relationship("Task", back_populates="activities")
    order = relationship("Order", back_populates="activities")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="indexed") # uploading, indexing, indexed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class ToolConnection(Base):
    __tablename__ = "tool_connections"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String, nullable=False) # whatsapp, gmail, google_calendar, google_sheets, slack
    credentials = Column(JSON, nullable=False, default=dict)
    is_connected = Column(Boolean, nullable=False, default=False)
    last_sync = Column(DateTime, nullable=True)
    logs = Column(JSON, nullable=False, default=list)
    required_permissions = Column(JSON, nullable=False, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    business = relationship("Business", back_populates="tool_connections")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    document_id = Column(String, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    embedding = Column(JSON, nullable=False, default=list) # Serialize list of floats
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("KnowledgeDocument", back_populates="chunks")

class Memory(Base):
    __tablename__ = "memories"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False) # customer_preference, product_trend, supplier_history, inventory_trend, workload, business_pattern
    key = Column(String, nullable=False, default="general")
    content = Column(String, nullable=False)
    impact_count = Column(Integer, nullable=False, default=1)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    business = relationship("Business", back_populates="memories")

class ScheduledEmail(Base):
    __tablename__ = "scheduled_emails"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    send_at = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="pending") # pending, sent, failed
    created_at = Column(DateTime, default=datetime.utcnow)

class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    trigger_type = Column(String, nullable=False) # new_email, invoice_generated, schedule, manual, webhook
    conditions = Column(JSON, nullable=False, default=dict)
    steps = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WorkflowHistory(Base):
    __tablename__ = "workflow_histories"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    trigger_source = Column(String, nullable=False)
    input_payload = Column(JSON, nullable=False, default=dict)
    ai_decision = Column(JSON, nullable=True, default=dict)
    actions_performed = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="success") # success, failed, running
    errors = Column(String, nullable=True)
    retries = Column(Integer, nullable=False, default=0)
    execution_time = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProcessedEmail(Base):
    __tablename__ = "processed_emails"
    
    id = Column(String, primary_key=True, index=True)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow)
