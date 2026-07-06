import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models import models
from app.services.integrations.google_service import GoogleService
from app.services.integrations.gmail_workflows import GmailWorkflows
from app.services.integrations.whatsapp_service import WhatsAppService
from app.services.integrations.slack_service import SlackService
from app.services.integrations.shopify_service import ShopifyService
from app.services.integrations.hubspot_service import HubSpotService
from app.services.integrations.supabase_service import SupabaseService

logger = logging.getLogger("agentra")

class ToolEngine:
    """
    Central dispatch engine routing AI Employee actions to live integrations.
    Tracks last sync timestamps and logs execution events.
    """

    @staticmethod
    def execute_tool(
        db: Session, 
        business_id: str, 
        tool_name: str, 
        action: str, 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a tool action securely for a business workspace."""
        logger.info(f"ToolEngine: Executing tool '{tool_name}' / action '{action}' for Business {business_id}...")
        
        # Check if generic tool mapping or Google sharing
        if tool_name in ["generic", "abstract"]:
            conn = models.ToolConnection(
                business_id=business_id,
                tool_name=tool_name,
                credentials={},
                is_connected=True,
                logs=[]
            )
        else:
            # 1. Fetch connection
            conn = db.query(models.ToolConnection).filter(
                models.ToolConnection.business_id == business_id,
                models.ToolConnection.tool_name == tool_name
            ).first()

            # If not connected, check if Gmail connection exists to inherit Google Workspace services automatically
            if (not conn or not conn.is_connected) and tool_name in ["google_calendar", "google_drive", "google_sheets"]:
                gmail_conn = db.query(models.ToolConnection).filter(
                    models.ToolConnection.business_id == business_id,
                    models.ToolConnection.tool_name == "gmail"
                ).first()
                if gmail_conn and gmail_conn.is_connected:
                    logger.info(f"ToolEngine: Inherited active Gmail credentials for Google Workspace '{tool_name}'")
                    if not conn:
                        conn = models.ToolConnection(
                            business_id=business_id,
                            tool_name=tool_name,
                            credentials=gmail_conn.credentials,
                            is_connected=True,
                            required_permissions=gmail_conn.required_permissions,
                            logs=[]
                        )
                        db.add(conn)
                        db.flush()
                    else:
                        conn.credentials = gmail_conn.credentials
                        conn.is_connected = True
                        db.flush()

            # If still not connected, we handle as sandbox fallback
            if not conn or not conn.is_connected:
                logger.warning(f"Connection for '{tool_name}' is disconnected or missing. Provisioning virtual sandbox connection.")
                conn = models.ToolConnection(
                    business_id=business_id,
                    tool_name=tool_name,
                    credentials={"client_id": "sandbox", "bot_token": "sandbox", "access_token": "sandbox", "shopify_access_token": "sandbox", "hubspot_access_token": "sandbox", "supabase_key": "sandbox"},
                    is_connected=False,
                    logs=[]
                )
                db.add(conn)
                db.flush()

        logs = list(conn.logs)
        logs_count_before = len(logs)

        try:
            result = {}
            # 2. Route action to matching service
            if tool_name in ["generic", "abstract"]:
                if action == "send_message":
                    recipient = params.get("recipient") or params.get("to_email") or ""
                    if "@" in recipient:
                        gmail_conn = db.query(models.ToolConnection).filter(
                            models.ToolConnection.business_id == business_id,
                            models.ToolConnection.tool_name == "gmail",
                            models.ToolConnection.is_connected == True
                        ).first()
                        if gmail_conn:
                            result = GoogleService.send_email(db, gmail_conn, recipient, params.get("subject", "AI Alert"), params.get("body", ""))
                            conn.last_sync = datetime.utcnow()
                            conn.is_connected = True
                            db.commit()
                            return {"status": "success", "result": result}
                            
                    if "whatsapp" in params or recipient.startswith("+") or recipient.isdigit():
                        wa_conn = db.query(models.ToolConnection).filter(
                            models.ToolConnection.business_id == business_id,
                            models.ToolConnection.tool_name == "whatsapp",
                            models.ToolConnection.is_connected == True
                        ).first()
                        if wa_conn:
                            result = WhatsAppService.send_message(wa_conn, recipient, params.get("body") or params.get("message", ""))
                            conn.last_sync = datetime.utcnow()
                            conn.is_connected = True
                            db.commit()
                            return {"status": "success", "result": result}

                    slack_conn = db.query(models.ToolConnection).filter(
                        models.ToolConnection.business_id == business_id,
                        models.ToolConnection.tool_name == "slack",
                        models.ToolConnection.is_connected == True
                    ).first()
                    if slack_conn:
                        result = SlackService.post_message(slack_conn, params.get("body") or params.get("message", ""), params.get("channel"))
                        conn.last_sync = datetime.utcnow()
                        conn.is_connected = True
                        db.commit()
                        return {"status": "success", "result": result}
                        
                    gmail_conn = db.query(models.ToolConnection).filter(
                        models.ToolConnection.business_id == business_id,
                        models.ToolConnection.tool_name == "gmail"
                    ).first()
                    result = GoogleService.send_email(db, gmail_conn, recipient or "client@billing.com", params.get("subject", "AI Alert"), params.get("body", ""))
                    
                elif action == "schedule_meeting":
                    cal_conn = db.query(models.ToolConnection).filter(
                        models.ToolConnection.business_id == business_id,
                        models.ToolConnection.tool_name == "google_calendar"
                    ).first()
                    if not cal_conn or not cal_conn.is_connected:
                        gmail_conn = db.query(models.ToolConnection).filter(
                            models.ToolConnection.business_id == business_id,
                            models.ToolConnection.tool_name == "gmail"
                        ).first()
                        cal_conn = models.ToolConnection(
                            business_id=business_id,
                            tool_name="google_calendar",
                            credentials=gmail_conn.credentials if (gmail_conn and gmail_conn.is_connected) else {"client_id": "sandbox"},
                            is_connected=True,
                            logs=[]
                        )
                    
                    start_time = params.get("start_iso") or (datetime.utcnow() + timedelta(days=1, hours=4)).isoformat() + "Z"
                    end_time = params.get("end_iso") or (datetime.utcnow() + timedelta(days=1, hours=5)).isoformat() + "Z"
                    result = GoogleService.create_event(db, cal_conn, params.get("summary", "AI Scheduled Event"), params.get("description", ""), start_time, end_time)

                elif action == "upload_document":
                    drive_conn = db.query(models.ToolConnection).filter(
                        models.ToolConnection.business_id == business_id,
                        models.ToolConnection.tool_name == "google_drive"
                    ).first()
                    if not drive_conn or not drive_conn.is_connected:
                        gmail_conn = db.query(models.ToolConnection).filter(
                            models.ToolConnection.business_id == business_id,
                            models.ToolConnection.tool_name == "gmail"
                        ).first()
                        drive_conn = models.ToolConnection(
                            business_id=business_id,
                            tool_name="google_drive",
                            credentials=gmail_conn.credentials if (gmail_conn and gmail_conn.is_connected) else {"client_id": "sandbox"},
                            is_connected=True,
                            logs=[]
                        )
                    
                    content_bytes = params.get("content_bytes") or b"AI Document Payload."
                    if isinstance(content_bytes, str):
                        content_bytes = content_bytes.encode('utf-8')
                    result = GoogleService.upload_file(db, drive_conn, params.get("filename", "document.txt"), content_bytes, params.get("mime_type", "text/plain"))
                    
                else:
                    raise ValueError(f"Unknown generic action: {action}")

            elif tool_name == "gmail":
                if action == "send":
                    result = GoogleService.send_email(db, conn, params["to_email"], params["subject"], params["body"])
                elif action == "search":
                    result = {"messages": GoogleService.search_emails(db, conn, params.get("query", ""))}
                elif action == "read":
                    result = GoogleService.read_email(db, conn, params["message_id"])
                elif action == "reply":
                    result = GoogleService.reply_to_email(db, conn, params["thread_id"], params["body"])
                elif action == "auto_follow_up":
                    result = GmailWorkflows.auto_follow_up(db, business_id, params.get("days_threshold", 3))
                elif action == "auto_reply":
                    result = GmailWorkflows.auto_reply_new_emails(db, business_id)
                elif action == "daily_summary":
                    result = GmailWorkflows.generate_daily_email_summary(db, business_id)
                elif action == "apply_labels":
                    result = GmailWorkflows.apply_smart_labels(db, business_id)
                elif action == "process_attachment":
                    result = GmailWorkflows.process_email_attachments(db, business_id, params["message_id"])
                elif action == "schedule_send":
                    send_at = datetime.fromisoformat(params["send_at"])
                    result = GmailWorkflows.schedule_email(db, business_id, params["recipient"], params["subject"], params["body"], send_at)
                elif action == "ai_search":
                    result = {"messages": GmailWorkflows.ai_email_search(db, business_id, params["query"])}
                elif action == "detect_meeting":
                    result = {"status": "success"} # handled in calendar
                else:
                    raise ValueError(f"Unknown Gmail action: {action}")

            elif tool_name == "google_calendar":
                if action == "create":
                    result = GoogleService.create_event(db, conn, params["summary"], params.get("description", ""), params["start_iso"], params["end_iso"])
                elif action == "update":
                    result = GoogleService.update_event(db, conn, params["event_id"], params["summary"], params.get("description", ""), params["start_iso"], params["end_iso"])
                elif action == "delete":
                    result = GoogleService.delete_event(db, conn, params["event_id"])
                elif action == "list":
                    result = {"events": GoogleService.list_upcoming_events(db, conn, params.get("limit", 5))}
                else:
                    raise ValueError(f"Unknown Google Calendar action: {action}")

            elif tool_name == "google_drive":
                if action == "upload":
                    content_bytes = params["content_bytes"]
                    if isinstance(content_bytes, str):
                        content_bytes = content_bytes.encode('utf-8')
                    result = GoogleService.upload_file(db, conn, params["filename"], content_bytes, params.get("mime_type", "application/pdf"))
                elif action == "search":
                    result = {"files": GoogleService.search_documents(db, conn, params.get("query", ""))}
                else:
                    raise ValueError(f"Unknown Google Drive action: {action}")

            elif tool_name == "google_sheets":
                if action == "read":
                    result = {"values": GoogleService.read_spreadsheet(db, conn, params["spreadsheet_id"], params["range_name"])}
                elif action == "append":
                    result = GoogleService.append_spreadsheet_row(db, conn, params["spreadsheet_id"], params["range_name"], params["row"])
                elif action == "update":
                    result = GoogleService.update_spreadsheet_row(db, conn, params["spreadsheet_id"], params["range_name"], params["row"])
                else:
                    raise ValueError(f"Unknown Google Sheets action: {action}")

            elif tool_name == "whatsapp":
                if action in ["send", "send_whatsapp"]:
                    result = WhatsAppService.send_message(conn, params["to_number"], params["message"])
                elif action == "send_template":
                    result = WhatsAppService.send_template(conn, params["to_number"], params["template_name"], params.get("language", "en_US"))
                elif action == "receive_webhook":
                    result = {"status": "webhook-received", "payload": params}
                else:
                    raise ValueError(f"Unknown WhatsApp action: {action}")

            elif tool_name == "slack":
                if action in ["post", "send_slack_message", "notify_team"]:
                    result = SlackService.post_message(conn, params["message"], params.get("channel"))
                elif action == "read_channels":
                    result = {"channels": SlackService.read_channels(conn)}
                elif action == "create_channel":
                    result = {"status": "success", "channel_id": "C-SLACK-MOCK", "name": params.get("name", "billing")}
                else:
                    raise ValueError(f"Unknown Slack action: {action}")

            elif tool_name == "shopify":
                if action == "read_orders":
                    result = {"orders": ShopifyService.read_orders(conn, params.get("limit", 10))}
                elif action == "update_order":
                    result = ShopifyService.update_order(conn, params["order_id"], params["payload"])
                elif action == "update_inventory":
                    result = ShopifyService.update_inventory(conn, params["inventory_item_id"], params["location_id"], params["quantity"])
                else:
                    raise ValueError(f"Unknown Shopify action: {action}")

            elif tool_name == "hubspot":
                if action == "read_contacts":
                    result = {"contacts": HubSpotService.read_contacts(conn, params.get("limit", 10))}
                elif action in ["create_lead", "create_contact"]:
                    result = HubSpotService.create_lead(conn, params["email"], params.get("firstname", "Unknown"), params.get("lastname", "Customer"))
                elif action in ["update_deal", "update_contact"]:
                    result = HubSpotService.update_deal(conn, params.get("deal_id", "DEAL-MOCK"), params.get("stage", "closed-won"))
                elif action == "create_deal":
                    result = HubSpotService.update_deal(conn, params.get("deal_id", "DEAL-MOCK"), params.get("stage", "appointmentscheduled"))
                elif action == "search_customer":
                    result = {"contacts": HubSpotService.read_contacts(conn, params.get("limit", 10))}
                else:
                    raise ValueError(f"Unknown HubSpot action: {action}")

            elif tool_name == "supabase":
                if action == "upload":
                    content_bytes = params["content_bytes"]
                    if isinstance(content_bytes, str):
                        content_bytes = content_bytes.encode('utf-8')
                    result = SupabaseService.upload_file(conn, params["path"], content_bytes, params.get("content_type", "application/pdf"))
                else:
                    raise ValueError(f"Unknown Supabase Storage action: {action}")

            else:
                raise ValueError(f"Unsupported GaaS tool integration: {tool_name}")

            # Update stats
            conn.last_sync = datetime.utcnow()
            conn.is_connected = True
            
            # Avoid duplicate refresh logs if already appended inside GoogleService
            if len(conn.logs) == logs_count_before:
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Action '{action}' executed successfully.",
                    "type": "info"
                })
                conn.logs = logs

            db.commit()
            return {"status": "success", "result": result}

        except Exception as e:
            logger.error(f"ToolEngine action '{action}' failure: {str(e)}")
            logs.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "message": f"Action '{action}' execution failed: {str(e)}",
                "type": "error"
            })
            conn.logs = logs
            db.commit()
            return {"status": "error", "detail": str(e)}
