import httpx
import logging
from typing import Dict, Any
from app.models import models

logger = logging.getLogger("agentra")

class SupabaseService:
    """
    Client integration client for Supabase Storage buckets.
    Requires: supabase_url, supabase_key, bucket_name
    """

    @staticmethod
    def upload_file(conn: models.ToolConnection, path: str, content_bytes: bytes, content_type: str = "application/pdf") -> Dict[str, Any]:
        """Upload a binary file directly to a Supabase bucket."""
        credentials = conn.credentials
        supabase_url = credentials.get("supabase_url")
        supabase_key = credentials.get("supabase_key")
        bucket_name = credentials.get("bucket_name", "invoices")

        if not supabase_url or not supabase_key:
            raise ValueError("Supabase configuration keys 'supabase_url' and 'supabase_key' are required.")

        # Clean URL format
        supabase_url = supabase_url.strip().rstrip('/')

        # Sandbox bypass
        if supabase_key == "sandbox":
            logger.info(f"Sandbox Supabase: Uploaded {path} to bucket '{bucket_name}'")
            return {"status": "success", "url": f"{supabase_url}/storage/v1/object/public/{bucket_name}/{path}"}

        url = f"{supabase_url}/storage/v1/object/{bucket_name}/{path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": content_type
        }

        try:
            response = httpx.post(url, content=content_bytes, headers=headers, timeout=15.0)
            if response.status_code not in [200, 201]:
                raise ValueError(f"Supabase upload failed: {response.text}")
            
            public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{path}"
            return {"status": "success", "url": public_url}
        except Exception as e:
            logger.error(f"Supabase upload request failed: {str(e)}")
            raise
