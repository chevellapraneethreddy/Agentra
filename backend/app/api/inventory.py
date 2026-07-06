from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.InventoryItem])
def list_inventory(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all inventory items for the current business tenant."""
    return db.query(models.Inventory).filter(
        models.Inventory.business_id == current_user["business_id"]
    ).all()

@router.get("/{item_id}", response_model=schemas.InventoryItem)
def get_inventory_item(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a single inventory item."""
    item = db.query(models.Inventory).filter(
        models.Inventory.id == item_id,
        models.Inventory.business_id == current_user["business_id"]
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item

@router.put("/{item_id}/quantity", response_model=schemas.InventoryItem)
def update_inventory_quantity(
    item_id: str, 
    update: schemas.InventoryUpdateQuantity, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update inventory quantity and safety thresholds, auto-recalculating stock statuses."""
    item = db.query(models.Inventory).filter(
        models.Inventory.id == item_id,
        models.Inventory.business_id == current_user["business_id"]
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    item.quantity = update.quantity
    if update.safety_threshold is not None:
        item.safety_threshold = update.safety_threshold
        
    # Recalculate status
    if item.quantity <= 0:
        item.status = "out_of_stock"
    elif item.quantity <= item.safety_threshold:
        item.status = "low_stock"
    else:
        item.status = "in_stock"
        
    db.commit()
    db.refresh(item)
    return item
