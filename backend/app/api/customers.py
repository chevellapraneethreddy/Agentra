from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Customer])
def list_customers(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all customers for the current business."""
    return db.query(models.Customer).filter(
        models.Customer.business_id == current_user["business_id"]
    ).order_by(models.Customer.name.asc()).all()

@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(
    customer_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single business client."""
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.business_id == current_user["business_id"]
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: schemas.CustomerCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new client profile."""
    # Check duplicate email per business
    existing = db.query(models.Customer).filter(
        models.Customer.email == customer_in.email,
        models.Customer.business_id == current_user["business_id"]
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Customer email already registered.")
        
    customer = models.Customer(
        business_id=current_user["business_id"],
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        address=customer_in.address
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: str,
    customer_update: schemas.CustomerUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update customer contact profile information."""
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.business_id == current_user["business_id"]
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    if customer_update.name is not None:
        customer.name = customer_update.name
    if customer_update.email is not None:
        if customer_update.email != customer.email:
            existing = db.query(models.Customer).filter(
                models.Customer.email == customer_update.email,
                models.Customer.business_id == current_user["business_id"]
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Customer email already registered.")
        customer.email = customer_update.email
    if customer_update.phone is not None:
        customer.phone = customer_update.phone
    if customer_update.address is not None:
        customer.address = customer_update.address
        
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a customer profile."""
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.business_id == current_user["business_id"]
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Check if they have active orders, restrict delete if orders exist
    orders = db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    if orders:
        raise HTTPException(status_code=400, detail="Cannot delete customer with existing orders.")
        
    db.delete(customer)
    db.commit()
    return
