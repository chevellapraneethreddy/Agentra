import httpx
import logging
from typing import Dict, Any
from app.models import models

logger = logging.getLogger("agentra")

class WhatsAppService:
    """
    Client integration client for WhatsApp Cloud API.
    Uses credentials Saved in ToolConnection.
    """

    @staticmethod
    def send_message(conn: models.ToolConnection, to_number: str, text: str) -> Dict[str, Any]:
        """Send a standard text message."""
        credentials = conn.credentials
        access_token = credentials.get("access_token")
        phone_number_id = credentials.get("phone_number_id")

        if not access_token or not phone_number_id:
            raise ValueError("Missing WhatsApp API configuration: 'access_token' and 'phone_number_id' are required.")

        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"body": text}
        }

        # Sandbox bypass
        if access_token == "sandbox":
            logger.info(f"Sandbox WhatsApp message sent to {to_number}: {text}")
            return {"status": "success", "message": "Sandbox message sent"}

        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if response.status_code not in [200, 201]:
                raise ValueError(f"WhatsApp message post failed: {response.text}")
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"WhatsApp API connection error: {str(e)}")
            raise

    @staticmethod
    def send_template(conn: models.ToolConnection, to_number: str, template_name: str, language: str = "en_US") -> Dict[str, Any]:
        """Send a predefined Meta WhatsApp Template message."""
        credentials = conn.credentials
        access_token = credentials.get("access_token")
        phone_number_id = credentials.get("phone_number_id")

        if not access_token or not phone_number_id:
            raise ValueError("Missing WhatsApp config keys.")

        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language}
            }
        }

        if access_token == "sandbox":
            logger.info(f"Sandbox WhatsApp Template '{template_name}' sent to {to_number}")
            return {"status": "success"}

        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if response.status_code not in [200, 201]:
                raise ValueError(f"WhatsApp template post failed: {response.text}")
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"WhatsApp Template error: {str(e)}")
            raise
