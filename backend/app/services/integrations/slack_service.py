import httpx
import logging
from typing import Dict, Any, List
from app.models import models

logger = logging.getLogger("agentra")

class SlackService:
    """
    Client integration client for Slack channels.
    Supports incoming webhook URLs and standard Web API tokens.
    """

    @staticmethod
    def post_message(conn: models.ToolConnection, message: str, channel: str = None) -> Dict[str, Any]:
        """Post a text message or markdown alert blocks."""
        credentials = conn.credentials
        webhook_url = credentials.get("webhook_url")
        bot_token = credentials.get("bot_token")
        default_channel = credentials.get("default_channel", "#general")

        if not webhook_url and not bot_token:
            raise ValueError("Slack connection configuration missing: 'webhook_url' or 'bot_token' is required.")

        # Sandbox bypass
        if bot_token == "sandbox" or webhook_url == "sandbox":
            logger.info(f"Sandbox Slack: Posted to {channel or default_channel}: {message}")
            return {"status": "success"}

        if webhook_url:
            payload = {"text": message}
            if channel:
                payload["channel"] = channel
            try:
                response = httpx.post(webhook_url, json=payload, timeout=10.0)
                if response.status_code not in [200, 201]:
                    raise ValueError(f"Slack webhook post failed: {response.text}")
                return {"status": "success"}
            except Exception as e:
                logger.error(f"Slack webhook request failed: {str(e)}")
                raise
        else:
            url = "https://slack.com/api/chat.postMessage"
            headers = {
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "channel": channel or default_channel,
                "text": message
            }
            try:
                response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
                res_data = response.json()
                if not res_data.get("ok"):
                    raise ValueError(f"Slack API chat.postMessage failed: {res_data.get('error')}")
                return {"status": "success"}
            except Exception as e:
                logger.error(f"Slack API chat request failed: {str(e)}")
                raise

    @staticmethod
    def read_channels(conn: models.ToolConnection) -> List[Dict[str, Any]]:
        """List active workspace public channels using Web API token."""
        credentials = conn.credentials
        bot_token = credentials.get("bot_token")

        if not bot_token:
            raise ValueError("Slack Web API token ('bot_token') is required to list channels.")

        if bot_token == "sandbox":
            return [{"id": "C12345", "name": "general"}, {"id": "C67890", "name": "random"}]

        url = "https://slack.com/api/conversations.list"
        headers = {
            "Authorization": f"Bearer {bot_token}"
        }
        try:
            response = httpx.get(url, headers=headers, timeout=10.0)
            res_data = response.json()
            if not res_data.get("ok"):
                raise ValueError(f"Slack conversations.list failed: {res_data.get('error')}")
            return res_data.get("channels", [])
        except Exception as e:
            logger.error(f"Slack conversations.list query failed: {str(e)}")
            raise
