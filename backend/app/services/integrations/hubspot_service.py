import httpx
import logging
from typing import Dict, Any, List
from app.models import models

logger = logging.getLogger("agentra")

class HubSpotService:
    """
    Client integration client for HubSpot CRM.
    Requires: hubspot_access_token
    """

    @staticmethod
    def read_contacts(conn: models.ToolConnection, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch CRM contacts."""
        credentials = conn.credentials
        access_token = credentials.get("hubspot_access_token")

        if not access_token:
            raise ValueError("HubSpot CRM configuration parameter 'hubspot_access_token' is required.")

        # Sandbox bypass
        if access_token == "sandbox":
            return [
                {
                    "id": "201",
                    "properties": {
                        "email": "lead@customer.com",
                        "firstname": "John",
                        "lastname": "Doe"
                    }
                }
            ]

        url = f"https://api.hubapi.com/crm/v3/objects/contacts?limit={limit}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = httpx.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                raise ValueError(f"HubSpot Contacts API fetch failed: {response.text}")
            return response.json().get("results", [])
        except Exception as e:
            logger.error(f"HubSpot contacts query failed: {str(e)}")
            raise

    @staticmethod
    def create_lead(conn: models.ToolConnection, email: str, firstname: str, lastname: str) -> Dict[str, Any]:
        """Create new client contact lead."""
        credentials = conn.credentials
        access_token = credentials.get("hubspot_access_token")

        if access_token == "sandbox":
            return {"status": "success", "id": "sandbox-lead-id"}

        url = "https://api.hubapi.com/crm/v3/objects/contacts"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "properties": {
                "email": email,
                "firstname": firstname,
                "lastname": lastname
            }
        }

        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=10.0)
            if response.status_code not in [200, 201]:
                raise ValueError(f"HubSpot Contact creation failed: {response.text}")
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"HubSpot lead creation failed: {str(e)}")
            raise

    @staticmethod
    def update_deal(conn: models.ToolConnection, deal_id: str, stage: str) -> Dict[str, Any]:
        """Update CRM deal stage metadata."""
        credentials = conn.credentials
        access_token = credentials.get("hubspot_access_token")

        if access_token == "sandbox":
            return {"status": "success"}

        url = f"https://api.hubapi.com/crm/v3/objects/deals/{deal_id}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "properties": {
                "dealstage": stage
            }
        }

        try:
            response = httpx.patch(url, headers=headers, json=payload, timeout=10.0)
            if response.status_code != 200:
                raise ValueError(f"HubSpot deal stage update failed: {response.text}")
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"HubSpot deal stage sync error: {str(e)}")
            raise
