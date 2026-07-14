from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/me", response_model=schemas.Business)
def get_my_business(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve current user's business profile details."""
    business = db.query(models.Business).filter(
        models.Business.id == current_user["business_id"]
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business tenant environment not found")
    return business

@router.put("/me", response_model=schemas.Business)
def update_my_business(
    business_update: schemas.BusinessUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update business profile details (e.g. setting onboarding_completed = True)."""
    business = db.query(models.Business).filter(
        models.Business.id == current_user["business_id"]
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business tenant environment not found")
        
    update_data = business_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business, field, value)
        
    db.commit()
    db.refresh(business)
    return business
