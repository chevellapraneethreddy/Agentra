# Analytics module for tracking prompt execution metrics, token counts, costs, and success rates.
from typing import Dict, Any, List
from datetime import datetime

class PromptAnalytics:
    """
    Tracks compiled LLM executions performance metrics, including token usage,
    latencies, computed pricing costs, and error/success rates.
    """
    def __init__(self):
        # List of execution event dict logs
        self._runs: List[Dict[str, Any]] = []

    def record_execution(
        self,
        prompt_key: str,
        response_time_ms: float,
        tokens_input: int,
        tokens_output: int,
        success: bool,
        cost_per_million_input: float = 0.075,
        cost_per_million_output: float = 0.30
    ) -> Dict[str, Any]:
        """
        Logs a compiled run execution metadata record.
        """
        # Calculate pricing cost based on input/output tokens
        input_cost = (tokens_input / 1_000_000) * cost_per_million_input
        output_cost = (tokens_output / 1_000_000) * cost_per_million_output
        total_cost = input_cost + output_cost

        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "promptKey": prompt_key,
            "responseTimeMs": response_time_ms,
            "tokensInput": tokens_input,
            "tokensOutput": tokens_output,
            "cost": total_cost,
            "success": success
        }
        self._runs.append(record)
        return record

    def get_summary_metrics(self, prompt_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Aggregates logs and computes average latency, token counts, costs, and success metrics.
        """
        filtered = [r for r in self._runs if not prompt_key or r["promptKey"] == prompt_key]
        if not filtered:
            return {
                "totalRuns": 0,
                "avgResponseTimeMs": 0.0,
                "totalCost": 0.0,
                "successRate": 0.0,
                "failureRate": 0.0
            }

        total = len(filtered)
        successes = sum(1 for r in filtered if r["success"])
        total_cost = sum(r["cost"] for r in filtered)
        avg_time = sum(r["responseTimeMs"] for r in filtered) / total

        return {
            "totalRuns": total,
            "avgResponseTimeMs": round(avg_time, 2),
            "totalCost": round(total_cost, 6),
            "successRate": round((successes / total) * 100, 2),
            "failureRate": round(((total - successes) / total) * 100, 2)
        }
Class = PromptAnalytics
