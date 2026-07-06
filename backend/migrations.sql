-- SQL SCHEMA MIGRATION FILE FOR SUPABASE POSTGRESQL --

CREATE TABLE IF NOT EXISTS businesses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    goal TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    system_prompt TEXT NOT NULL,
    temperature FLOAT DEFAULT 0.2,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    knowledge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    workflows JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_tasks INTEGER DEFAULT 0,
    avg_response_time FLOAT DEFAULT 0.0,
    productivity_score INTEGER DEFAULT 0,
    business_impact FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    address TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    price FLOAT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    safety_threshold INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    total_amount FLOAT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    amount FLOAT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) REFERENCES employees(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    run_count INTEGER DEFAULT 0,
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE SET NULL,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    size INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'indexed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tool_connections (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_connected BOOLEAN NOT NULL DEFAULT FALSE,
    last_sync TIMESTAMP,
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_emails (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255),
    sender VARCHAR(255),
    subject TEXT,
    body TEXT,
    intent_category VARCHAR(100),
    confidence FLOAT,
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) REFERENCES employees(id) ON DELETE CASCADE,
    key_memory TEXT NOT NULL,
    importance_score FLOAT DEFAULT 0.5,
    context_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES FOR FAST QUERYING --
CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_tool_connections_business ON tool_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_activities_business ON activities(business_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_id ON processed_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);
