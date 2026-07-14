# Abstract Base Provider for AI Models
from typing import List, Dict, Any, Optional, Iterator
from abc import ABC, abstractmethod

class AIProvider(ABC):
    """
    Interface definition for all AI providers.
    All providers must implement these methods.
    """
    
    @abstractmethod
    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Sends a message and returns the text response."""
        pass
        
    @abstractmethod
    def stream(self, prompt: str, system_prompt: Optional[str] = None) -> Iterator[str]:
        """Sends a message and yields streaming chunks."""
        pass

    @abstractmethod
    def embeddings(self, text: str) -> List[float]:
        """Generates embedding vector for text."""
        pass

    @abstractmethod
    def tool_call(self, prompt: str, tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Sends prompt along with tool schemas and returns tool call instructions."""
        pass

    @abstractmethod
    def validate_key(self) -> bool:
        """Validates if the provided API key is authentic."""
        pass

    @abstractmethod
    def list_models(self) -> List[str]:
        """Lists all supported model strings."""
        pass
