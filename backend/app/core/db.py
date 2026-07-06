from typing import Dict, List, Any
from datetime import datetime, timedelta

# In-memory storage acting as a database layer.
# In Phase 2, these can be replaced by direct SQL queries or Supabase client queries.

db_orders: List[Dict[str, Any]] = [
    {
        "id": "ord_1001",
        "customer_name": "Acme Industrial Corp",
        "total": 1250.00,
        "items": "5x Premium Processor Units, 10x Standard Connectors",
        "status": "completed",
        "agent_actions": [
            "Order received at 2026-07-02 08:00:00",
            "Operations Agent checked stock levels: 5x Processors available, 10x Connectors available.",
            "Operations Agent reserved inventory.",
            "Operations Agent auto-generated commercial invoice #INV-4929.",
            "Operations Agent triggered shipping dispatch via Fedex.",
            "Order status updated to completed."
        ],
        "created_at": (datetime.now() - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "ord_1002",
        "customer_name": "Globex Logistics Inc",
        "total": 450.50,
        "items": "2x Rugged Enclosures, 1x Industrial Bracket",
        "status": "processing",
        "agent_actions": [
            "Order received at 2026-07-02 10:15:00",
            "Operations Agent checked stock levels: 2x Enclosures (Low stock, 3 remaining), 1x Bracket available.",
            "Operations Agent reserved inventory.",
            "Operations Agent requested supervisor approval for low stock items.",
            "Awaiting manual confirmation..."
        ],
        "created_at": (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "ord_1003",
        "customer_name": "Nova Tech Labs",
        "total": 3200.00,
        "items": "1x Precision Calibration Laser",
        "status": "failed",
        "agent_actions": [
            "Order received at 2026-07-01 14:00:00",
            "Operations Agent checked stock levels: Precision Calibration Laser is OUT OF STOCK.",
            "Operations Agent attempted auto-reorder from vendor (OptiGroup Co.).",
            "Vendor response: Minimum lead time 4 weeks.",
            "Operations Agent auto-sent stockout notification email to customer.",
            "Order marked as failed due to stockout."
        ],
        "created_at": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
    }
]

db_inventory: List[Dict[str, Any]] = [
    {"id": "inv_1", "item_name": "Premium Processor Unit", "sku": "PROC-PRM-101", "quantity": 42, "price": 199.99, "status": "in_stock"},
    {"id": "inv_2", "item_name": "Standard Connector", "sku": "CONN-STD-02", "quantity": 150, "price": 9.99, "status": "in_stock"},
    {"id": "inv_3", "item_name": "Rugged Enclosure", "sku": "ENC-RUG-99", "quantity": 3, "price": 45.00, "status": "low_stock"},
    {"id": "inv_4", "item_name": "Industrial Bracket", "sku": "BRKT-IND-88", "quantity": 15, "price": 12.50, "status": "in_stock"},
    {"id": "inv_5", "item_name": "Precision Calibration Laser", "sku": "LASR-PRC-07", "quantity": 0, "price": 2500.00, "status": "out_of_stock"},
]

db_tasks: List[Dict[str, Any]] = [
    {
        "id": "tsk_001",
        "title": "Inventory Audit Sync",
        "status": "completed",
        "assigned_agent": "Operations Agent",
        "run_count": 12,
        "last_run": (datetime.now() - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S"),
        "logs": [
            {"timestamp": "10:00:01", "message": "Initiating connection to Shopify Inventory API", "type": "info"},
            {"timestamp": "10:00:03", "message": "Fetched 45 products; mapping SKU codes", "type": "info"},
            {"timestamp": "10:00:05", "message": "Discrepancy found: SKU BRKT-IND-88 is 15 in local, 14 in Shopify. Auto-adjusting Shopify stock.", "type": "warning"},
            {"timestamp": "10:00:07", "message": "Sync successful. Saved 1 log to audit trail.", "type": "info"}
        ]
    },
    {
        "id": "tsk_002",
        "title": "Vendor Reorder Processing",
        "status": "in_progress",
        "assigned_agent": "Operations Agent",
        "run_count": 8,
        "last_run": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "logs": [
            {"timestamp": "11:20:00", "message": "Running daily vendor low-stock check", "type": "info"},
            {"timestamp": "11:20:05", "message": "Identified SKU ENC-RUG-99 (quantity 3) below threshold of 5.", "type": "warning"},
            {"timestamp": "11:20:10", "message": "Drafting PO #PO-9821 to vendor 'EncloseCorp Ltd' for 20 units.", "type": "action"},
            {"timestamp": "11:20:12", "message": "Awaiting supervisor approval on PO #PO-9821 in settings.", "type": "info"}
        ]
    },
    {
        "id": "tsk_003",
        "title": "Customer Fulfillment Email Sync",
        "status": "pending",
        "assigned_agent": "Operations Agent",
        "run_count": 45,
        "last_run": (datetime.now() - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S"),
        "logs": []
    }
]

db_agent_config: Dict[str, Any] = {
    "id": "age_001",
    "name": "Operations Agent",
    "role": "Business Operations Executive",
    "status": "idle",
    "system_prompt": "You are Agentra's Lead Operations Agent. Your primary objective is to monitor stock levels, process pending incoming orders, verify payments, auto-generate invoices, and manage shipment scheduling. Always notify supervisors when stock falls below safety levels. Work quietly, thoroughly, and follow safety thresholds for financial transactions.",
    "temperature": 0.15,
    "capabilities": ["order_fulfillment", "inventory_reorder", "invoice_generation", "customer_notifications"],
    "triggers": ["order.created", "inventory.low", "daily.schedule"]
}

db_documents: List[Dict[str, Any]] = [
    {
        "id": "doc_001",
        "name": "Company_Fulfillment_Guidelines.pdf",
        "type": "PDF",
        "size": 1254000,
        "upload_date": (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d"),
        "status": "indexed"
    },
    {
        "id": "doc_002",
        "name": "Vendor_Price_List_2026.csv",
        "type": "CSV",
        "size": 45000,
        "upload_date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
        "status": "indexed"
    }
]

db_analytics: Dict[str, Any] = {
    "total_executions": 1420,
    "success_rate": 98.4,
    "avg_execution_time": 4.2,
    "total_tokens": 12450000,
    "cost_saved": 4260.00,
    "daily_metrics": [
        {"date": "06-26", "executions": 180, "cost_saved": 540.00, "tokens_used": 1500000},
        {"date": "06-27", "executions": 210, "cost_saved": 630.00, "tokens_used": 1800000},
        {"date": "06-28", "executions": 140, "cost_saved": 420.00, "tokens_used": 1200000},
        {"date": "06-29", "executions": 240, "cost_saved": 720.00, "tokens_used": 2100000},
        {"date": "06-30", "executions": 190, "cost_saved": 570.00, "tokens_used": 1650000},
        {"date": "07-01", "executions": 260, "cost_saved": 780.00, "tokens_used": 2300000},
        {"date": "07-02", "executions": 200, "cost_saved": 600.00, "tokens_used": 1900000}
    ]
}
