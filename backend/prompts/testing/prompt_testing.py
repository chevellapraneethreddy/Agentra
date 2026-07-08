# Testing module for running prompt test cases and comparing output variations.
from typing import Dict, List, Any, Callable

class PromptTestCase:
    """
    Data model representing a prompt unit test case configuration.
    """
    def __init__(self, case_id: str, inputs: Dict[str, Any], expected_output: str):
        self.id = case_id
        self.inputs = inputs
        self.expected = expected_output

class PromptTester:
    """
    Registers test scenarios, runs evaluations on compiled outputs,
    and runs string similarity comparison tests.
    """
    def __init__(self):
        self._cases: Dict[str, List[PromptTestCase]] = {}

    def register_test_case(self, template_key: str, case_id: str, inputs: Dict[str, Any], expected_output: str) -> PromptTestCase:
        """
        Creates and registers a test case for a prompt template.
        """
        if template_key not in self._cases:
            self._cases[template_key] = []
            
        case = PromptTestCase(case_id, inputs, expected_output)
        self._cases[template_key].append(case)
        return case

    def run_evaluations(self, template_key: str, prompt_compiler: Callable[[Dict[str, Any]], str]) -> List[Dict[str, Any]]:
        """
        Runs registered test cases using the custom prompt compiler callable.
        Evaluates similarity metrics between actual output and expected results.
        """
        cases = self._cases.get(template_key, [])
        results = []

        for case in cases:
            compiled_output = prompt_compiler(case.inputs)
            
            # Simple string overlap Jaccard similarity evaluation index metric
            s1 = set(compiled_output.lower().split())
            s2 = set(case.expected.lower().split())
            intersection = s1.intersection(s2)
            union = s1.union(s2)
            similarity = len(intersection) / len(union) if union else 1.0

            results.append({
                "caseId": case.id,
                "passed": similarity >= 0.5,
                "similarityScore": round(similarity, 3),
                "actual": compiled_output,
                "expected": case.expected
            })
        return results
