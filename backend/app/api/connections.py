from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
import urllib.parse
import json
import os

from app.schemas import schemas
from app.models import models
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

ALL_TOOLS = [
    "gmail", "google_calendar", "google_drive", "google_sheets", 
    "whatsapp", "slack", "shopify", "hubspot", "supabase"
]

TOOL_PERMISSIONS = {
    "gmail": ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"],
    "google_calendar": ["https://www.googleapis.com/auth/calendar.events"],
    "google_drive": ["https://www.googleapis.com/auth/drive.file"],
    "google_sheets": ["https://www.googleapis.com/auth/spreadsheets"],
    "whatsapp": ["whatsapp_business_messaging", "whatsapp_business_management"],
    "slack": ["chat:write", "conversations:read"],
    "shopify": ["read_orders", "write_orders", "read_inventory"],
    "hubspot": ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.write"],
    "supabase": ["storage.objects.create", "storage.objects.read"]
}

def redact_connection(conn: models.ToolConnection) -> Dict[str, Any]:
    raw_creds = conn.credentials or {}
    redacted_creds = {}
    if "client_id" in raw_creds:
        redacted_creds["client_id"] = raw_creds["client_id"]
    for key in raw_creds:
        if key != "client_id":
            redacted_creds[key] = "********"
    return {
        "id": conn.id,
        "business_id": conn.business_id,
        "tool_name": conn.tool_name,
        "is_connected": conn.is_connected,
        "last_sync": conn.last_sync,
        "logs": conn.logs,
        "required_permissions": conn.required_permissions,
        "updated_at": conn.updated_at,
        "credentials": redacted_creds
    }

