import os
import json
import logging
from typing import Dict, Any, Optional
from google import genai

logger = logging.getLogger("agentra")

def get_gemini_client() -> Optional[genai.Client]:
    """Retrieves safe Gemini AI client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. AI Decision Layer running in dry-run/mock mode.")
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini genai.Client: {str(e)}")
        return None

class AIDecisionLayer:
    """
    Production-grade AI Decision Layer using Gemini 2.5 Pro.
    Processes raw unstructured emails and extracts structured metadata.
    """

    @staticmethod
    def classify_and_analyze_email(subject: str, body: str) -> Dict[str, Any]:
        """
        Parses email subject and body to extract category, intent, entities, urgency, meeting requests, etc.
        Returns a clean structured JSON schema.
        """
        client = get_gemini_client()
        fallback_response = {
            "category": "Other",
            "intent": "Inquiry",
            "customer_name": "Unknown",
            "company": "Unknown",
            "urgency": "Normal",
            "is_invoice": False,
            "is_meeting_request": False,
            "is_support_request": False,
            "is_sales_enquiry": False,
            "is_spam": False,
            "confidence": 0.5,
            "summary": "No AI summary generated (fallback mode)."
        }

        # Handle simple keyword-based overrides for fallback mode
        body_lower = body.lower()
        if "pricing" in body_lower or "demo" in body_lower or "quote" in body_lower or "interested" in body_lower:
            fallback_response["category"] = "Sales"
            fallback_response["is_sales_enquiry"] = True
            fallback_response["urgency"] = "Urgent"
        if "invoice" in body_lower or "bill" in body_lower or "payment" in body_lower:
            fallback_response["category"] = "Finance"
            fallback_response["is_invoice"] = True
        if "meeting" in body_lower or "schedule" in body_lower or "calendar" in body_lower or "zoom" in body_lower:
            fallback_response["is_meeting_request"] = True
        if "support" in body_lower or "help" in body_lower or "error" in body_lower or "broken" in body_lower:
            fallback_response["category"] = "Support"
            fallback_response["is_support_request"] = True

        if not client:
            return fallback_response

        prompt = (
            f"You are an expert AI email processing engine. Analyze the following email details:\n"
            f"Subject: {subject}\n"
            f"Body:\n{body}\n\n"
            f"Task: Extract the structured JSON metadata below. Return ONLY valid JSON format, with no markdown tags or headers.\n"
            f"Format requirements:\n"
            f"{{\n"
            f"  \"category\": \"Sales\" | \"Support\" | \"Finance\" | \"HR\" | \"Other\",\n"
            f"  \"intent\": \"Brief description of intent\",\n"
            f"  \"customer_name\": \"Extracted customer name or 'Unknown'\",\n"
            f"  \"company\": \"Extracted company or 'Unknown'\",\n"
            f"  \"urgency\": \"Urgent\" | \"Normal\",\n"
            f"  \"is_invoice\": true | false,\n"
            f"  \"is_meeting_request\": true | false,\n"
            f"  \"is_support_request\": true | false,\n"
            f"  \"is_sales_enquiry\": true | false,\n"
            f"  \"is_spam\": true | false,\n"
            f"  \"confidence\": 0.0 to 1.0,\n"
            f"  \"summary\": \"Brief one sentence summary of the email\"\n"
            f"}}"
        )

        try:
            # Query Gemini Pro
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt
            )
            clean_json = response.text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            return json.loads(clean_json)
        except Exception as e:
            logger.error(f"Gemini email analysis failed: {str(e)}. Falling back.")
            try:
                # Attempt fallback model
                response = client.models.generate_content(
                    model='gemini-1.5-pro',
                    contents=prompt
                )
                clean_json = response.text.strip()
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0].strip()
                return json.loads(clean_json)
            except Exception as fallback_err:
                logger.error(f"Gemini fallback model also failed: {str(fallback_err)}")
                return fallback_response
