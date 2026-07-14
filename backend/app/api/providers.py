from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user, encrypt_credentials, decrypt_credentials
from app.core.database import get_db
from app.services.providers import get_provider
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[schemas.BusinessAIProvider])
def list_providers(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all configured AI Providers for the business tenant."""
    return db.query(models.BusinessAIProvider).filter(
        models.BusinessAIProvider.business_id == current_user["business_id"]
    ).all()

@router.post("/test")
def test_provider_connection(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """
    Tests credentials connectivity for a given provider prior to saving.
    """
    provider_name = payload.get("provider_name")
    api_key = payload.get("api_key")
    model_name = payload.get("model_name")
    
    if not provider_name or not api_key or not model_name:
        raise HTTPException(status_code=400, detail="Missing parameters: provider_name, api_key, and model_name are required.")
        
    try:
        provider_instance = get_provider(provider_name, api_key, model_name)
        is_valid = provider_instance.validate_key()
        if not is_valid:
            return {"success": False, "message": "Failed validation: Key format or authenticity check failed."}
        return {"success": True, "message": "Connection tested successfully."}
    except Exception as e:
        return {"success": False, "message": f"Connection test failed: {str(e)}"}

@router.post("/", response_model=schemas.BusinessAIProvider, status_code=status.HTTP_201_CREATED)
def connect_provider(
    provider_in: schemas.BusinessAIProviderCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Configure/Connect a new AI provider or updates existing settings.
    """
    # 1. Encrypt API key
    encrypted_key = None
    if provider_in.api_key:
        encrypted_key = encrypt_credentials({"api_key": provider_in.api_key})["api_key"]
        
    # Check if this provider configuration already exists for this business
    existing = db.query(models.BusinessAIProvider).filter(
        models.BusinessAIProvider.business_id == current_user["business_id"],
        models.BusinessAIProvider.provider_name == provider_in.provider_name
    ).first()
    
    # If is_default is set to True, clear previous defaults first
    if provider_in.is_default:
        db.query(models.BusinessAIProvider).filter(
            models.BusinessAIProvider.business_id == current_user["business_id"]
        ).update({"is_default": False})
        
    if existing:
        existing.api_key = encrypted_key or existing.api_key
        existing.default_model = provider_in.default_model
        existing.is_active = provider_in.is_active
        existing.is_default = provider_in.is_default or existing.is_default
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
        
    # Create new provider settings row
    provider = models.BusinessAIProvider(
        business_id=current_user["business_id"],
        provider_name=provider_in.provider_name,
        api_key=encrypted_key,
        default_model=provider_in.default_model,
        is_active=provider_in.is_active,
        is_default=provider_in.is_default
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider

@router.post("/{provider_id}/default", response_model=schemas.BusinessAIProvider)
def make_default_provider(
    provider_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch default active AI provider for the workspace."""
    # Reset all defaults
    db.query(models.BusinessAIProvider).filter(
        models.BusinessAIProvider.business_id == current_user["business_id"]
    ).update({"is_default": False})
    
    provider = db.query(models.BusinessAIProvider).filter(
        models.BusinessAIProvider.id == provider_id,
        models.BusinessAIProvider.business_id == current_user["business_id"]
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="AI Provider config not found")
        
    provider.is_default = True
    provider.is_active = True
    db.commit()
    db.refresh(provider)
    return provider

@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_provider(
    provider_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect/Remove AI provider configurations."""
    provider = db.query(models.BusinessAIProvider).filter(
        models.BusinessAIProvider.id == provider_id,
        models.BusinessAIProvider.business_id == current_user["business_id"]
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="AI Provider config not found")
        
    db.delete(provider)
    db.commit()
    return
