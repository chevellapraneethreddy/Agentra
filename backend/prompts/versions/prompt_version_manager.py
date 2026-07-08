# Version manager module for tracking prompt revisions and rollbacks.
from typing import Dict, List, Optional
from datetime import datetime
import uuid

class PromptVersion:
    """
    Data model representing a single static version of a prompt template.
    """
    def __init__(
        self,
        prompt_id: str,
        version: str,
        author: str,
        description: str,
        prompt_content: str,
        created_at: Optional[datetime] = None
    ):
        self.id = prompt_id
        self.version = version
        self.author = author
        self.description = description
        self.prompt = prompt_content
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Serialize version properties."""
        return {
            "id": self.id,
            "version": self.version,
            "author": self.author,
            "createdAt": self.created_at.isoformat(),
            "description": self.description,
            "prompt": self.prompt
        }

class PromptVersionManager:
    """
    Manages template revisions history list. Supports registering new versions
    and rolling back to previous version checkpoints.
    """
    def __init__(self):
        # Maps template_key (e.g. 'operations_v1') -> List of PromptVersion
        self._history: Dict[str, List[PromptVersion]] = {}

    def register_version(
        self,
        template_key: str,
        version: str,
        author: str,
        description: str,
        prompt_content: str
    ) -> PromptVersion:
        """
        Creates and stores a new prompt template version.
        """
        if template_key not in self._history:
            self._history[template_key] = []
            
        new_ver = PromptVersion(
            prompt_id=str(uuid.uuid4()),
            version=version,
            author=author,
            description=description,
            prompt_content=prompt_content
        )
        self._history[template_key].append(new_ver)
        return new_ver

    def get_version(self, template_key: str, version: str) -> Optional[PromptVersion]:
        """
        Retrieves a specific version record for a prompt template.
        """
        versions = self._history.get(template_key, [])
        for v in versions:
            if v.version == version:
                return v
        return None

    def list_versions(self, template_key: str) -> List[PromptVersion]:
        """
        Returns the entire change log history list for a template.
        """
        return self._history.get(template_key, [])

    def rollback_to_version(self, template_key: str, target_version: str) -> Optional[PromptVersion]:
        """
        Rolls back the active template to a previous target checkpoint version.
        Moves target version to the top of the history stack list.
        """
        target = self.get_version(template_key, target_version)
        if not target:
            return None
            
        # Re-register it as the latest version to perform the rollback transparently
        return self.register_version(
            template_key=template_key,
            version=f"{target_version}-rollback-{datetime.utcnow().strftime('%M%S')}",
            author="System (Rollback)",
            description=f"Rolled back template key '{template_key}' to version {target_version}.",
            prompt_content=target.prompt
        )
