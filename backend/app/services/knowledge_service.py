import os
import io
import csv
import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from pypdf import PdfReader
from docx import Document
from google import genai

from app.models import models
from app.core.config import settings

logger = logging.getLogger("agentra")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text pages from PDF using pypdf."""
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text_pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_pages.append(text)
        return "\n\n".join(text_pages)
    except Exception as e:
        logger.error(f"PDF extraction error: {str(e)}")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text paragraphs from DOCX using python-docx."""
    try:
        docx_file = io.BytesIO(file_bytes)
        doc = Document(docx_file)
        paragraphs = [p.text for p in doc.paragraphs if p.text]
        return "\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction error: {str(e)}")
        return ""

def extract_text_from_csv(file_bytes: bytes) -> str:
    """Format CSV grid contents into text representation."""
    try:
        csv_file = io.StringIO(file_bytes.decode('utf-8', errors='ignore'))
        reader = csv.reader(csv_file)
        rows_text = []
        for i, row in enumerate(reader):
            rows_text.append(", ".join(row))
        return "\n".join(rows_text)
    except Exception as e:
        logger.error(f"CSV extraction error: {str(e)}")
        return ""

def extract_text_from_image(file_bytes: bytes, mime_type: str) -> str:
    """Send image binary to Gemini 2.5 Pro to perform multimodal OCR."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY missing. OCR image bypass: logging simple image upload details.")
        return "Uploaded image file content. OCR skipped due to missing API key."
        
    logger.info("Multimodal OCR: Sending image to Gemini 2.5 Pro for OCR extraction...")
    prompt = (
        "Extract all legible text from this document image. "
        "Do not summarize; output exactly what is written word-for-word. "
        "If there is no text, write a detailed caption describing the visual elements, charts, or layouts."
    )
    
    try:
        client = genai.Client(api_key=api_key)
        # In python google-genai, we pass raw image bytes using types.Part.from_bytes
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=[
                genai.types.Part.from_bytes(
                    data=file_bytes,
                    mime_type=mime_type,
                ),
                prompt
            ]
        )
        extracted = response.text.strip()
        logger.info(f"Multimodal OCR successful. Extracted {len(extracted)} chars.")
        return extracted
    except Exception as e:
        logger.error(f"OCR request failed: {str(e)}")
        return "Image file content. (OCR parsing encountered server errors)"

def get_text_embedding(text: str) -> List[float]:
    """Generate 768 dimension text embedding vector using text-embedding-004."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback keyword-hash mapping if offline
        words = text.lower().split()
        vector = [0.0] * 768
        for word in words:
            # Hash word to index
            idx = hash(word) % 768
            vector[idx] += 1.0
        # Normalize vector
        magnitude = sum(x*x for x in vector) ** 0.5
        if magnitude > 0:
            vector = [x / magnitude for x in vector]
        return vector
        
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.embed_content(
            model='text-embedding-004',
            contents=text
        )
        # Extract embeddings list from response
        embedding = response.embeddings[0].values
        return embedding
    except Exception as e:
        logger.error(f"Embedding api failed: {str(e)}. Returning deterministic fallback vector.")
        # Fallback bag-of-words hash
        words = text.lower().split()
        vector = [0.0] * 768
        for word in words:
            idx = hash(word) % 768
            vector[idx] += 1.0
        magnitude = sum(x*x for x in vector) ** 0.5
        if magnitude > 0:
            vector = [x / magnitude for x in vector]
        return vector

def split_text_into_chunks(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """Chunk document text into overlapping segments."""
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
    return chunks

def process_and_index_document(db: Session, doc_id: str, file_bytes: bytes, filename: str) -> bool:
    """Extract, chunk, embed, and store document RAG passages in DB."""
    doc = db.query(models.KnowledgeDocument).filter(models.KnowledgeDocument.id == doc_id).first()
    if not doc:
        return False
        
    doc.status = "indexing"
    db.flush()
    
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    extracted_text = ""
    
    # 1. Parse based on extension
    if ext == "pdf":
        extracted_text = extract_text_from_pdf(file_bytes)
    elif ext in ["docx", "doc"]:
        extracted_text = extract_text_from_docx(file_bytes)
    elif ext == "csv":
        extracted_text = extract_text_from_csv(file_bytes)
    elif ext in ["png", "jpg", "jpeg", "webp"]:
        mime = f"image/{ext}" if ext != "jpg" else "image/jpeg"
        extracted_text = extract_text_from_image(file_bytes, mime)
    else:
        # Default read text
        try:
            extracted_text = file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            extracted_text = ""
            
    if not extracted_text:
        doc.status = "failed"
        db.commit()
        return False
        
    # 2. Chunk text
    passages = split_text_into_chunks(extracted_text)
    
    # 3. Embed chunks and save
    try:
        for text_chunk in passages:
            vec = get_text_embedding(text_chunk)
            chunk_obj = models.DocumentChunk(
                document_id=doc.id,
                text=text_chunk,
                embedding=vec
            )
            db.add(chunk_obj)
            
        doc.status = "indexed"
        db.commit()
        logger.info(f"RAG Indexing: Extracted and indexed {len(passages)} passages for document '{filename}'.")
        return True
    except Exception as e:
        logger.error(f"RAG Indexing failed: {str(e)}")
        doc.status = "failed"
        db.commit()
        return False

def calculate_cosine_similarity(vecA: List[float], vecB: List[float]) -> float:
    """Compute cosine similarity score between two float vectors."""
    if not vecA or not vecB or len(vecA) != len(vecB):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vecA, vecB))
    normA = sum(a*a for a in vecA) ** 0.5
    normB = sum(b*b for b in vecB) ** 0.5
    if normA * normB == 0:
        return 0.0
    return float(dot_product / (normA * normB))

def query_semantic_search(db: Session, business_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Execute vector cosine similarity query over all business document chunks."""
    if not query:
        return []
        
    query_vector = get_text_embedding(query)
    
    # Load all chunks for this business
    chunks = db.query(models.DocumentChunk).join(models.KnowledgeDocument).filter(
        models.KnowledgeDocument.business_id == business_id
    ).all()
    
    results = []
    for chunk in chunks:
        score = calculate_cosine_similarity(query_vector, chunk.embedding)
        results.append({
            "chunk_id": chunk.id,
            "document_name": chunk.document.name,
            "document_type": chunk.document.type,
            "text": chunk.text,
            "score": round(score, 3)
        })
        
    # Sort descending by score
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]
