import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("agentra")

class ToolManager:
    """
    Unified manager executing live business operations actions 
    using credentials saved in the SQL database.
    """

    @staticmethod
    def send_whatsapp_message(credentials: Dict[str, Any], to_number: str, message: str) -> Dict[str, Any]:
        """
        Send a text notification via WhatsApp Cloud API.
        Requires: access_token, phone_number_id
        """
        access_token = credentials.get("access_token")
        phone_number_id = credentials.get("phone_number_id")

        if not access_token or not phone_number_id:
            raise ValueError("Missing WhatsApp API configuration: 'access_token' and 'phone_number_id' are required.")

        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        # WhatsApp Cloud API payload formatting
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {
                "body": message
            }
        }

        logger.info(f"WhatsApp Cloud API: Sending message to {to_number}...")
        
        # In a real setup, we make the HTTP POST
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if response.status_code not in [200, 201]:
                logger.error(f"WhatsApp API Error: {response.text}")
                return {"status": "error", "detail": response.text}
            return {"status": "success", "response": response.json()}
        except Exception as e:
            logger.error(f"WhatsApp request failed: {str(e)}")
            return {"status": "error", "detail": str(e)}

    @staticmethod
    def send_gmail_email(credentials: Dict[str, Any], to_email: str, subject: str, body: str) -> Dict[str, Any]:
        """
        Send a notification email via Gmail SMTP or Google API.
        Requires: sender_email, app_password (or oauth token)
        """
        sender_email = credentials.get("sender_email")
        app_password = credentials.get("app_password")

        if not sender_email or not app_password:
            raise ValueError("Missing Gmail credentials: 'sender_email' and 'app_password' are required.")

        logger.info(f"Gmail SMTP: Sending email to {to_email}...")

        # Setup SMTP MIME message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        try:
            # Connect to standard Gmail TLS server on port 587
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, app_password)
            text = msg.as_string()
            server.sendmail(sender_email, to_email, text)
            server.quit()
            return {"status": "success"}
        except Exception as e:
            logger.error(f"SMTP send failure: {str(e)}")
            return {"status": "error", "detail": str(e)}

    @staticmethod
    def create_calendar_event(credentials: Dict[str, Any], summary: str, description: str, start_iso: str, end_iso: str) -> Dict[str, Any]:
        """
        Insert an operational reminder into Google Calendar.
        Requires: oauth_access_token
        """
        token = credentials.get("oauth_access_token")
        if not token:
            raise ValueError("Google Calendar authorization missing: OAuth token is required.")

        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_iso, "timeZone": "UTC"},
            "end": {"dateTime": end_iso, "timeZone": "UTC"}
        }

        logger.info("Google Calendar API: Booking operational event...")
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if response.status_code not in [200, 201]:
                return {"status": "error", "detail": response.text}
            return {"status": "success", "response": response.json()}
        except Exception as e:
            return {"status": "error", "detail": str(e)}

    @staticmethod
    def append_sheets_row(credentials: Dict[str, Any], spreadsheet_id: str, range_name: str, values: List[Any]) -> Dict[str, Any]:
        """
        Append stock or fulfillment data to a Google Sheet log.
        Requires: oauth_access_token
        """
        token = credentials.get("oauth_access_token")
        if not token:
            raise ValueError("Google Sheets authorization missing: OAuth token is required.")

        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}:append?valueInputOption=RAW"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "values": [values]
        }

        logger.info(f"Google Sheets API: Appending log row to sheet {spreadsheet_id}...")
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if response.status_code not in [200, 201]:
                return {"status": "error", "detail": response.text}
            return {"status": "success", "response": response.json()}
        except Exception as e:
            return {"status": "error", "detail": str(e)}

    @staticmethod
    def post_slack_message(credentials: Dict[str, Any], message: str, channel: Optional[str] = None) -> Dict[str, Any]:
        """
        Post sales notification alerts directly to a Slack workspace channel.
        Requires: webhook_url (or bot_token)
        """
        webhook_url = credentials.get("webhook_url")
        bot_token = credentials.get("bot_token")

        if not webhook_url and not bot_token:
            raise ValueError("Slack connection configuration missing: 'webhook_url' or 'bot_token' is required.")

        logger.info("Slack API: Dispatching notification alert...")

        if webhook_url:
            # Standard incoming webhook post
            payload = {"text": message}
            if channel:
                payload["channel"] = channel
                
            try:
                response = httpx.post(webhook_url, json=payload, timeout=10.0)
                if response.status_code not in [200, 201]:
                    return {"status": "error", "detail": response.text}
                return {"status": "success"}
            except Exception as e:
                return {"status": "error", "detail": str(e)}
        else:
            # Bot token Web API post
            url = "https://slack.com/api/chat.postMessage"
            headers = {
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "channel": channel or "#general",
                "text": message
            }
            try:
                response = httpx.post(url, json=payload, headers=headers, timeout=10.0)
                res_data = response.json()
                if not res_data.get("ok"):
                    return {"status": "error", "detail": res_data.get("error")}
                return {"status": "success"}
            except Exception as e:
                return {"status": "error", "detail": str(e)}
