import os
import httpx
import logging
from typing import Tuple
from app.core.config import settings

logger = logging.getLogger("agentra")

STORAGE_BUCKET = "knowledge-docs"

def save_document_file(filename: str, file_bytes: bytes) -> Tuple[str, bool]:
    """
    Saves document file to Supabase Storage.
    Falls back to writing locally in 'backend/storage/' folder if credentials are not configured.
    Returns: (file_url_or_path, is_local_storage)
    """
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    # Check if Supabase keys exist and aren't placeholders
    is_supabase_live = (
        supabase_url 
        and "supabase.co" in supabase_url 
        and supabase_key 
        and len(supabase_key) > 50
    )

    if is_supabase_live:
        logger.info(f"Supabase Storage: Attempting file upload to bucket '{STORAGE_BUCKET}'...")
        # Prepare endpoint
        clean_url = supabase_url.rstrip("/")
        # URL format: /storage/v1/object/{bucket}/{path}
        url = f"{clean_url}/storage/v1/object/{STORAGE_BUCKET}/{filename}"
        
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": "application/octet-stream"
        }
        
        try:
            # Check if bucket exists/upload directly. Meta storage uploads will auto-upsert if headers allow
            response = httpx.post(url, content=file_bytes, headers=headers, timeout=15.0)
            if response.status_code in [200, 201]:
                # Public URL path: /storage/v1/object/public/{bucket}/{path}
                public_url = f"{clean_url}/storage/v1/object/public/{STORAGE_BUCKET}/{filename}"
                logger.info(f"Supabase Storage Upload successful: {public_url}")
                return public_url, False
            else:
                # If bucket doesn't exist, log and proceed with local storage fallback
                logger.warning(f"Supabase upload status {response.status_code}: {response.text}. Falling back to local file storage.")
        except Exception as e:
            logger.error(f"Supabase Storage request exception: {str(e)}. Falling back to local file storage.")

    # Local storage fallback
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")
    os.makedirs(storage_dir, exist_ok=True)
    
    local_path = os.path.join(storage_dir, filename)
    try:
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        logger.info(f"Local Storage: Saved document file to {local_path}")
        return local_path, True
    except Exception as e:
        logger.error(f"Failed to write file locally: {str(e)}")
        # Return virtual path in case of extreme write permissions errors
        return f"virtual://storage/{filename}", True
