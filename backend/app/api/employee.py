from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.AgentConfig])
def list_employees(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all AI Employees (presets & custom workers) provisioned for this workspace."""
    return db.query(models.Employee).filter(
        models.Employee.business_id == current_user["business_id"]
    ).order_by(models.Employee.created_at.asc()).all()

@router.post("/", response_model=schemas.AgentConfig, status_code=status.HTTP_201_CREATED)
def hire_employee(
    new_emp: schemas.AgentConfigCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deploy and configure a new custom AI Employee in the workspace."""
    # Check if name already exists
    existing = db.query(models.Employee).filter(
        models.Employee.business_id == current_user["business_id"],
        models.Employee.name == new_emp.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="An AI Employee with this name already exists.")

    emp = models.Employee(
        business_id=current_user["business_id"],
        name=new_emp.name,
        role=new_emp.role,
        goal=new_emp.goal,
        status="idle",
        system_prompt=new_emp.system_prompt,
        temperature=new_emp.temperature,
        capabilities=new_emp.capabilities,
        triggers=new_emp.triggers,
        permissions=new_emp.permissions,
        tools=new_emp.tools,
        knowledge_ids=new_emp.knowledge_ids,
        workflows=new_emp.workflows,
        completed_tasks=0,
        avg_response_time=4.2,
        productivity_score=95,
        business_impact=150.00
    )
    
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@router.put("/{employee_id}", response_model=schemas.AgentConfig)
def update_employee(
    employee_id: str,
    update: schemas.AgentConfigUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modify parameters or status (Working/Idle/Paused) for an AI Employee."""
    emp = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.business_id == current_user["business_id"]
    ).first()
    
    if not emp:
        raise HTTPException(status_code=404, detail="AI Employee not found in workspace.")
        
    if update.name is not None:
        emp.name = update.name
    if update.role is not None:
        emp.role = update.role
    if update.goal is not None:
        emp.goal = update.goal
    if update.status is not None:
        emp.status = update.status
    if update.system_prompt is not None:
        emp.system_prompt = update.system_prompt
    if update.temperature is not None:
        emp.temperature = update.temperature
    if update.capabilities is not None:
        emp.capabilities = update.capabilities
    if update.triggers is not None:
        emp.triggers = update.triggers
    if update.permissions is not None:
        emp.permissions = update.permissions
    if update.tools is not None:
        emp.tools = update.tools
    if update.knowledge_ids is not None:
        emp.knowledge_ids = update.knowledge_ids
    if update.workflows is not None:
        emp.workflows = update.workflows
    if update.completed_tasks is not None:
        emp.completed_tasks = update.completed_tasks
    if update.avg_response_time is not None:
        emp.avg_response_time = update.avg_response_time
    if update.productivity_score is not None:
        emp.productivity_score = update.productivity_score
    if update.business_impact is not None:
        emp.business_impact = update.business_impact
        
    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def terminate_employee(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decommission and fire an AI Employee from the business workspace."""
    emp = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.business_id == current_user["business_id"]
    ).first()
    
    if not emp:
        raise HTTPException(status_code=404, detail="AI Employee not found in workspace.")
        
    # Prevent deleting the core Operations Employee Preset
    if emp.name == "Operations Employee":
        raise HTTPException(status_code=400, detail="Cannot delete core Operations Employee preset.")
        
    db.delete(emp)
    db.commit()
    return
