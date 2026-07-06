import logging
import base64
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models import models
from app.services.integrations.google_service import GoogleService
from app.services.integrations.ai_decision_layer import AIDecisionLayer
from app.services.workflow_engine import WorkflowEngine

logger = logging.getLogger("agentra")

class GmailMonitorService:
    """
    Gmail Monitoring Service.
    Automatically polls connected Gmail accounts, processes new unread emails,
    and forwards metadata to the Workflow Engine for autonomous execution.
    """

    @staticmethod
    def poll_unread_emails_for_all_workspaces(db: Session):
        """
        Scans all active Gmail tool connections across all business workspaces,
        queries their unread inbox, and schedules processing for each new email.
        """
        connections = db.query(models.ToolConnection).filter(
            models.ToolConnection.tool_name == "gmail",
            models.ToolConnection.is_connected == True
        ).all()

        logger.info(f"GmailMonitorService: Found {len(connections)} active Gmail connections to monitor.")

        for conn in connections:
            # Sandbox bypass check
            if conn.credentials.get("client_id") == "sandbox":
                logger.info(f"GmailMonitorService: Skipping sandbox monitoring connection for business {conn.business_id[:8]}...")
                continue

            try:
                # Query unread emails for this connection
                unread_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread"
                res = GoogleService.make_request(db, conn, "GET", unread_url)
                if res.status_code != 200:
                    logger.error(f"GmailMonitorService: Failed checking unread emails for business {conn.business_id[:8]}: {res.text}")
                    continue

                messages = res.json().get("messages", [])
                if not messages:
                    continue

                logger.info(f"GmailMonitorService: Found {len(messages)} unread emails for business {conn.business_id[:8]}.")

                # Process each unread email (Limit to latest 3 per poll to prevent timeout constraints)
                for msg in messages[:3]:
                    msg_id = msg.get("id")
                    GmailMonitorService.process_new_email(db, conn, msg_id)

            except Exception as e:
                logger.error(f"GmailMonitorService: Exception occurred during connection poll: {str(e)}")

    @staticmethod
    def process_new_email(db: Session, conn: models.ToolConnection, message_id: str):
        """
        Processes a single new email.
        This can be triggered by either periodic polling or push notifications (Watch API).
        """
        # Check if already processed locally to avoid duplicate executions
        exists = db.query(models.ProcessedEmail).filter(models.ProcessedEmail.id == message_id).first()
        if exists:
            logger.info(f"GmailMonitorService: Email ID {message_id} was already processed locally. Skipping.")
            return

        logger.info(f"GmailMonitorService: Processing email message ID {message_id}...")

        try:
            # 1. Fetch full message details
            url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
            res = GoogleService.make_request(db, conn, "GET", url)
            if res.status_code != 200:
                logger.error(f"GmailMonitorService: Failed to retrieve message detail: {res.text}")
                return

            msg_data = res.json()
            thread_id = msg_data.get("threadId")

            # 2. Extract Headers
            headers = {h["name"].lower(): h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
            sender = headers.get("from", "unknown@sender.com")
            recipient = headers.get("to", "me@gmail.com")
            subject = headers.get("subject", "No Subject")
            body_snippet = msg_data.get("snippet", "")

            # 3. Extract attachments metadata
            attachments = []
            parts = msg_data.get("payload", {}).get("parts", [])
            for part in parts:
                filename = part.get("filename")
                mime_type = part.get("mimeType", "")
                att_body = part.get("body", {})
                att_id = att_body.get("attachmentId")
                if filename and att_id:
                    attachments.append({
                        "filename": filename,
                        "mime_type": mime_type,
                        "attachment_id": att_id
                    })

            # Assemble payload
            payload = {
                "message_id": message_id,
                "thread_id": thread_id,
                "sender": sender,
                "recipient": recipient,
                "subject": subject,
                "body": body_snippet,
                "attachments": attachments
            }

            # 4. Trigger AI classification and workflow execution
            logger.info(f"GmailMonitorService: Triggering workflows for message '{subject}'...")
            WorkflowEngine.run_workflow_event(db, conn.business_id, "new_email", payload)

            # 5. Mark processed emails to avoid duplicate execution
            modify_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify"
            modify_res = GoogleService.make_request(
                db, conn, "POST", modify_url,
                json={"removeLabelIds": ["UNREAD"]}
            )
            if modify_res.status_code == 200:
                logger.info(f"GmailMonitorService: Successfully marked message {message_id} as processed (UNREAD label removed).")
            else:
                logger.warning(f"GmailMonitorService: Failed removing UNREAD label for message {message_id}: {modify_res.text}")

            # Save to processed email locally to prevent duplicate execution
            processed = models.ProcessedEmail(id=message_id, business_id=conn.business_id)
            db.add(processed)
            db.commit()

        except Exception as err:
            logger.error(f"GmailMonitorService: Error processing email ID {message_id}: {str(err)}")
