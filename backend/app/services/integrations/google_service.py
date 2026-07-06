import sys
import json
import urllib.parse
import httpx
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models import models

logger = logging.getLogger("agentra")

class GoogleService:
    """
    Unified client service for Google API integrations.
    Handles Gmail, Calendar, Sheets, and Drive operations with automatic token refresh.
    """

    @staticmethod
    def refresh_access_token(db: Session, conn: models.ToolConnection) -> str:
        """Exchanges refresh token for a new access token and saves to database."""
        credentials = dict(conn.credentials)
        client_id = credentials.get("client_id")
        client_secret = credentials.get("client_secret")
        refresh_token = credentials.get("oauth_refresh_token")

        if not client_id or not client_secret or not refresh_token:
            # Bypass/fallback for sandbox mode
            logger.warning("Google refresh token parameters missing. Bypassing refresh in sandbox.")
            return credentials.get("oauth_access_token", "sandbox-access-token")

        url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }

        try:
            response = httpx.post(url, data=payload, timeout=10.0)
            if response.status_code != 200:
                raise ValueError(f"Failed to refresh Google OAuth token: {response.text}")
            
            res_data = response.json()
            new_access_token = res_data.get("access_token")
            if not new_access_token:
                raise ValueError("Response missing access_token parameter")

            # Update DB credentials dict
            credentials["oauth_access_token"] = new_access_token
            credentials["expires_at"] = (datetime.utcnow() + timedelta(seconds=res_data.get("expires_in", 3600))).isoformat() + "Z"
            conn.credentials = credentials
            
            # Record refresh sync logs
            logs = list(conn.logs)
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "OAuth access token expired. Refreshed token successfully.",
                "type": "info"
            })
            conn.logs = logs
            
            db.commit()
            logger.info(f"Google OAuth token refreshed successfully for connection: {conn.id[:8]}")
            return new_access_token
        except Exception as e:
            logger.error(f"Google OAuth refresh error: {str(e)}")
            logs = list(conn.logs)
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": f"OAuth token refresh request failed: {str(e)}",
                "type": "error"
            })
            conn.logs = logs
            db.commit()
            raise

    @staticmethod
    def make_request(db: Session, conn: models.ToolConnection, method: str, url: str, **kwargs) -> httpx.Response:
        """Wraps request execution with 401 interception and auto-token refresh."""
        credentials = conn.credentials
        access_token = credentials.get("oauth_access_token", "sandbox-access-token")

        headers = kwargs.get("headers", {})
        headers["Authorization"] = f"Bearer {access_token}"
        kwargs["headers"] = headers

        try:
            # First attempt
            response = httpx.request(method, url, **kwargs)
            if response.status_code == 401:
                logger.info("Google API request returned 401. Initiating token refresh...")
                new_token = GoogleService.refresh_access_token(db, conn)
                
                # Retry request with new token
                headers["Authorization"] = f"Bearer {new_token}"
                kwargs["headers"] = headers
                response = httpx.request(method, url, **kwargs)
                
            return response
        except Exception as e:
            logger.error(f"Google HTTP Request failed: {str(e)}")
            raise

    # --- GMAIL ACTIONS ---

    @staticmethod
    def send_email(db: Session, conn: models.ToolConnection, to_email: str, subject: str, body: str) -> Dict[str, Any]:
        """Send email via Google Mail APIs."""
        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        
        # Build standard RFC 2822 base64url encoded email
        import base64
        from email.mime.text import MIMEText
        
        message = MIMEText(body)
        message['to'] = to_email
        message['subject'] = subject
        
        raw_msg = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        payload = {"raw": raw_msg}

        # Check for Sandbox mode bypass
        if conn.credentials.get("client_id") == "sandbox":
            logger.info(f"Sandbox Gmail: Sent email to {to_email} (Subject: {subject})")
            return {"status": "success", "message": "Sandbox Gmail message sent"}

        res = GoogleService.make_request(db, conn, "POST", url, json=payload, timeout=10.0)
        if res.status_code not in [200, 201]:
            raise ValueError(f"Gmail send request failed: {res.text}")
        return {"status": "success", "response": res.json()}

    @staticmethod
    def search_emails(db: Session, conn: models.ToolConnection, query: str) -> List[Dict[str, Any]]:
        """Search messages matching query terms."""
        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={urllib.parse.quote(query) if 'urllib' in sys.modules else query}"
        
        if conn.credentials.get("client_id") == "sandbox":
            return [{"id": "sandbox-msg-1", "threadId": "sandbox-th-1"}]

        res = GoogleService.make_request(db, conn, "GET", url, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Gmail search failed: {res.text}")
        return res.json().get("messages", [])

    @staticmethod
    def read_email(db: Session, conn: models.ToolConnection, message_id: str) -> Dict[str, Any]:
        """Fetch email content body parameters."""
        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
        
        if conn.credentials.get("client_id") == "sandbox":
            return {"id": message_id, "snippet": "Sandbox email payload snippet", "subject": "Sandbox Test"}

        res = GoogleService.make_request(db, conn, "GET", url, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Gmail read failed: {res.text}")
        return res.json()

    @staticmethod
    def reply_to_email(db: Session, conn: models.ToolConnection, thread_id: str, body: str) -> Dict[str, Any]:
        """Reply to an email thread."""
        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        import base64
        from email.mime.text import MIMEText
        
        message = MIMEText(body)
        message['threadId'] = thread_id
        
        raw_msg = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        payload = {"raw": raw_msg, "threadId": thread_id}
        
        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "message": f"Sandbox replied on thread {thread_id}"}

        res = GoogleService.make_request(db, conn, "POST", url, json=payload, timeout=10.0)
        if res.status_code not in [200, 201]:
            raise ValueError(f"Gmail thread reply failed: {res.text}")
        return {"status": "success", "response": res.json()}

    # --- CALENDAR ACTIONS ---

    @staticmethod
    def create_event(db: Session, conn: models.ToolConnection, summary: str, desc: str, start: str, end: str) -> Dict[str, Any]:
        """Insert Google Calendar calendar block."""
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        payload = {
            "summary": summary,
            "description": desc,
            "start": {"dateTime": start, "timeZone": "UTC"},
            "end": {"dateTime": end, "timeZone": "UTC"}
        }

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "id": "sandbox-cal-1"}

        res = GoogleService.make_request(db, conn, "POST", url, json=payload, timeout=10.0)
        if res.status_code not in [200, 201]:
            raise ValueError(f"Calendar insert failed: {res.text}")
        return {"status": "success", "response": res.json()}

    @staticmethod
    def update_event(db: Session, conn: models.ToolConnection, event_id: str, summary: str, desc: str, start: str, end: str) -> Dict[str, Any]:
        """Update Google Calendar calendar block."""
        url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
        payload = {
            "summary": summary,
            "description": desc,
            "start": {"dateTime": start, "timeZone": "UTC"},
            "end": {"dateTime": end, "timeZone": "UTC"}
        }

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "id": event_id}

        res = GoogleService.make_request(db, conn, "PUT", url, json=payload, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Calendar update failed: {res.text}")
        return {"status": "success", "response": res.json()}

    @staticmethod
    def delete_event(db: Session, conn: models.ToolConnection, event_id: str) -> Dict[str, Any]:
        """Remove event booking."""
        url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success"}

        res = GoogleService.make_request(db, conn, "DELETE", url, timeout=10.0)
        if res.status_code not in [200, 204]:
            raise ValueError(f"Calendar deletion failed: {res.text}")
        return {"status": "success"}

    @staticmethod
    def list_upcoming_events(db: Session, conn: models.ToolConnection, limit: int = 5) -> List[Dict[str, Any]]:
        """List upcoming events."""
        now = datetime.utcnow().isoformat() + "Z"
        url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={now}&maxResults={limit}&singleEvents=true&orderBy=startTime"

        if conn.credentials.get("client_id") == "sandbox":
            return [{"id": "sandbox-cal-1", "summary": "Sandbox Team Check-in", "start": {"dateTime": now}}]

        res = GoogleService.make_request(db, conn, "GET", url, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Calendar fetch failed: {res.text}")
        return res.json().get("items", [])

    # --- DRIVE ACTIONS ---

    @staticmethod
    def upload_file(db: Session, conn: models.ToolConnection, name: str, content_bytes: bytes, mime_type: str = "application/pdf") -> Dict[str, Any]:
        """Upload file content binary to Google Drive root folder."""
        url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
        
        # Build multipart request manually
        boundary = "foo_bar_baz_boundary"
        headers = {
            "Content-Type": f"multipart/related; boundary={boundary}"
        }
        
        metadata = json.dumps({"name": name}) if "json" in sys.modules else f'{{"name": "{name}"}}'
        
        # Body construct
        body = (
            f"--{boundary}\r\n"
            f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{metadata}\r\n"
            f"--{boundary}\r\n"
            f"Content-Type: {mime_type}\r\n\r\n"
        ).encode('utf-8') + content_bytes + f"\r\n--{boundary}--".encode('utf-8')

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "id": "sandbox-drive-file-101"}

        res = GoogleService.make_request(db, conn, "POST", url, headers=headers, content=body, timeout=15.0)
        if res.status_code not in [200, 201]:
            raise ValueError(f"Google Drive upload failed: {res.text}")
        return {"status": "success", "response": res.json()}

    @staticmethod
    def search_documents(db: Session, conn: models.ToolConnection, query: str) -> List[Dict[str, Any]]:
        """Search documents list."""
        url = f"https://www.googleapis.com/drive/v3/files?q=name+contains+'{query}'"

        if conn.credentials.get("client_id") == "sandbox":
            return [{"id": "sandbox-file-1", "name": f"Sandbox {query} Guide"}]

        res = GoogleService.make_request(db, conn, "GET", url, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Google Drive search failed: {res.text}")
        return res.json().get("files", [])

    # --- SHEETS ACTIONS ---

    @staticmethod
    def read_spreadsheet(db: Session, conn: models.ToolConnection, spreadsheet_id: str, range_name: str) -> List[List[Any]]:
        """Retrieve spreadsheet data values."""
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}"

        if conn.credentials.get("client_id") == "sandbox":
            return [["Date", "SKU", "Name", "Qty"], ["2026-07-02", "PROC-PRM-101", "Premium Processor", "5"]]

        res = GoogleService.make_request(db, conn, "GET", url, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Google Sheets read failed: {res.text}")
        return res.json().get("values", [])

    @staticmethod
    def append_spreadsheet_row(db: Session, conn: models.ToolConnection, spreadsheet_id: str, range_name: str, row: List[Any]) -> Dict[str, Any]:
        """Append row list values to Google Sheet."""
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}:append?valueInputOption=RAW"
        payload = {"values": [row]}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success"}

        res = GoogleService.make_request(db, conn, "POST", url, json=payload, timeout=10.0)
        if res.status_code not in [200, 201]:
            raise ValueError(f"Google Sheets append failed: {res.text}")
        return {"status": "success", "response": res.json()}

    @staticmethod
    def update_spreadsheet_row(db: Session, conn: models.ToolConnection, spreadsheet_id: str, range_name: str, row: List[Any]) -> Dict[str, Any]:
        """Overwrite cell values in Google Sheet."""
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}?valueInputOption=RAW"
        payload = {"values": [row]}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success"}

        res = GoogleService.make_request(db, conn, "PUT", url, json=payload, timeout=10.0)
        if res.status_code != 200:
            raise ValueError(f"Google Sheets update failed: {res.text}")
        return {"status": "success", "response": res.json()}
