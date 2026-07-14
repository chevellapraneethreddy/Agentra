# Factory module for initializing AI Providers
from typing import Optional
from .base import AIProvider
from .openai import OpenAIProvider
from .claude import ClaudeProvider
from .gemini import GeminiProvider
from .openrouter import OpenRouterProvider
from .ollama import OllamaProvider

def get_provider(provider_name: str, api_key: str, model_name: str) -> AIProvider:
    """
    Returns an instance of the selected provider.
    """
    name = provider_name.lower()
    if name == "openai":
        return OpenAIProvider(api_key=api_key, model_name=model_name)
    elif name == "anthropic" or name == "claude":
        return ClaudeProvider(api_key=api_key, model_name=model_name)
    elif name == "gemini":
        return GeminiProvider(api_key=api_key, model_name=model_name)
    elif name == "openrouter":
        return OpenRouterProvider(api_key=api_key, model_name=model_name)
    elif name == "ollama":
        # api_key holds the local endpoint URL for Ollama
        return OllamaProvider(endpoint_url=api_key or "http://localhost:11434", model_name=model_name)
    else:
        raise ValueError(f"Unknown AI Provider: {provider_name}")
