import httpx
import logging
from typing import Dict, Any, List
from app.models import models

logger = logging.getLogger("agentra")

class ShopifyService:
    """
    Client integration client for Shopify merchant stores.
    Requires: shopify_shop_url, shopify_access_token
    """

    @staticmethod
    def read_orders(conn: models.ToolConnection, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent store orders from Admin REST API."""
        credentials = conn.credentials
        shop_url = credentials.get("shopify_shop_url")
        access_token = credentials.get("shopify_access_token")

        if not shop_url or not access_token:
            raise ValueError("Shopify configuration keys 'shopify_shop_url' and 'shopify_access_token' are required.")

        # Clean URL format
        shop_url = shop_url.strip().rstrip('/')
        if not shop_url.startswith("https://"):
            shop_url = f"https://{shop_url}"

        # Sandbox bypass
        if access_token == "sandbox":
            return [
                {
                    "id": "1001",
                    "name": "#1001",
                    "email": "shopify-client@gmail.com",
                    "total_price": "199.99",
                    "financial_status": "paid",
                    "line_items": [{"title": "Premium Processor Unit", "quantity": 1}]
                }
            ]

        url = f"{shop_url}/admin/api/2023-10/orders.json?limit={limit}&status=any"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        try:
            response = httpx.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                raise ValueError(f"Shopify Admin API order query failed: {response.text}")
            return response.json().get("orders", [])
        except Exception as e:
            logger.error(f"Shopify orders request error: {str(e)}")
            raise

    @staticmethod
    def update_order(conn: models.ToolConnection, order_id: str, payload: dict) -> Dict[str, Any]:
        """Modify store order metadata or tags."""
        credentials = conn.credentials
        shop_url = credentials.get("shopify_shop_url").strip().rstrip('/')
        access_token = credentials.get("shopify_access_token")

        if not shop_url.startswith("https://"):
            shop_url = f"https://{shop_url}"

        if access_token == "sandbox":
            return {"status": "success", "id": order_id}

        url = f"{shop_url}/admin/api/2023-10/orders/{order_id}.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }
        body = {"order": payload}

        try:
            response = httpx.put(url, headers=headers, json=body, timeout=10.0)
            if response.status_code != 200:
                raise ValueError(f"Shopify order update failed: {response.text}")
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"Shopify order update error: {str(e)}")
            raise

    @staticmethod
    def update_inventory(conn: models.ToolConnection, inventory_item_id: str, location_id: str, new_quantity: int) -> Dict[str, Any]:
        """Set new inventory stock levels at a store warehouse location."""
        credentials = conn.credentials
        shop_url = credentials.get("shopify_shop_url").strip().rstrip('/')
        access_token = credentials.get("shopify_access_token")

        if not shop_url.startswith("https://"):
            shop_url = f"https://{shop_url}"

        if access_token == "sandbox":
            return {"status": "success"}

        url = f"{shop_url}/admin/api/2023-10/inventory_levels/set.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }
        payload = {
            "inventory_item_id": inventory_item_id,
            "location_id": location_id,
            "available": new_quantity
        }

        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=10.0)
            if response.status_code not in [200, 201]:
                raise ValueError(f"Shopify inventory update failed: {response.text}")
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"Shopify inventory sync error: {str(e)}")
            raise
