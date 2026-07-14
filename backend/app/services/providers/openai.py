# OpenAI Provider Implementation
from typing import List, Dict, Any, Optional, Iterator
from .base import AIProvider

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        self.api_key = api_key
        self.model_name = model_name

    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return f"[OpenAI ({self.model_name})]: Simulated response to: '{prompt}'."

    def stream(self, prompt: str, system_prompt: Optional[str] = None) -> Iterator[str]:
        chunks = [f"[OpenAI", " simulation", " stream", " chunk]"]
        for chunk in chunks:
            yield chunk

    def embeddings(self, text: str) -> List[float]:
        # Return mock 1536-dimensional vector
        return [0.015] * 1536

    def tool_call(self, prompt: str, tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "tool": "none",
            "arguments": {}
        }

    def validate_key(self) -> bool:
        # Validate format (sk-...) or mock validate length
        return isinstance(self.api_key, str) and len(self.api_key) > 10 and self.api_key.startswith("sk-")

    def list_models(self) -> List[str]:
        return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]
