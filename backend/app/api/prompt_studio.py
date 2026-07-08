from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[schemas.StudioPrompt])
def list_prompts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all studio prompts for the current user's business."""
    return db.query(models.StudioPrompt).filter(
        models.StudioPrompt.business_id == current_user["business_id"]
    ).order_by(models.StudioPrompt.created_at.desc()).all()

@router.get("/{prompt_id}", response_model=schemas.StudioPrompt)
def get_prompt(
    prompt_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific prompt template."""
    prompt = db.query(models.StudioPrompt).filter(
        models.StudioPrompt.id == prompt_id,
        models.StudioPrompt.business_id == current_user["business_id"]
    ).first()
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return prompt

@router.post("/", response_model=schemas.StudioPrompt, status_code=status.HTTP_201_CREATED)
def create_prompt(
    prompt_in: schemas.StudioPromptCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new prompt template."""
    prompt = models.StudioPrompt(
        business_id=current_user["business_id"],
        name=prompt_in.name,
        description=prompt_in.description,
        category=prompt_in.category,
        system_prompt=prompt_in.system_prompt,
        goal=prompt_in.goal,
        rules=prompt_in.rules,
        output_format=prompt_in.output_format,
        memory_enabled=prompt_in.memory_enabled,
        knowledge_enabled=prompt_in.knowledge_enabled,
        enabled_tools=prompt_in.enabled_tools,
        version=prompt_in.version,
        status=prompt_in.status
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt

@router.put("/{prompt_id}", response_model=schemas.StudioPrompt)
def update_prompt(
    prompt_id: str,
    prompt_update: schemas.StudioPromptUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a prompt template."""
    prompt = db.query(models.StudioPrompt).filter(
        models.StudioPrompt.id == prompt_id,
        models.StudioPrompt.business_id == current_user["business_id"]
    ).first()
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt template not found")
        
    update_data = prompt_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prompt, field, value)
        
    prompt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prompt)
    return prompt

@router.post("/{prompt_id}/duplicate", response_model=schemas.StudioPrompt, status_code=status.HTTP_201_CREATED)
def duplicate_prompt(
    prompt_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate an existing prompt template."""
    source = db.query(models.StudioPrompt).filter(
        models.StudioPrompt.id == prompt_id,
        models.StudioPrompt.business_id == current_user["business_id"]
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source prompt template not found")
        
    duplicated = models.StudioPrompt(
        business_id=current_user["business_id"],
        name=f"{source.name} (Copy)",
        description=source.description,
        category=source.category,
        system_prompt=source.system_prompt,
        goal=source.goal,
        rules=source.rules,
        output_format=source.output_format,
        memory_enabled=source.memory_enabled,
        knowledge_enabled=source.knowledge_enabled,
        enabled_tools=source.enabled_tools,
        version="1.0.0",
        status="draft" # Always start duplicates as draft
    )
    db.add(duplicated)
    db.commit()
    db.refresh(duplicated)
    return duplicated

@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt(
    prompt_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a prompt template."""
    prompt = db.query(models.StudioPrompt).filter(
        models.StudioPrompt.id == prompt_id,
        models.StudioPrompt.business_id == current_user["business_id"]
    ).first()
    
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt template not found")
        
    db.delete(prompt)
    db.commit()
    return
