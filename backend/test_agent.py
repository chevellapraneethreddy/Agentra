import os
import sys
from datetime import datetime

# Adjust Python path to load app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.models import models
from app.services.agent import execute_operations_agent

def run_test():
    # Sync SQLite schemas
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Provision dummy workspace tenant if empty
        user = db.query(models.User).first()
        if not user:
            print("Database empty. Provisioning test environment...")
            user = models.User(id="usr_test_101", email="test@agentra.ai", full_name="Test Operator")
            db.add(user)
            db.flush()
            
            biz = models.Business(name="Test GaaS Corp", owner_id=user.id)
            db.add(biz)
            db.flush()
            
            # Create Operations Employee
            emp = models.Employee(
                business_id=biz.id,
                name="Operations Employee",
                role="Fulfillment Manager",
                goal="Deduct stock, compile invoices, and dispatch confirmations.",
                status="active",
                system_prompt="You are Operations Employee. Fulfill order transactions and send confirmations.",
                temperature=0.15,
                capabilities=["order_fulfillment", "invoice_generation"],
                triggers=["order.created"],
                permissions=["read_inventory", "write_invoices", "send_alerts"],
                tools=["slack", "gmail"],
                completed_tasks=0,
                avg_response_time=4.2,
                productivity_score=95,
                business_impact=150.00
            )
            db.add(emp)
            
            # Add products & stock
            prod = models.Product(business_id=biz.id, name="Premium Processor Unit", sku="PROC-PRM-101", price=199.99)
            db.add(prod)
            db.flush()
            
            inv = models.Inventory(product_id=prod.id, business_id=biz.id, quantity=10, safety_threshold=2, status="in_stock")
            db.add(inv)
            
            cust = models.Customer(business_id=biz.id, name="Acme Logistics", email="acme@logistics.com")
            db.add(cust)
            db.flush()
            db.commit()
        else:
            biz = db.query(models.Business).first()
            cust = db.query(models.Customer).filter(models.Customer.business_id == biz.id).first()
            prod = db.query(models.Product).filter(models.Product.business_id == biz.id).first()
            
        print(f"Using test Business: {biz.name} (ID: {biz.id})")
        
        # 2. Register mock checkout order
        order = models.Order(
            business_id=biz.id,
            customer_id=cust.id,
            items=[{"product_id": prod.id, "quantity": 1, "name": prod.name}],
            total=199.99,
            status="pending"
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        print(f"Created Test Order reference: {order.id}")
        
        # 3. Execute Generic GaaS Operations Agent
        print("\nLaunching Generic AI Employee reasoning loop...")
        res = execute_operations_agent(db, biz.id, order.id)
        print(f"Execution complete. Status: {res['status']}")
        
        acts = db.query(models.Activity).filter(models.Activity.order_id == order.id).all()
        for idx, a in enumerate(acts):
            print(f"{idx+1}. [{a.type.upper()}] {a.message}")
            
        # 5. Read learned reflection memories
        print("\n--- DATABASE AI MEMORY TIMELINE RECORDS ---")
        mems = db.query(models.Memory).filter(models.Memory.business_id == biz.id).all()
        if not mems:
            print("No memories recorded. Verify Gemini connection details.")
        for m in mems:
            print(f"- [{m.category.upper()}] Key: '{m.key}' -> Content: '{m.content}' (Impact count: {m.impact_count})")
            
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
