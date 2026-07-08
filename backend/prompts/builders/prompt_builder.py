# Prompt builder module for constructing dynamic LLM prompts.
from typing import Dict, Any, List

class PromptBuilder:
    """
    Builds final prompt strings dynamically by combining base system instructions,
    user directives, company contextual properties, memories, and tool schemas.
    """

    @staticmethod
    def build_prompt(
        system_template: str,
        user_instructions: str,
        company_context: Dict[str, Any],
        memory_logs: List[str],
        knowledge_context: List[str],
        tools: List[str]
    ) -> str:
        """
        Merges inputs and returns the compiled prompt string.
        """
        # 1. Format Company Context Section
        context_str = "\n".join([f"- {key.upper()}: {value}" for key, value in company_context.items()])
        if not context_str:
            context_str = "No specific company context loaded."

        # 2. Format Memory Section
        memory_str = "\n".join([f"* {log}" for log in memory_logs])
        if not memory_str:
            memory_str = "No conversational memory records found."

        # 3. Format Knowledge Section
        knowledge_str = "\n".join([f"- {doc}" for doc in knowledge_context])
        if not knowledge_str:
            knowledge_str = "No matching RAG documentation retrieved."

        # 4. Format Tools Section
        tools_str = ", ".join(tools)
        if not tools_str:
            tools_str = "No workspace integration tools configured."

        # 5. Compile Final Prompt Template
        compiled_prompt = (
            f"=== SYSTEM INSTRUCTIONS ===\n"
            f"{system_template.strip()}\n\n"
            f"=== COMPANY CONTEXT ===\n"
            f"{context_str}\n\n"
            f"=== CONVERSATIONAL MEMORY ===\n"
            f"{memory_str}\n\n"
            f"=== RETRIEVED KNOWLEDGE ===\n"
            f"{knowledge_str}\n\n"
            f"=== AVAILABLE TOOLS ===\n"
            f"Allowed tool executions: [{tools_str}]\n\n"
            f"=== USER DIRECTIVES ===\n"
            f"{user_instructions.strip()}\n"
        )
        return compiled_prompt
