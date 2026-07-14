# Google Gemini Provider Implementation
from typing import List, Dict, Any, Optional, Iterator
from .base import AIProvider

class GeminiProvider(AIProvider):
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-pro"):
        self.api_key = api_key
        self.model_name = model_name

    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return f"[Google Gemini ({self.model_name})]: Simulated response to: '{prompt}'."

    def stream(self, prompt: str, system_prompt: Optional[str] = None) -> Iterator[str]:
        chunks = [f"[Gemini", " simulation", " stream", " chunk]"]
        for chunk in chunks:
            yield chunk

    def embeddings(self, text: str) -> List[float]:
        # Return mock 768-dimensional vector
        return [0.035] * 768

    def tool_call(self, prompt: str, tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "tool": "none",
            "arguments": {}
        }

    def validate_key(self) -> bool:
        # Validate format (starts with AIzaSy)
        return isinstance(self.api_key, str) and len(self.api_key) > 10 and self.api_key.startswith("AIzaSy")

    def list_models(self) -> List[str]:
        return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"]
