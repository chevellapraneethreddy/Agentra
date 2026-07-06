from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db
from app.services.storage_service import save_document_file
from app.services.knowledge_service import process_and_index_document, query_semantic_search, get_text_embedding
from datetime import datetime

router = APIRouter()

class SearchRequest(BaseModel):
    query: str

@router.get("/documents", response_model=List[schemas.Document])
def list_documents(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all knowledge base documents and their indexing statuses."""
    return db.query(models.KnowledgeDocument).filter(
        models.KnowledgeDocument.business_id == current_user["business_id"]
    ).order_by(models.KnowledgeDocument.created_at.desc()).all()

@router.post("/documents", response_model=schemas.Document, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file to Supabase Storage, index it, and generate vector embeddings."""
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    ext = file.filename.split(".")[-1].upper() if "." in file.filename else "TXT"

    # 1. Save file to storage (Supabase or local folder)
    file_url, is_local = save_document_file(file.filename, file_bytes)

    # 2. Register knowledge document metadata in database
    new_doc = models.KnowledgeDocument(
        business_id=current_user["business_id"],
        name=file.filename,
        type=ext,
        size=file_size,
        status="uploading"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 3. Asynchronously parse text, split chunks, generate embeddings, and index
    background_tasks.add_task(
        process_and_index_document,
        db=db,
        doc_id=new_doc.id,
        file_bytes=file_bytes,
        filename=file.filename
    )

    return new_doc

@router.post("/snippets", response_model=schemas.Document, status_code=status.HTTP_201_CREATED)
def add_text_snippet(
    snippet: schemas.TextSnippetCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a direct text snippet as a knowledge source and index it immediately."""
    new_doc = models.KnowledgeDocument(
        business_id=current_user["business_id"],
        name=f"Snippet: {snippet.title[:30]}...",
        type="TEXT",
        size=len(snippet.content),
        status="indexing"
    )
    db.add(new_doc)
    db.flush()

    # Index snippet inline
    try:
        # Split snippet and embed
        from app.services.knowledge_service import split_text_into_chunks
        passages = split_text_into_chunks(snippet.content)
        
        for text_chunk in passages:
            vec = get_text_embedding(text_chunk)
            chunk_obj = models.DocumentChunk(
                document_id=new_doc.id,
                text=text_chunk,
                embedding=vec
            )
            db.add(chunk_obj)
            
        new_doc.status = "indexed"
        db.commit()
        db.refresh(new_doc)
    except Exception as e:
        new_doc.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to index snippet: {str(e)}")

    return new_doc

@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a document and purge all associated vector chunk embeddings."""
    doc = db.query(models.KnowledgeDocument).filter(
        models.KnowledgeDocument.id == doc_id,
        models.KnowledgeDocument.business_id == current_user["business_id"]
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.delete(doc)
    db.commit()
    return

@router.post("/search")
def semantic_search_endpoint(
    req: SearchRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Query semantic matching passages in business knowledge base."""
    return query_semantic_search(db, current_user["business_id"], req.query)
