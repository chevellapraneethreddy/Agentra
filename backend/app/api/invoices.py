from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Invoice])
def list_invoices(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all commercial invoices."""
    return db.query(models.Invoice).filter(
        models.Invoice.business_id == current_user["business_id"]
    ).order_by(models.Invoice.created_at.desc()).all()

@router.get("/{invoice_id}", response_model=schemas.Invoice)
def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single billing invoice."""
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.business_id == current_user["business_id"]
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/", response_model=schemas.Invoice, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: schemas.InvoiceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new billing invoice linked to an active order."""
    # Verify order belongs to business
    order = db.query(models.Order).filter(
        models.Order.id == invoice_in.order_id,
        models.Order.business_id == current_user["business_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=400, detail="Invalid order_id reference.")
        
    invoice = models.Invoice(
        business_id=current_user["business_id"],
        order_id=invoice_in.order_id,
        invoice_number=invoice_in.invoice_number,
        amount=invoice_in.amount,
        status=invoice_in.status,
        issued_at=invoice_in.issued_at
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.put("/{invoice_id}", response_model=schemas.Invoice)
def update_invoice(
    invoice_id: str,
    invoice_update: schemas.InvoiceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update invoice billing status or invoice amount."""
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.business_id == current_user["business_id"]
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice_update.status is not None:
        invoice.status = invoice_update.status
    if invoice_update.amount is not None:
        invoice.amount = invoice_update.amount
    if invoice_update.invoice_number is not None:
        invoice.invoice_number = invoice_update.invoice_number
        
    db.commit()
    db.refresh(invoice)
    return invoice

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a billing invoice."""
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.business_id == current_user["business_id"]
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    db.delete(invoice)
    db.commit()
    return
