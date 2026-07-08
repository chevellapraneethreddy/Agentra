# Shared utility helpers for prompt formatting, sanitization, and token estimation.

def clean_prompt_string(text: str) -> str:
    """
    Sanitizes prompt inputs: strips excess whitespace and replaces double newlines.
    """
    if not text:
        return ""
    stripped = text.strip()
    return "\n".join([line.strip() for line in stripped.splitlines() if line.strip()])

def estimate_token_count(text: str) -> int:
    """
    Estimates token footprint for prompt sizing metrics.
    Estimates roughly 4 characters per token as standard LLM approximations.
    """
    if not text:
        return 0
    return max(1, len(text) // 4)
