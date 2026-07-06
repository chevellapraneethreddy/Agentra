from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db
from app.services.agent import execute_operations_agent
import uuid

router = APIRouter()

@router.get("/", response_model=List[schemas.Order])
def list_orders(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all orders for the current business tenant."""
    orders = db.query(models.Order).filter(
        models.Order.business_id == current_user["business_id"]
    ).order_by(models.Order.created_at.desc()).all()
    
    # Hydrate agent_actions dynamically from activities logs
    for order in orders:
        activities = db.query(models.Activity).filter(
            models.Activity.order_id == order.id
        ).order_by(models.Activity.created_at.asc()).all()
        order.agent_actions = [act.message for act in activities]
        
    return orders

@router.get("/{order_id}", response_model=schemas.Order)
def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single order, including agent execution actions."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.business_id == current_user["business_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Load agent actions
    activities = db.query(models.Activity).filter(
        models.Activity.order_id == order.id
    ).order_by(models.Activity.created_at.asc()).all()
    order.agent_actions = [act.message for act in activities]
    
    return order

@router.post("/", response_model=schemas.Order, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order in pending status."""
    # Verify customer belongs to this business
    customer = db.query(models.Customer).filter(
        models.Customer.id == order_in.customer_id,
        models.Customer.business_id == current_user["business_id"]
    ).first()
    
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer_id.")

    # Validate items formatting (contains product_id, quantity, etc.)
    for item in order_in.items:
        p_id = item.get("product_id")
        prod = db.query(models.Product).filter(
            models.Product.id == p_id,
            models.Product.business_id == current_user["business_id"]
        ).first()
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product {p_id} not found in catalog.")

    new_order = models.Order(
        business_id=current_user["business_id"],
        customer_id=order_in.customer_id,
        total=order_in.total,
        status="pending",
        items=order_in.items
    )
    db.add(new_order)
    db.flush()
    
    # Insert initial order activity log
    act = models.Activity(
        business_id=current_user["business_id"],
        order_id=new_order.id,
        message=f"Order registered in queue. Total value: ${order_in.total:.2f}. Awaiting agent execution.",
        type="info"
    )
    db.add(act)
    db.commit()
    db.refresh(new_order)
    
    # Load actions
    new_order.agent_actions = [act.message]
    return new_order

@router.put("/{order_id}", response_model=schemas.Order)
def update_order(
    order_id: str,
    order_update: schemas.OrderUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order fields (status, total, or items)."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.business_id == current_user["business_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order_update.status is not None:
        order.status = order_update.status
    if order_update.total is not None:
        order.total = order_update.total
    if order_update.items is not None:
        order.items = order_update.items
        
    db.commit()
    db.refresh(order)
    
    # Load actions
    activities = db.query(models.Activity).filter(
        models.Activity.order_id == order.id
    ).order_by(models.Activity.created_at.asc()).all()
    order.agent_actions = [act.message for act in activities]
    
    return order

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an order."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.business_id == current_user["business_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    db.delete(order)
    db.commit()
    return

@router.post("/{order_id}/trigger", response_model=schemas.Order)
def trigger_agent_execution(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger the LangGraph Operations Agent to fulfill this order."""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.business_id == current_user["business_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status in ["completed", "failed"] and not settings.DEBUG:
        raise HTTPException(status_code=400, detail="Order is already finalized")
        
    # Execute the LangGraph operations agent state machine
    res = execute_operations_agent(db, current_user["business_id"], order_id)
    
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("error_detail"))
        
    # Reload order to get fresh state and updated activity trace arrays
    db.refresh(order)
    activities = db.query(models.Activity).filter(
        models.Activity.order_id == order.id
    ).order_by(models.Activity.created_at.asc()).all()
    order.agent_actions = [act.message for act in activities]
    
    return order
