from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Product])
def list_products(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all products for the current business catalog."""
    return db.query(models.Product).filter(
        models.Product.business_id == current_user["business_id"]
    ).order_by(models.Product.name.asc()).all()

@router.get("/{product_id}", response_model=schemas.Product)
def get_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single product catalog item."""
    prod = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.business_id == current_user["business_id"]
    ).first()
    
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@router.post("/", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    prod_in: schemas.ProductCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product catalog item and auto-initialize its warehouse inventory log."""
    # Check if SKU already exists in this business
    existing = db.query(models.Product).filter(
        models.Product.sku == prod_in.sku,
        models.Product.business_id == current_user["business_id"]
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists in catalog")
        
    prod = models.Product(
        business_id=current_user["business_id"],
        name=prod_in.name,
        sku=prod_in.sku,
        price=prod_in.price,
        description=prod_in.description
    )
    db.add(prod)
    db.flush() # Populate ID for inventory FK reference
    
    # Calculate stock status
    status_str = "in_stock"
    if prod_in.quantity <= 0:
        status_str = "out_of_stock"
    elif prod_in.quantity <= prod_in.safety_threshold:
        status_str = "low_stock"
        
    inv = models.Inventory(
        product_id=prod.id,
        business_id=current_user["business_id"],
        quantity=prod_in.quantity,
        safety_threshold=prod_in.safety_threshold,
        status=status_str
    )
    db.add(inv)
    db.commit()
    db.refresh(prod)
    return prod

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: str,
    prod_update: schemas.ProductUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update product details."""
    prod = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.business_id == current_user["business_id"]
    ).first()
    
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if prod_update.name is not None:
        prod.name = prod_update.name
    if prod_update.sku is not None:
        # Check SKU conflict
        if prod_update.sku != prod.sku:
            existing = db.query(models.Product).filter(
                models.Product.sku == prod_update.sku,
                models.Product.business_id == current_user["business_id"]
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="SKU already exists in catalog")
        prod.sku = prod_update.sku
    if prod_update.price is not None:
        prod.price = prod_update.price
    if prod_update.description is not None:
        prod.description = prod_update.description
        
    db.commit()
    db.refresh(prod)
    return prod

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product item from the catalog."""
    prod = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.business_id == current_user["business_id"]
    ).first()
    
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(prod)
    db.commit()
    return
