import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.models import models
from datetime import datetime, timedelta

def provision_full_test():
    # Force recreate database to ensure fresh state
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Simulate registration provisioner block from security.py
        print("Registering tenant workspace environment...")
        user = models.User(id="usr_gaas_demo", email="demo@agentra.ai", full_name="Workspace Demo Operator")
        db.add(user)
        db.flush()
        
        biz = models.Business(name="Agentra Demo GaaS corp", owner_id=user.id)
        db.add(biz)
        db.flush()
        
        # Insert presets
        presets = [
            {
                "name": "Operations Employee",
                "role": "Fulfillment Manager",
                "goal": "Deduct stock, compile billing invoices, and schedule package picking task deliveries automatically.",
                "system_prompt": "You are Agentra's Lead Operations Employee. Fulfill orders, check stock levels, send client invoices, and restock low inventory item SKU lines automatically.",
                "capabilities": ["order_fulfillment", "inventory_reorder", "invoice_generation", "customer_notifications"],
                "triggers": ["order.created", "inventory.low"],
                "permissions": ["read_inventory", "write_invoices", "send_alerts"],
                "tools": ["slack", "gmail", "whatsapp", "google_sheets", "google_calendar"],
                "completed_tasks": 124,
                "avg_response_time": 3.4,
                "productivity_score": 98,
                "business_impact": 3100.0
            },
            {
                "name": "Sales Employee",
                "role": "Lead Nurturing Executive",
                "goal": "Draft follow-up sales pitches, verify customer contact details, and update CRM sheets.",
                "system_prompt": "You are Agentra's Lead Sales Employee. Monitor inbound client messages, query catalog products, suggest sales pricing sheets, and notify teams.",
                "capabilities": ["customer_notifications"],
                "triggers": ["order.created"],
                "permissions": ["read_inventory", "send_alerts"],
                "tools": ["slack", "gmail", "whatsapp"],
                "completed_tasks": 88,
                "avg_response_time": 4.2,
                "productivity_score": 95,
                "business_impact": 2200.0
            },
            {
                "name": "Finance Employee",
                "role": "Commercial Auditor",
                "goal": "Review issued invoices, compile tax ledgers, and alert teams of pending checks.",
                "system_prompt": "You are Agentra's Lead Finance Employee. Cross-reference completed checkout order invoices with payments records, log spreadsheet tabs, and alert teams.",
                "capabilities": ["invoice_generation"],
                "triggers": ["daily.schedule"],
                "permissions": ["write_invoices", "send_alerts"],
                "tools": ["slack", "gmail", "google_sheets"],
                "completed_tasks": 45,
                "avg_response_time": 4.8,
                "productivity_score": 96,
                "business_impact": 1350.0
            },
            {
                "name": "HR Employee",
                "role": "Talent Operations Specialist",
                "goal": "Schedule staff check-ins, compile task workloads, and send onboarding summaries.",
                "system_prompt": "You are Agentra's Lead HR Employee. Audit completed background worker tasks, review employee schedules, and book calendar followups.",
                "capabilities": [],
                "triggers": ["daily.schedule"],
                "permissions": ["send_alerts"],
                "tools": ["slack", "gmail", "google_calendar"],
                "completed_tasks": 24,
                "avg_response_time": 3.1,
                "productivity_score": 99,
                "business_impact": 720.0
            },
            {
                "name": "Support Employee",
                "role": "Client Care Associate",
                "goal": "Resolve buyer enquiries, lookup past order logs, and notify customer channels.",
                "system_prompt": "You are Agentra's Lead Support Employee. Help buyers review tracking tickets, inspect inventory stock availability, and update client logs.",
                "capabilities": ["customer_notifications"],
                "triggers": ["order.created"],
                "permissions": ["read_inventory", "send_alerts"],
                "tools": ["slack", "gmail", "whatsapp"],
                "completed_tasks": 210,
                "avg_response_time": 2.9,
                "productivity_score": 97,
                "business_impact": 4200.0
            },
            {
                "name": "Marketing Employee",
                "role": "Copywriting Autopilot",
                "goal": "Draft promotion newsletters, monitor customer feedback, and catalog marketing trends.",
                "system_prompt": "You are Agentra's Lead Marketing Employee. Draft promotion copy targeting frequently ordered product units, log results, and alert channels.",
                "capabilities": ["customer_notifications"],
                "triggers": ["daily.schedule"],
                "permissions": ["send_alerts"],
                "tools": ["slack", "gmail", "google_sheets"],
                "completed_tasks": 64,
                "avg_response_time": 4.5,
                "productivity_score": 94,
                "business_impact": 1280.0
            }
        ]
        
        for p in presets:
            emp = models.Employee(
                business_id=biz.id,
                name=p["name"],
                role=p["role"],
                goal=p["goal"],
                status="active" if p["name"] == "Operations Employee" else "idle",
                system_prompt=p["system_prompt"],
                temperature=0.15,
                capabilities=p["capabilities"],
                triggers=p["triggers"],
                permissions=p["permissions"],
                tools=p["tools"],
                knowledge_ids=[],
                workflows=[],
                completed_tasks=p["completed_tasks"],
                avg_response_time=p["avg_response_time"],
                productivity_score=p["productivity_score"],
                business_impact=p["business_impact"]
            )
            db.add(emp)
            
        db.commit()
        print("Tenant environment provisioned successfully.")
        
        # Query and display
        print("\n--- DATABASE AI EMPLOYEES DIRECTORY RECORDS ---")
        employees = db.query(models.Employee).all()
        for idx, e in enumerate(employees):
            print(f"{idx+1}. {e.name} ({e.role})")
            print(f"   Status: {e.status.upper()}")
            print(f"   Goal: {e.goal}")
            print(f"   Tools: {e.tools}")
            print(f"   Permissions: {e.permissions}")
            print(f"   KPIs: Tasks={e.completed_tasks} | Avg Time={e.avg_response_time}s | Efficiency={e.productivity_score}% | Impact=${e.business_impact:.2f}\n")
            
    finally:
        db.close()

if __name__ == "__main__":
    provision_full_test()
