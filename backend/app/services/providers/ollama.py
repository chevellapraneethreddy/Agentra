# Ollama Provider Implementation (Local LLMs)
from typing import List, Dict, Any, Optional, Iterator
from .base import AIProvider

class OllamaProvider(AIProvider):
    def __init__(self, endpoint_url: str = "http://localhost:11434", model_name: str = "llama3"):
        self.endpoint_url = endpoint_url
        self.model_name = model_name

    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return f"[Ollama ({self.model_name})]: Simulated response to: '{prompt}'."

    def stream(self, prompt: str, system_prompt: Optional[str] = None) -> Iterator[str]:
        chunks = [f"[Ollama", " simulation", " stream", " chunk]"]
        for chunk in chunks:
            yield chunk

    def embeddings(self, text: str) -> List[float]:
        # Return mock 4096-dimensional vector (Llama-style embeddings)
        return [0.055] * 4096

    def tool_call(self, prompt: str, tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "tool": "none",
            "arguments": {}
        }

    def validate_key(self) -> bool:
        # Validate endpoint (always True for mock ease, but verifies endpoint format)
        return isinstance(self.endpoint_url, str) and len(self.endpoint_url) > 0

    def list_models(self) -> List[str]:
        return ["llama3", "mistral", "phi3", "gemma"]
