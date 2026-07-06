from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3005", "http://localhost:3001"]
    SUPABASE_JWT_SECRET: str = "your-supabase-jwt-secret-here"
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-supabase-anon-key-here"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
