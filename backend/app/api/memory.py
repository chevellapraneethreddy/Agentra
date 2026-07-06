from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Memory])
def list_memories(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all operational memories compiled for this business workspace."""
    return db.query(models.Memory).filter(
        models.Memory.business_id == current_user["business_id"]
    ).order_by(models.Memory.last_updated.desc()).all()

@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(
    memory_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a learned operational constraint from the AI memory base."""
    memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.business_id == current_user["business_id"]
    ).first()
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory record not found")
        
    db.delete(memory)
    db.commit()
    return
