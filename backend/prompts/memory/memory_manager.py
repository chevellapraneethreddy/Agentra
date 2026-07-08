# Memory manager module for handling conversation context and long/short term memory.
from typing import Dict, Any, List, Optional

class MemoryManager:
    """
    Manages short-term conversation states, user preferences contexts,
    and long-term memory logs/keys for AI Employees.
    """
    def __init__(self):
        # Maps employee_id -> List of short term conversation messages
        self._short_term_memory: Dict[str, List[Dict[str, str]]] = {}
        # Maps employee_id -> List of long term key memory points
        self._long_term_memory: Dict[str, List[str]] = {}
        # Maps business_id/employee_id -> Dict of user preference variables
        self._user_preferences: Dict[str, Dict[str, Any]] = {}

    def save_conversation_message(self, employee_id: str, role: str, content: str):
        """
        Saves a conversation message to short-term memory cache.
        """
        if employee_id not in self._short_term_memory:
            self._short_term_memory[employee_id] = []
        self._short_term_memory[employee_id].append({"role": role, "content": content})

    def save_user_preference(self, context_id: str, key: str, value: Any):
        """
        Saves a user preference config key value.
        """
        if context_id not in self._user_preferences:
            self._user_preferences[context_id] = {}
        self._user_preferences[context_id][key] = value

    def save_long_term_memory(self, employee_id: str, key_memory: str):
        """
        Saves a consolidated long-term memory reflection point.
        """
        if employee_id not in self._long_term_memory:
            self._long_term_memory[employee_id] = []
        self._long_term_memory[employee_id].append(key_memory)

    def get_short_term_memory(self, employee_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Retrieves recent short-term conversation logs.
        """
        return self._short_term_memory.get(employee_id, [])[-limit:]

    def get_long_term_memory(self, employee_id: str) -> List[str]:
        """
        Retrieves all consolidated long-term memory points.
        """
        return self._long_term_memory.get(employee_id, [])

    def get_user_preferences(self, context_id: str) -> Dict[str, Any]:
        """
        Retrieves user preferences dictionary.
        """
        return self._user_preferences.get(context_id, {})

    def retrieve_relevant_memory(self, employee_id: str, query: str) -> List[str]:
        """
        Retrieves memories matching a query context.
        Uses string-matching search in this base package implementation.
        """
        all_memories = self.get_long_term_memory(employee_id)
        # Search query overlap checks
        q_words = set(query.lower().split())
        matched = []
        for m in all_memories:
            if any(w in m.lower() for w in q_words):
                matched.append(m)
        return matched if matched else all_memories[:3]
