# Registry module for registering builders, memory, and knowledge providers.
from typing import Dict, Any

class PromptRegistry:
    """
    Central service register for mapping active prompt templates,
    builders compilers, memory controllers, and knowledge systems.
    """
    def __init__(self):
        self._templates: Dict[str, str] = {}
        self._builders: Dict[str, Any] = {}
        self._memory_providers: Dict[str, Any] = {}
        self._knowledge_providers: Dict[str, Any] = {}

    def register_template(self, key: str, template: str):
        """
        Registers a base prompt template.
        """
        self._templates[key] = template

    def register_builder(self, name: str, builder_instance: Any):
        """
        Registers a prompt compiler/builder engine.
        """
        self._builders[name] = builder_instance

    def register_memory_provider(self, name: str, provider: Any):
        """
        Registers a memory manager provider module.
        """
        self._memory_providers[name] = provider

    def register_knowledge_provider(self, name: str, provider: Any):
        """
        Registers a RAG documentation manager provider module.
        """
        self._knowledge_providers[name] = provider

    def get_template(self, key: str) -> str:
        """
        Retrieves a registered system template.
        """
        return self._templates.get(key, "You are a helpful AI employee.")

    def get_builder(self, name: str) -> Any:
        """
        Retrieves a registered prompt compiler engine.
        """
        return self._builders.get(name)

    def get_memory_provider(self, name: str) -> Any:
        """
        Retrieves a registered memory provider module.
        """
        return self._memory_providers.get(name)

    def get_knowledge_provider(self, name: str) -> Any:
        """
        Retrieves a registered RAG provider module.
        """
        return self._knowledge_providers.get(name)
