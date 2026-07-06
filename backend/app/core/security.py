import jwt
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models import models
from datetime import datetime, timedelta

logger = logging.getLogger("agentra")
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Dependency that decodes the Supabase JWT and ensures the user 
    and their tenant environment (Business, AI Agent, default SKUs) are provisioned.
    """
    token = credentials.credentials
    user_payload = None

    # Development sandbox token bypass helper
    if settings.DEBUG and token.startswith("dev-token-"):
        email = token.replace("dev-token-", "")
        user_payload = {
            "sub": f"dev-uuid-{email.replace('@', '-')}",
            "email": email,
            "role": "authenticated",
            "user_metadata": {"full_name": email.split('@')[0].upper()}
        }
    else:
        try:
            user_payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as e:
            # Fallback for development ease if signature verification fails but debug is on
            if settings.DEBUG and token.startswith("dev-token-"):
                email = token.replace("dev-token-", "")
                user_payload = {
                    "sub": f"dev-uuid-{email.replace('@', '-')}",
                    "email": email,
                    "role": "authenticated",
                    "user_metadata": {"full_name": email.split('@')[0].upper()}
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    if not user_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = user_payload.get("sub")
    email = user_payload.get("email")
    full_name = user_payload.get("user_metadata", {}).get("full_name", "")

    # Ensure User and Tenant Business environment are provisioned in SQL database
    db_user = db.query(models.User).filter(
        (models.User.id == user_id) | (models.User.email == email)
    ).first()
    if not db_user:
        logger.info(f"New user detected ({email}). Provisioning multi-tenant environment...")
        
        # 1. Create User
        db_user = models.User(id=user_id, email=email, full_name=full_name)
        db.add(db_user)
        db.flush() # Gain ID
        
        # 2. Create Business
        company_name = f"{full_name.title() or email.split('@')[0].title()}'s GaaS Business"
        db_business = models.Business(name=company_name, owner_id=user_id)
        db.add(db_business)
        db.flush()
        
        # 3. Create Default AI Employees Presets
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
        
        db_employee = None
        for p in presets:
            emp = models.Employee(
                business_id=db_business.id,
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
            db.flush()
            if p["name"] == "Operations Employee":
                db_employee = emp


        # 4. Create Default Customers
        c1 = models.Customer(business_id=db_business.id, name="Acme Industrial Corp", email="acme@industrial.com", phone="1-800-555-0199", address="100 Acme Way, Industrial Park, TX")
        c2 = models.Customer(business_id=db_business.id, name="Globex Logistics Inc", email="globex@logistics.com", phone="1-888-422-9900", address="42 Globex Plaza, Shipping Terminal, CA")
        c3 = models.Customer(business_id=db_business.id, name="Nova Tech Labs", email="nova@techlabs.com", phone="1-877-333-8822", address="701 Scientific Blvd, Research Area, MA")
        db.add_all([c1, c2, c3])
        db.flush()

        # 5. Create Default Products & Inventory
        products_info = [
            ("Premium Processor Unit", "PROC-PRM-101", 199.99, 42, 5, "in_stock"),
            ("Standard Connector", "CONN-STD-02", 9.99, 150, 5, "in_stock"),
            ("Rugged Enclosure", "ENC-RUG-99", 45.00, 3, 5, "low_stock"),
            ("Industrial Bracket", "BRKT-IND-88", 12.50, 15, 5, "in_stock"),
            ("Precision Calibration Laser", "LASR-PRC-07", 2500.00, 0, 5, "out_of_stock")
        ]
        
        for name, sku, price, qty, thresh, status_str in products_info:
            prod = models.Product(business_id=db_business.id, name=name, sku=sku, price=price, description=f"Industrial grade {name.lower()}")
            db.add(prod)
            db.flush()
            
            inv = models.Inventory(product_id=prod.id, business_id=db_business.id, quantity=qty, safety_threshold=thresh, status=status_str)
            db.add(inv)
            
        # 6. Create Default Tasks
        t1 = models.Task(business_id=db_business.id, employee_id=db_employee.id, title="Inventory Audit Sync", status="completed", run_count=12, last_run=datetime.utcnow() - timedelta(hours=3))
        t2 = models.Task(business_id=db_business.id, employee_id=db_employee.id, title="Vendor Reorder Processing", status="pending", run_count=8, last_run=datetime.utcnow() - timedelta(hours=24))
        t3 = models.Task(business_id=db_business.id, employee_id=db_employee.id, title="Customer Fulfillment Email Sync", status="completed", run_count=45, last_run=datetime.utcnow() - timedelta(hours=6))
        db.add_all([t1, t2, t3])
        db.flush()

        # 7. Add Initial activities
        act = models.Activity(
            business_id=db_business.id,
            task_id=t1.id,
            message="Environment successfully provisioned. Operations Agent is active.",
            type="info"
        )
        db.add(act)

        # 8. Add Default Knowledge Documents
        d1 = models.KnowledgeDocument(business_id=db_business.id, name="Company_Fulfillment_Guidelines.pdf", type="PDF", size=1254000, status="indexed")
        d2 = models.KnowledgeDocument(business_id=db_business.id, name="Vendor_Price_List_2026.csv", type="CSV", size=45000, status="indexed")
        db.add_all([d1, d2])

        db.commit()
        logger.info(f"Provisioning completed successfully for business '{company_name}'.")
    else:
        # User already exists, retrieve their business
        db_business = db.query(models.Business).filter(models.Business.owner_id == user_id).first()
        if not db_business:
            # Re-provision business just in case it got deleted
            db_business = models.Business(name=f"{db_user.full_name}'s GaaS Business", owner_id=user_id)
            db.add(db_business)
            db.commit()

    # Return validated identity payload supplemented with tenant IDs
    return {
        "user_id": user_id,
        "email": email,
        "full_name": full_name,
        "business_id": db_business.id
    }
