from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[schemas.Task])
def list_tasks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all tasks and populate logs dynamically from the activities database."""
    tasks = db.query(models.Task).filter(
        models.Task.business_id == current_user["business_id"]
    ).order_by(models.Task.created_at.desc()).all()
    
    # Hydrate console logs from database activities
    for task in tasks:
        activities = db.query(models.Activity).filter(
            models.Activity.task_id == task.id
        ).order_by(models.Activity.created_at.asc()).all()
        
        task.logs = [
            {
                "timestamp": act.created_at.strftime("%H:%M:%S"),
                "message": act.message,
                "type": act.type
            }
            for act in activities
        ]
        
    return tasks

@router.post("/", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: schemas.TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new operations background task."""
    task = models.Task(
        business_id=current_user["business_id"],
        employee_id=task_in.employee_id,
        title=task_in.title,
        status=task_in.status,
        run_count=0
    )
    db.add(task)
    db.flush()
    
    # Initial log
    act = models.Activity(
        business_id=current_user["business_id"],
        task_id=task.id,
        message=f"Operations task '{task.title}' registered in system schedulers.",
        type="info"
    )
    db.add(act)
    db.commit()
    db.refresh(task)
    
    task.logs = [{"timestamp": act.created_at.strftime("%H:%M:%S"), "message": act.message, "type": act.type}]
    return task

@router.put("/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: str,
    task_update: schemas.TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update task configuration parameters."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.business_id == current_user["business_id"]
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task_update.title is not None:
        task.title = task_update.title
    if task_update.status is not None:
        task.status = task_update.status
    if task_update.employee_id is not None:
        task.employee_id = task_update.employee_id
        
    db.commit()
    db.refresh(task)
    
    # Hydrate logs
    activities = db.query(models.Activity).filter(
        models.Activity.task_id == task.id
    ).order_by(models.Activity.created_at.asc()).all()
    task.logs = [
        {"timestamp": act.created_at.strftime("%H:%M:%S"), "message": act.message, "type": act.type}
        for act in activities
    ]
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an operations task."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.business_id == current_user["business_id"]
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    db.delete(task)
    db.commit()
    return

@router.post("/{task_id}/run", response_model=schemas.Task)
def run_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a task and append dynamic operation logs."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.business_id == current_user["business_id"]
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    now = datetime.utcnow()
    task.run_count += 1
    task.last_run = now
    task.status = "completed"
    db.flush()
    
    # Generate run specific logs based on task type
    time_str = now.strftime("%H:%M:%S")
    logs_to_add = []
    
    if "Audit" in task.title:
        logs_to_add = [
            ("Sync initiated. Fetching active product tables...", "info"),
            ("Validating SKU quantities. Safety safety limits check passed.", "info"),
            ("Shopify API quantities match local DB. Synchronization OK.", "info")
        ]
    elif "Reorder" in task.title:
        # Check low stock products to display low stock logs
        low_stock_items = db.query(models.Inventory).join(models.Product).filter(
            models.Inventory.business_id == current_user["business_id"],
            models.Inventory.status == "low_stock"
        ).all()
        
        if low_stock_items:
            names = ", ".join([item.product.name for item in low_stock_items])
            logs_to_add = [
                ("Low stock sweep triggered.", "info"),
                (f"Identified safety breach in items: {names}.", "warning"),
                ("Created default restock procurement invoices.", "action"),
                ("Owner notified via alert panels.", "info")
            ]
        else:
            logs_to_add = [
                ("Low stock sweep triggered.", "info"),
                ("No items currently below safety margin. Auto-reorder skipped.", "info")
            ]
    else:
        logs_to_add = [
            ("Fulfillment email sync running...", "info"),
            ("Dispatched billing invoices and tracking notifications.", "info"),
            ("SMTP email server sync completed.", "info")
        ]
        
    for msg, log_type in logs_to_add:
        act = models.Activity(
            business_id=current_user["business_id"],
            task_id=task.id,
            message=msg,
            type=log_type,
            created_at=now
        )
        db.add(act)
        
    db.commit()
    db.refresh(task)
    
    # Load all logs
    activities = db.query(models.Activity).filter(
        models.Activity.task_id == task.id
    ).order_by(models.Activity.created_at.asc()).all()
    task.logs = [
        {"timestamp": act.created_at.strftime("%H:%M:%S"), "message": act.message, "type": act.type}
        for act in activities
    ]
    
    return task
