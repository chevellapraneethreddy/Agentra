from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db
from app.services.workflow_engine import WorkflowEngine

router = APIRouter()

@router.get("/", response_model=List[schemas.Workflow])
def list_workflows(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all configured email automation workflows."""
    business_id = current_user["business_id"]
    # Seed defaults if database is empty for convenience
    WorkflowEngine.seed_default_workflows(db, business_id)
    return db.query(models.Workflow).filter(models.Workflow.business_id == business_id).all()

@router.post("/", response_model=schemas.Workflow)
def create_workflow(
    wf_in: schemas.WorkflowCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom email automation workflow configuration."""
    new_wf = models.Workflow(
        business_id=current_user["business_id"],
        name=wf_in.name,
        trigger_type=wf_in.trigger_type,
        conditions=wf_in.conditions,
        steps=wf_in.steps,
        is_active=wf_in.is_active
    )
    db.add(new_wf)
    db.commit()
    db.refresh(new_wf)
    return new_wf

@router.put("/{wf_id}", response_model=schemas.Workflow)
def update_workflow(
    wf_id: str,
    wf_in: schemas.WorkflowCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modify parameters of an existing workflow configuration."""
    wf = db.query(models.Workflow).filter(
        models.Workflow.id == wf_id,
        models.Workflow.business_id == current_user["business_id"]
    ).first()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow configuration not found")

    wf.name = wf_in.name
    wf.trigger_type = wf_in.trigger_type
    wf.conditions = wf_in.conditions
    wf.steps = wf_in.steps
    wf.is_active = wf_in.is_active

    db.commit()
    db.refresh(wf)
    return wf

@router.delete("/{wf_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    wf_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow configuration."""
    wf = db.query(models.Workflow).filter(
        models.Workflow.id == wf_id,
        models.Workflow.business_id == current_user["business_id"]
    ).first()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow configuration not found")

    db.delete(wf)
    db.commit()
    return

@router.post("/run/{wf_id}", response_model=schemas.WorkflowHistory)
def run_workflow_manually(
    wf_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger and execute a workflow on demand using test parameters."""
    wf = db.query(models.Workflow).filter(
        models.Workflow.id == wf_id,
        models.Workflow.business_id == current_user["business_id"]
    ).first()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow configuration not found")

    # Spawn execution history instance
    history = models.WorkflowHistory(
        workflow_id=wf.id,
        business_id=current_user["business_id"],
        trigger_source="manual",
        input_payload={"payload": payload, "current_step": 0},
        ai_decision={},
        actions_performed=[],
        status="running",
        retries=0,
        execution_time=datetime.utcnow()
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    # Execute workflow logic sync
    WorkflowEngine.execute_loop(db, wf, history)
    db.refresh(history)
    return history

@router.get("/history", response_model=List[schemas.WorkflowHistory])
def list_workflow_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve execution traces and status audits of all workflows."""
    return db.query(models.WorkflowHistory).filter(
        models.WorkflowHistory.business_id == current_user["business_id"]
    ).order_by(models.WorkflowHistory.created_at.desc()).all()