@router.get("/", response_model=List[schemas.ToolConnection])
def list_connections(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all integration connection records or return virtual disconnected placeholders."""
    conns = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == current_user["business_id"]
    ).all()
    
    conns_dict = {c.tool_name: c for c in conns}
    response = []
    
    for tool in ALL_TOOLS:
        if tool in conns_dict:
            response.append(redact_connection(conns_dict[tool]))
        else:
            virtual_conn = models.ToolConnection(
                id=f"virtual-{tool}",
                business_id=current_user["business_id"],
                tool_name=tool,
                credentials={},
                is_connected=False,
                last_sync=None,
                logs=[{
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": "Integration not connected.",
                    "type": "info"
                }],
                required_permissions=TOOL_PERMISSIONS.get(tool, []),
                updated_at=datetime.utcnow()
            )
            response.append(redact_connection(virtual_conn))
    return response

@router.post("/{tool_name}/connect", response_model=schemas.ToolConnection)
def connect_tool(
    tool_name: str,
    conn_in: schemas.ToolConnectionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect a tool by saving credentials and running an initial connection test."""
    if tool_name not in ALL_TOOLS:
        raise HTTPException(status_code=400, detail=f"Unsupported tool integration: '{tool_name}'")

    existing = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == current_user["business_id"],
        models.ToolConnection.tool_name == tool_name
    ).first()

    initial_logs = [{
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": "Connection credentials configured.",
        "type": "info"
    }]

    if existing:
        existing.credentials = conn_in.credentials
        existing.is_connected = True
        existing.logs = initial_logs
        existing.last_sync = datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        # Trigger validation test automatically on connect
        run_connection_test(db, existing)
        return redact_connection(existing)
    else:
        new_conn = models.ToolConnection(
            business_id=current_user["business_id"],
            tool_name=tool_name,
            credentials=conn_in.credentials,
            is_connected=True,
            last_sync=datetime.utcnow(),
            logs=initial_logs,
            required_permissions=TOOL_PERMISSIONS.get(tool_name, [])
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        # Trigger validation test automatically on connect
        run_connection_test(db, new_conn)
        return redact_connection(new_conn)

@router.post("/{tool_name}/test", response_model=schemas.ToolConnection)
def test_connection(
    tool_name: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger a connection health check test for a tool."""
    conn = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == current_user["business_id"],
        models.ToolConnection.tool_name == tool_name
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail=f"No connection registered for '{tool_name}'")

    run_connection_test(db, conn)
    return redact_connection(conn)

@router.post("/gmail/send-test")
def send_gmail_test(
    payload_in: Dict[str, Any] = {},
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sends a real Gmail test email using authenticated credentials, and updates activity timeline."""
    conn = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == current_user["business_id"],
        models.ToolConnection.tool_name == "gmail"
    ).first()

    if not conn or not conn.is_connected:
        raise HTTPException(
            status_code=400,
            detail="Gmail integration is not connected. Setup connection first."
        )

    # 1. Fetch authenticated user profile to get sender email address
    from app.services.integrations.google_service import GoogleService
    
    profile_url = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
    
    if conn.credentials.get("client_id") == "sandbox":
        sender_email = "sandbox-user@gmail.com"
    else:
        res = GoogleService.make_request(db, conn, "GET", profile_url, timeout=10.0)
        
        if res.status_code != 200:
            error_data = {}
            try:
                error_data = res.json().get("error", {})
            except Exception:
                pass
            
            raise HTTPException(
                status_code=res.status_code,
                detail={
                    "status_code": res.status_code,
                    "code": error_data.get("code", res.status_code),
                    "message": error_data.get("message", f"Google Profile API error: {res.text}"),
                    "request_id": res.headers.get("x-goog-correlation-context", "N/A")
                }
            )
            
        profile_data = res.json()
        sender_email = profile_data.get("emailAddress", "me@gmail.com")

    # 2. Determine recipient email address
    recipient_email = payload_in.get("recipient_email")
    if not recipient_email or recipient_email.strip() == "":
        recipient_email = sender_email

    # 3. Generate MIME email
    import base64
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    subject = "Agentra Test Email"
    body_text = (
        "Congratulations!\n\n"
        "Your Gmail integration with Agentra is working successfully.\n\n"
        "Your AI Employee can now securely send emails on your behalf.\n\n"
        "Regards,\n"
        "Agentra AI Workforce"
    )
    
    message = MIMEMultipart()
    message['to'] = recipient_email
    message['from'] = sender_email
    message['subject'] = subject
    message.attach(MIMEText(body_text, 'plain'))
    
    raw_bytes = message.as_bytes()
    raw_encoded = base64.urlsafe_b64encode(raw_bytes).decode("utf-8").rstrip("=")
    send_payload = {"raw": raw_encoded}

    if conn.credentials.get("client_id") == "sandbox":
        msg_id = "sandbox-msg-id-12345"
        thread_id = "sandbox-thread-id-12345"
        timestamp = datetime.utcnow().isoformat() + "Z"
    else:
        send_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        res_send = GoogleService.make_request(db, conn, "POST", send_url, json=send_payload, timeout=15.0)
        
        if res_send.status_code not in [200, 201]:
            error_data = {}
            try:
                error_data = res_send.json().get("error", {})
            except Exception:
                pass
            
            raise HTTPException(
                status_code=res_send.status_code,
                detail={
                    "status_code": res_send.status_code,
                    "code": error_data.get("code", res_send.status_code),
                    "message": error_data.get("message", f"Gmail Send API error: {res_send.text}"),
                    "request_id": res_send.headers.get("x-goog-correlation-context", "N/A")
                }
            )
            
        send_data = res_send.json()
        msg_id = send_data.get("id")
        thread_id = send_data.get("threadId")
        timestamp = datetime.utcnow().isoformat() + "Z"

    # 4. Save to Email Activity Log (stored inside ToolConnection logs)
    logs = list(conn.logs)
    logs.append({
        "timestamp": timestamp,
        "message": f"Sent email to {recipient_email} | Subject: {subject} | Msg ID: {msg_id} | Status: Success",
        "type": "info"
    })
    conn.logs = logs
    conn.last_sync = datetime.utcnow()
    
    # 5. Add to Agentra Activity Timeline
    new_activity = models.Activity(
        business_id=current_user["business_id"],
        message=f"Gmail: Sent test email to {recipient_email} (Message ID: {msg_id})",
        type="action"
    )
    db.add(new_activity)
    db.commit()

    return {
        "status": "success",
        "recipient": recipient_email,
        "sender": sender_email,
        "message_id": msg_id,
        "thread_id": thread_id,
        "timestamp": timestamp
    }

@router.delete("/{tool_name}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_tool(
    tool_name: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect and purge all configuration credentials for a tool."""
    conn = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == current_user["business_id"],
        models.ToolConnection.tool_name == tool_name
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Connection record not found")

    db.delete(conn)
    db.commit()
    return

@router.get("/oauth/callback")
def oauth_callback(
    code: str,
    state: str, # Usually contains the tool_name and business_id e.g. "gmail:biz_id"
    db: Session = Depends(get_db)
):
    """Exchanges Google authorization code for OAuth tokens and stores them."""
    try:
        decoded_state = urllib.parse.unquote(state)
        parts = decoded_state.split(":")
        tool_name = parts[0]
        business_id = parts[1]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid callback state payload")

    # Call Google API oauth token exchange
    url = "https://oauth2.googleapis.com/token"
    redirect_uri = "http://localhost:8000/api/v1/connections/oauth/callback"
    
    # 1. Fetch connection to extract user-configured credentials
    conn = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == business_id,
        models.ToolConnection.tool_name == tool_name
    ).first()

    existing_credentials = dict(conn.credentials) if conn else {}
    client_id = existing_credentials.get("client_id")
    client_secret = existing_credentials.get("client_secret")

    # Fallback to env vars if not found in db (for backward compatibility)
    if not client_id:
        client_id = os.getenv("GOOGLE_CLIENT_ID", "sandbox-id")
    if not client_secret:
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "sandbox-secret")

    # Call Google API oauth token exchange
    url = "https://oauth2.googleapis.com/token"
    redirect_uri = "http://localhost:8000/api/v1/connections/oauth/callback"
    
    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    access_token = "sandbox-token"
    refresh_token = "sandbox-refresh-token"
    expires_in = 3600
    scopes = []
    
    if client_id and client_id != "sandbox-id" and client_id != "sandbox":
        try:
            response = httpx.post(url, data=payload, timeout=10.0)
            if response.status_code == 200:
                res_data = response.json()
                access_token = res_data.get("access_token")
                refresh_token = res_data.get("refresh_token")
                expires_in = res_data.get("expires_in", 3600)
                scopes = res_data.get("scope", "").split(" ")
            else:
                raise ValueError(f"Google token exchange status {response.status_code}: {response.text}")
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"OAuth code exchange failed: {str(err)}")

    # Preserve existing refresh token if not returned on subsequent logins
    final_refresh_token = refresh_token if refresh_token else existing_credentials.get("oauth_refresh_token")
    
    credentials = {
        "client_id": client_id,
        "client_secret": client_secret,
        "oauth_access_token": access_token,
        "oauth_refresh_token": final_refresh_token,
        "expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + "Z",
        "scopes": scopes
    }
    
    logs = [{
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": "OAuth redirection code exchanged successfully.",
        "type": "info"
    }]
    
    if conn:
        conn.credentials = credentials
        conn.is_connected = True
        conn.logs = logs
        conn.last_sync = datetime.utcnow()
    else:
        conn = models.ToolConnection(
            business_id=business_id,
            tool_name=tool_name,
            credentials=credentials,
            is_connected=True,
            last_sync=datetime.utcnow(),
            logs=logs,
            required_permissions=TOOL_PERMISSIONS.get(tool_name, [])
        )
        db.add(conn)
        
    db.commit()
    # Return HTML success page
    from fastapi.responses import HTMLResponse
    html_content = """
    <html>
        <head><title>Authentication Successful</title></head>
        <body style="background: #09090b; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="background: #18181b; border: 1px border #27272a; padding: 2.5rem; border-radius: 12px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
                <h1 style="color: #3b82f6; margin-bottom: 1rem; font-size: 1.5rem;">Connection Authorized</h1>
                <p style="font-size: 0.875rem; color: #a1a1aa; margin-bottom: 2rem;">GaaS Platform successfully bound credentials. You can close this window now.</p>
                <button onclick="window.close()" style="background: #2563eb; color: #fff; border: none; padding: 0.5rem 1.5rem; font-size: 0.875rem; font-weight: bold; border-radius: 6px; cursor: pointer;">Close Window</button>
            </div>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

def run_connection_test(db: Session, conn: models.ToolConnection):
    """Executes a real test API validation query to check credential health."""
    tool = conn.tool_name
    credentials = conn.credentials
    logs = list(conn.logs)
    
    logs.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": "Testing connection API credential validation...",
        "type": "info"
    })
    
    # 1. Google OAuth checks (Gmail, Calendar, Sheets, Drive)
    if tool in ["gmail", "google_calendar", "google_sheets", "google_drive"]:
        access_token = credentials.get("oauth_access_token")
        refresh_token = credentials.get("oauth_refresh_token")
        expires_at = credentials.get("expires_at")
        scopes = credentials.get("scopes", [])
        client_id = credentials.get("client_id")

        if access_token == "sandbox" or client_id == "sandbox":
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Connection tested successfully (Virtual Sandbox Mode).",
                "type": "info"
            })
            conn.is_connected = True
            conn.last_sync = datetime.utcnow()
            conn.logs = logs
            db.commit()
            return

        # Prepare detailed logging trace
        logs.append({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": f"Diagnostics: [Access Token Exists: {bool(access_token)}] | [Refresh Token Exists: {bool(refresh_token)}] | [Expiry: {expires_at}] | [Scopes: {scopes}]",
            "type": "info"
        })

        test_url = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
        logs.append({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": f"API URL called: GET {test_url}",
            "type": "info"
        })

        headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            res = httpx.get(test_url, headers=headers, timeout=10.0)
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": f"Google Response Status: {res.status_code} | Body: {res.text[:150]}",
                "type": "info" if res.status_code == 200 else "warning"
            })

            # Check for 401 Unauthorized
            if res.status_code == 401:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": "HTTP 401 Unauthorized detected. Attempting automatic token refresh...",
                    "type": "warning"
                })
                
                # Attempt automatic refresh
                from app.services.integrations.google_service import GoogleService
                try:
                    new_access_token = GoogleService.refresh_access_token(db, conn)
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": "Token refreshed successfully. Retrying API request...",
                        "type": "info"
                    })
                    
                    # Retry call with new token
                    retry_headers = {"Authorization": f"Bearer {new_access_token}"}
                    retry_res = httpx.get(test_url, headers=retry_headers, timeout=10.0)
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Retry Response Status: {retry_res.status_code} | Body: {retry_res.text[:150]}",
                        "type": "info" if retry_res.status_code == 200 else "error"
                    })
                    
                    if retry_res.status_code == 200:
                        conn.is_connected = True
                    else:
                        conn.is_connected = False
                        logs.append({
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "message": f"Token verification retry failed: {retry_res.text}",
                            "type": "error"
                        })
                except Exception as refresh_err:
                    conn.is_connected = False
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Automatic token refresh failed: {str(refresh_err)}. Reconnection required.",
                        "type": "error"
                    })
            elif res.status_code == 200:
                conn.is_connected = True
            else:
                conn.is_connected = False
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Google API returned error status {res.status_code}: {res.text}",
                    "type": "error"
                })
        except Exception as conn_err:
            conn.is_connected = False
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": f"Network fetch connection failure: {str(conn_err)}",
                "type": "error"
            })

        conn.last_sync = datetime.utcnow()
        conn.logs = logs
        db.commit()
        return

    # 2. WhatsApp Cloud API check
    elif tool == "whatsapp":
        token = credentials.get("access_token")
        phone_id = credentials.get("phone_number_id")
        if token == "sandbox":
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Connection tested successfully (Virtual Sandbox Mode).",
                "type": "info"
            })
            conn.is_connected = True
        else:
            # Query Meta Graph phone endpoint
            url = f"https://graph.facebook.com/v18.0/{phone_id}"
            headers = {"Authorization": f"Bearer {token}"}
            try:
                res = httpx.get(url, headers=headers, timeout=5.0)
                if res.status_code == 200:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Connection verified. Phone Number ID: {phone_id}",
                        "type": "info"
                    })
                    conn.is_connected = True
                else:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Connection rejected by Meta Graph API: {res.text}",
                        "type": "error"
                    })
                    conn.is_connected = False
            except Exception as e:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Meta request exception: {str(e)}",
                    "type": "error"
                })
                conn.is_connected = False

    # 3. Slack Webhook / Bot token check
    elif tool == "slack":
        bot_token = credentials.get("bot_token")
        webhook_url = credentials.get("webhook_url")
        if bot_token == "sandbox" or webhook_url == "sandbox":
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Connection tested successfully (Virtual Sandbox Mode).",
                "type": "info"
            })
            conn.is_connected = True
        elif bot_token:
            url = "https://slack.com/api/auth.test"
            headers = {"Authorization": f"Bearer {bot_token}"}
            try:
                res = httpx.post(url, headers=headers, timeout=5.0)
                res_data = res.json()
                if res_data.get("ok"):
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Connection tested successfully. Workspace: {res_data.get('team')}",
                        "type": "info"
                    })
                    conn.is_connected = True
                else:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Slack credentials test failed: {res_data.get('error')}",
                        "type": "error"
                    })
                    conn.is_connected = False
            except Exception as e:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Slack request exception: {str(e)}",
                    "type": "error"
                })
                conn.is_connected = False
        else:
            # We have a webhook_url, verify by running a HEAD request or mock payload
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Slack webhook URL registered. Verification checks will test during direct alerts.",
                "type": "info"
            })
            conn.is_connected = True

    # 4. Shopify checks
    elif tool == "shopify":
        shop_url = credentials.get("shopify_shop_url", "").strip().rstrip('/')
        token = credentials.get("shopify_access_token")
        if token == "sandbox":
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Connection tested successfully (Virtual Sandbox Mode).",
                "type": "info"
            })
            conn.is_connected = True
        else:
            if not shop_url.startswith("https://"):
                shop_url = f"https://{shop_url}"
            url = f"{shop_url}/admin/api/2023-10/shop.json"
            headers = {"X-Shopify-Access-Token": token}
            try:
                res = httpx.get(url, headers=headers, timeout=5.0)
                if res.status_code == 200:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Connection verified. Shop details: {res.json().get('shop', {}).get('name')}",
                        "type": "info"
                    })
                    conn.is_connected = True
                else:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Shopify connection test failed: {res.text}",
                        "type": "error"
                    })
                    conn.is_connected = False
            except Exception as e:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Shopify request exception: {str(e)}",
                    "type": "error"
                })
                conn.is_connected = False

    # 5. HubSpot CRM checks
    elif tool == "hubspot":
        token = credentials.get("hubspot_access_token")
        if token == "sandbox":
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Connection tested successfully (Virtual Sandbox Mode).",
                "type": "info"
            })
            conn.is_connected = True
        else:
            url = "https://api.hubapi.com/crm/v3/objects/contacts?limit=1"
            headers = {"Authorization": f"Bearer {token}"}
            try:
                res = httpx.get(url, headers=headers, timeout=5.0)
                if res.status_code == 200:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": "HubSpot CRM access token verified successfully.",
                        "type": "info"
                    })
                    conn.is_connected = True
                else:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"HubSpot credentials test failed: {res.text}",
                        "type": "error"
                    })
                    conn.is_connected = False
            except Exception as e:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"HubSpot request exception: {str(e)}",
                    "type": "error"
                })
                conn.is_connected = False

    # 6. Supabase Storage checks
    elif tool == "supabase":
        url = credentials.get("supabase_url")
        key = credentials.get("supabase_key")
        bucket = credentials.get("bucket_name", "invoices")
        if key == "sandbox":
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": "Connection tested successfully (Virtual Sandbox Mode).",
                "type": "info"
            })
            conn.is_connected = True
        else:
            test_url = f"{url.strip().rstrip('/')}/storage/v1/bucket/{bucket}"
            headers = {"Authorization": f"Bearer {key}", "apikey": key}
            try:
                res = httpx.get(test_url, headers=headers, timeout=5.0)
                if res.status_code == 200:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Supabase Storage verified. Bucket '{bucket}' active.",
                        "type": "info"
                    })
                    conn.is_connected = True
                else:
                    logs.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": f"Supabase storage bucket check status {res.status_code}: {res.text}",
                        "type": "error"
                    })
                    conn.is_connected = False
            except Exception as e:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Supabase storage request exception: {str(e)}",
                    "type": "error"
                })
                conn.is_connected = False
                
    conn.last_sync = datetime.utcnow()
    conn.logs = logs
    db.commit()
