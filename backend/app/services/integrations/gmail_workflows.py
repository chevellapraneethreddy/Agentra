import os
import json
import logging
import base64
import httpx
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from google import genai
from google.genai.types import Part

from app.models import models
from app.services.integrations.google_service import GoogleService

logger = logging.getLogger("agentra")

def get_gemini_client() -> Optional[genai.Client]:
    """Retrieves safe Gemini AI client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. AI capabilities will run in dry-run/mock mode.")
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini genai.Client: {str(e)}")
        return None

class GmailWorkflows:
    """
    Advanced AI Workflows extending Gmail integrations.
    Exposes programmatic methods to operations/support agents.
    """

    @staticmethod
    def auto_follow_up(db: Session, business_id: str, days_threshold: int = 3) -> Dict[str, Any]:
        """
        1. Auto Follow-up:
        Scans sent emails; if no response from recipient after X days, sends an AI-generated follow-up.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return {"status": "error", "message": "Gmail not connected"}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "processed_count": 0, "message": "Sandbox mode follow-ups bypassed"}

        try:
            # Query sent messages
            sent_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:sent"
            res = GoogleService.make_request(db, conn, "GET", sent_url)
            if res.status_code != 200:
                raise ValueError(f"Gmail fetch sent messages failed: {res.text}")

            messages = res.json().get("messages", [])
            processed = 0
            follow_ups_sent = []

            for msg in messages[:5]:
                thread_id = msg.get("threadId")
                
                th_url = f"https://gmail.googleapis.com/gmail/v1/users/me/threads/{thread_id}"
                th_res = GoogleService.make_request(db, conn, "GET", th_url)
                if th_res.status_code != 200:
                    continue

                thread_data = th_res.json()
                thread_msgs = thread_data.get("messages", [])
                if not thread_msgs:
                    continue

                last_msg = thread_msgs[-1]
                
                headers = {h["name"].lower(): h["value"] for h in last_msg.get("payload", {}).get("headers", [])}
                from_header = headers.get("from", "")
                
                internal_date_ms = int(last_msg.get("internalDate", 0))
                last_sent_time = datetime.utcfromtimestamp(internal_date_ms / 1000.0)
                
                if "me" in from_header.lower() or "@" in from_header:
                    elapsed = datetime.utcnow() - last_sent_time
                    if elapsed > timedelta(days=days_threshold):
                        subject = headers.get("subject", "Follow up")
                        snippet = last_msg.get("snippet", "")
                        to_email = headers.get("to", "")

                        client = get_gemini_client()
                        follow_up_body = (
                            "Hello,\n\n"
                            "I'm following up on my previous message. Let me know if you need anything else.\n\n"
                            "Regards,\n"
                            "Agentra AI Workforce"
                        )
                        if client:
                            prompt = (
                                f"Generate a polite, concise, professional email follow-up. "
                                f"Original Subject: {subject}. Snippet of last message: {snippet}. "
                                f"Goal: Politely ask for a response or update."
                            )
                            try:
                                resp = client.models.generate_content(
                                    model='gemini-2.5-pro',
                                    contents=prompt
                                )
                                follow_up_body = resp.text.strip()
                            except Exception as ai_err:
                                logger.error(f"Gemini follow-up generation failed: {str(ai_err)}")

                        GoogleService.send_email(db, conn, to_email, f"Follow-up: {subject}", follow_up_body)
                        processed += 1
                        follow_ups_sent.append({"recipient": to_email, "subject": f"Follow-up: {subject}"})

            return {"status": "success", "processed_count": processed, "follow_ups": follow_ups_sent}
        except Exception as e:
            logger.error(f"Auto follow-up workflow failure: {str(e)}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def auto_reply_new_emails(db: Session, business_id: str) -> Dict[str, Any]:
        """
        2. AI Auto Reply:
        Reads unread emails, classifies them, generates a reply using Gemini, 
        and either sends it back or saves it as a draft depending on confidence score.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return {"status": "error", "message": "Gmail not connected"}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "replies": [], "drafts": [], "message": "Sandbox mode auto-replies bypassed"}

        try:
            unread_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread"
            res = GoogleService.make_request(db, conn, "GET", unread_url)
            if res.status_code != 200:
                raise ValueError(f"Gmail fetch unread failed: {res.text}")

            messages = res.json().get("messages", [])
            replies_sent = []
            drafts_created = []

            for msg in messages[:3]:
                msg_id = msg.get("id")
                
                details_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}"
                det_res = GoogleService.make_request(db, conn, "GET", details_url)
                if det_res.status_code != 200:
                    continue

                msg_data = det_res.json()
                headers = {h["name"].lower(): h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
                subject = headers.get("subject", "No Subject")
                sender = headers.get("from", "")
                body_snippet = msg_data.get("snippet", "")

                client = get_gemini_client()
                if not client:
                    continue

                prompt = (
                    f"You are an AI Email auto-reply bot. Analyze this incoming email:\n"
                    f"Sender: {sender}\nSubject: {subject}\nSnippet: {body_snippet}\n\n"
                    f"Tasks:\n"
                    f"1. Classify Category (Sales, Support, Finance, HR, Other)\n"
                    f"2. Urgency level (Urgent, Normal)\n"
                    f"3. Generate response draft\n"
                    f"4. Assess your reply confidence from 0.0 to 1.0 (set higher if standard inquiry, lower if ambiguous)\n\n"
                    f"Format output STRICTLY as a JSON object:\n"
                    f"{{\n"
                    f"  \"category\": \"Sales\" | \"Support\" | \"Finance\" | \"HR\",\n"
                    f"  \"urgency\": \"Urgent\" | \"Normal\",\n"
                    f"  \"reply_body\": \"Write the complete email body reply here...\",\n"
                    f"  \"confidence\": 0.90\n"
                    f"}}"
                )

                try:
                    ai_res = client.models.generate_content(
                        model='gemini-2.5-pro',
                        contents=prompt
                    )
                    clean_json = ai_res.text.strip()
                    if "```json" in clean_json:
                        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                    elif "```" in clean_json:
                        clean_json = clean_json.split("```")[1].split("```")[0].strip()

                    decision = json.loads(clean_json)
                    reply_body = decision.get("reply_body", "")
                    confidence = decision.get("confidence", 0.0)
                    category = decision.get("category", "Other")

                    if confidence >= 0.85:
                        GoogleService.send_email(db, conn, sender, f"Re: {subject}", reply_body)
                        replies_sent.append({"to": sender, "subject": f"Re: {subject}", "category": category})
                    else:
                        import base64
                        from email.mime.text import MIMEText
                        draft_msg = MIMEText(reply_body)
                        draft_msg["to"] = sender
                        draft_msg["subject"] = f"Re: [Draft] {subject}"
                        raw_draft = base64.urlsafe_b64encode(draft_msg.as_bytes()).decode("utf-8").rstrip("=")
                        
                        draft_url = "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
                        GoogleService.make_request(
                            db, conn, "POST", draft_url, 
                            json={"message": {"raw": raw_draft}}
                        )
                        drafts_created.append({"to": sender, "subject": f"Re: [Draft] {subject}", "category": category})

                    modify_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}/modify"
                    GoogleService.make_request(
                        db, conn, "POST", modify_url,
                        json={"removeLabelIds": ["UNREAD"]}
                    )
                except Exception as inner_e:
                    logger.error(f"Failed to process auto-reply decision: {str(inner_e)}")

            if replies_sent or drafts_created:
                act = models.Activity(
                    business_id=business_id,
                    message=f"Gmail AI Auto-Reply: Sent {len(replies_sent)} replies, created {len(drafts_created)} drafts.",
                    type="info"
                )
                db.add(act)
                db.commit()

            return {"status": "success", "replies_sent": replies_sent, "drafts_created": drafts_created}
        except Exception as e:
            logger.error(f"AI Auto-Reply workflow failure: {str(e)}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def generate_daily_email_summary(db: Session, business_id: str) -> Dict[str, Any]:
        """
        3. Daily Email Summary:
        Summarizes unread emails, highlights urgent messages, and extracts action items.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return {"summary": "Gmail is not connected.", "urgent_messages": [], "action_items": []}

        if conn.credentials.get("client_id") == "sandbox":
            return {
                "summary": "Everything is quiet in Sandbox workspace today.",
                "urgent_messages": [],
                "action_items": ["Review virtual orders queue"]
            }

        try:
            unread_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread"
            res = GoogleService.make_request(db, conn, "GET", unread_url)
            if res.status_code != 200:
                raise ValueError(f"Gmail query unread failed: {res.text}")

            messages = res.json().get("messages", [])
            email_data_list = []

            for msg in messages[:10]:
                msg_id = msg.get("id")
                det_res = GoogleService.make_request(
                    db, conn, "GET", 
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}"
                )
                if det_res.status_code == 200:
                    d = det_res.json()
                    headers = {h["name"].lower(): h["value"] for h in d.get("payload", {}).get("headers", [])}
                    email_data_list.append({
                        "id": msg_id,
                        "subject": headers.get("subject", "No Subject"),
                        "sender": headers.get("from", ""),
                        "snippet": d.get("snippet", "")
                    })

            if not email_data_list:
                return {"summary": "You have no unread emails.", "urgent_messages": [], "action_items": []}

            client = get_gemini_client()
            if not client:
                return {
                    "summary": f"You have {len(email_data_list)} unread emails.",
                    "urgent_messages": [],
                    "action_items": [f"Manually read unread message subjects: {e['subject']}" for e in email_data_list]
                }

            prompt = (
                f"Summarize the following list of unread business emails:\n"
                f"{json.dumps(email_data_list)}\n\n"
                f"Highlight urgent messages and extract actionable items.\n"
                f"Output strictly in JSON format:\n"
                f"{{\n"
                f"  \"summary\": \"Overall email summary...\",\n"
                f"  \"urgent_messages\": [\n"
                f"    {{\"id\": \"msg_id\", \"sender\": \"...\", \"subject\": \"...\", \"reason\": \"Urgency explanation\"}}\n"
                f"  ],\n"
                f"  \"action_items\": [\"Action 1\", \"Action 2\"]\n"
                f"}}"
            )

            ai_res = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt
            )
            clean_json = ai_res.text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            return json.loads(clean_json)
        except Exception as e:
            logger.error(f"Email summary generation failed: {str(e)}")
            return {"summary": f"Summary failed: {str(e)}", "urgent_messages": [], "action_items": []}

    @staticmethod
    def apply_smart_labels(db: Session, business_id: str) -> Dict[str, Any]:
        """
        4. Smart Labels:
        Classifies unread emails and automatically applies labels: Sales, Support, Finance, HR, Urgent.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return {"status": "error", "message": "Gmail not connected"}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "message": "Sandbox labeling bypassed"}

        try:
            unread_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread"
            res = GoogleService.make_request(db, conn, "GET", unread_url)
            if res.status_code != 200:
                raise ValueError("Gmail query failed")

            messages = res.json().get("messages", [])
            labeled_count = 0

            labels_res = GoogleService.make_request(db, conn, "GET", "https://gmail.googleapis.com/gmail/v1/users/me/labels")
            existing_labels = {l["name"].lower(): l["id"] for l in labels_res.json().get("labels", [])}

            def get_or_create_label(label_name: str) -> str:
                name_lower = label_name.lower()
                if name_lower in existing_labels:
                    return existing_labels[name_lower]
                
                create_url = "https://gmail.googleapis.com/gmail/v1/users/me/labels"
                payload = {
                    "name": label_name,
                    "labelListVisibility": "labelShow",
                    "messageListVisibility": "show"
                }
                c_res = GoogleService.make_request(db, conn, "POST", create_url, json=payload)
                if c_res.status_code in [200, 201]:
                    new_label = c_res.json()
                    existing_labels[name_lower] = new_label["id"]
                    return new_label["id"]
                return ""

            client = get_gemini_client()
            if not client:
                return {"status": "error", "message": "Gemini not configured"}

            for msg in messages[:5]:
                msg_id = msg.get("id")
                det_res = GoogleService.make_request(
                    db, conn, "GET", 
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}"
                )
                if det_res.status_code != 200:
                    continue

                d = det_res.json()
                headers = {h["name"].lower(): h["value"] for h in d.get("payload", {}).get("headers", [])}
                subject = headers.get("subject", "No Subject")
                snippet = d.get("snippet", "")

                prompt = (
                    f"Classify this email into one of these business categories: Sales, Support, Finance, HR, Urgent.\n"
                    f"Subject: {subject}\n"
                    f"Snippet: {snippet}\n\n"
                    f"Output only the best matching category name (single word)."
                )

                ai_res = client.models.generate_content(
                    model='gemini-2.5-pro',
                    contents=prompt
                )
                category = ai_res.text.strip().capitalize()
                
                if category in ["Sales", "Support", "Finance", "HR", "Urgent"]:
                    label_id = get_or_create_label(category)
                    if label_id:
                        modify_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}/modify"
                        GoogleService.make_request(
                            db, conn, "POST", modify_url,
                            json={"addLabelIds": [label_id]}
                        )
                        labeled_count += 1

            return {"status": "success", "labeled_messages": labeled_count}
        except Exception as e:
            logger.error(f"Smart labeling failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def process_email_attachments(db: Session, business_id: str, message_id: str) -> Dict[str, Any]:
        """
        5. Attachment Intelligence:
        Downloads and processes PDF/DOCX/image email attachments, extracting key details via Gemini.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return {"status": "error", "message": "Gmail not connected"}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "extracted_metadata": {"invoice_total": "$250.00", "vendor": "Sandbox supplier"}}

        try:
            msg_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
            res = GoogleService.make_request(db, conn, "GET", msg_url)
            if res.status_code != 200:
                raise ValueError("Fetch email failed")

            msg_data = res.json()
            parts = msg_data.get("payload", {}).get("parts", [])
            extracted_list = []

            for part in parts:
                filename = part.get("filename")
                mime_type = part.get("mimeType", "")
                body = part.get("body", {})
                attachment_id = body.get("attachmentId")

                if filename and attachment_id:
                    att_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{attachment_id}"
                    att_res = GoogleService.make_request(db, conn, "GET", att_url)
                    if att_res.status_code != 200:
                        continue

                    raw_data = att_res.json().get("data", "")
                    file_bytes = base64.urlsafe_b64decode(raw_data)
                    
                    client = get_gemini_client()
                    if not client:
                        continue

                    if "image/" in mime_type:
                        try:
                            prompt = "Analyze this business attachment and extract key invoice/payment/receipt values."
                            image_part = Part.from_bytes(data=file_bytes, mime_type=mime_type)
                            ai_res = client.models.generate_content(
                                model='gemini-2.5-pro',
                                contents=[prompt, image_part]
                            )
                            extracted_list.append({"filename": filename, "extracted_text": ai_res.text.strip()})
                        except Exception as img_err:
                            logger.error(f"Gemini image parse error: {str(img_err)}")
                    else:
                        snippet = file_bytes[:1000].decode("utf-8", errors="ignore")
                        prompt = f"Analyze this business file snippet. Name: {filename}. Snippet:\n{snippet}\nExtract key data."
                        ai_res = client.models.generate_content(
                            model='gemini-2.5-pro',
                            contents=prompt
                        )
                        extracted_list.append({"filename": filename, "extracted_text": ai_res.text.strip()})

            if extracted_list:
                act = models.Activity(
                    business_id=business_id,
                    message=f"Attachment Intelligence: Parsed {len(extracted_list)} attachments for Gmail message {message_id}.",
                    type="info"
                )
                db.add(act)
                db.commit()

            return {"status": "success", "attachments_processed": extracted_list}
        except Exception as e:
            logger.error(f"Attachment parsing failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def schedule_email(db: Session, business_id: str, recipient: str, subject: str, body: str, send_at: datetime) -> Dict[str, Any]:
        """
        6. Email Scheduling:
        Stores a scheduled email request to be processed by background queues.
        """
        try:
            sch = models.ScheduledEmail(
                business_id=business_id,
                recipient=recipient,
                subject=subject,
                body=body,
                send_at=send_at,
                status="pending"
            )
            db.add(sch)
            db.commit()

            conn = db.query(models.ToolConnection).filter(
                models.ToolConnection.business_id == business_id,
                models.ToolConnection.tool_name == "gmail"
            ).first()
            if conn:
                logs = list(conn.logs)
                logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": f"Email scheduled to {recipient} on {send_at.isoformat()}.",
                    "type": "info"
                })
                conn.logs = logs
                db.commit()

            return {"status": "success", "id": sch.id, "send_at": send_at.isoformat()}
        except Exception as e:
            logger.error(f"Email scheduling failure: {str(e)}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def process_scheduled_emails(db: Session) -> int:
        """
        Daemon task that checks pending scheduled emails and sends them.
        """
        now = datetime.utcnow()
        pending = db.query(models.ScheduledEmail).filter(
            models.ScheduledEmail.status == "pending",
            models.ScheduledEmail.send_at <= now
        ).all()

        sent_count = 0
        for email in pending:
            conn = db.query(models.ToolConnection).filter(
                models.ToolConnection.business_id == email.business_id,
                models.ToolConnection.tool_name == "gmail",
                models.ToolConnection.is_connected == True
            ).first()

            if not conn:
                email.status = "failed"
                db.commit()
                continue

            try:
                GoogleService.send_email(db, conn, email.recipient, email.subject, email.body)
                email.status = "sent"
                sent_count += 1
            except Exception as err:
                logger.error(f"Failed sending scheduled email {email.id}: {str(err)}")
                email.status = "failed"
            
            db.commit()
        return sent_count

    @staticmethod
    def ai_email_search(db: Session, business_id: str, natural_language_query: str) -> List[Dict[str, Any]]:
        """
        7. AI Email Search:
        Translates a natural language search request into a structured Google query format using Gemini.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return []

        if conn.credentials.get("client_id") == "sandbox":
            return [{"id": "sandbox-msg", "snippet": f"Sandbox search results matching: {natural_language_query}"}]

        gmail_query = natural_language_query
        client = get_gemini_client()
        if client:
            prompt = (
                f"You are an AI assistant. Convert this natural language query into a valid Gmail search query search string.\n"
                f"Query: \"{natural_language_query}\"\n"
                f"Current Year: {datetime.now().year}\n\n"
                f"Output only the converted Gmail query string. Example: from:client invoice after:2026/06/01"
            )
            try:
                ai_res = client.models.generate_content(
                    model='gemini-2.5-pro',
                    contents=prompt
                )
                gmail_query = ai_res.text.strip().replace('"', '')
            except Exception as ai_err:
                logger.error(f"Gemini natural language query parse failed: {str(ai_err)}")

        try:
            logger.info(f"AI Email Search: converted query to structure: '{gmail_query}'")
            search_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={urllib.parse.quote(gmail_query)}"
            res = GoogleService.make_request(db, conn, "GET", search_url)
            if res.status_code != 200:
                raise ValueError("Search failed")

            messages = res.json().get("messages", [])
            results = []
            for m in messages[:5]:
                det_res = GoogleService.make_request(db, conn, "GET", f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}")
                if det_res.status_code == 200:
                    d = det_res.json()
                    headers = {h["name"].lower(): h["value"] for h in d.get("payload", {}).get("headers", [])}
                    results.append({
                        "id": m["id"],
                        "subject": headers.get("subject", "No Subject"),
                        "sender": headers.get("from", ""),
                        "snippet": d.get("snippet", "")
                    })
            return results
        except Exception as e:
            logger.error(f"AI search logic error: {str(e)}")
            return []

    @staticmethod
    def detect_meetings_and_schedule(db: Session, business_id: str, message_id: str) -> Dict[str, Any]:
        """
        8. Meeting Detection:
        Extracts meeting request parameters from an email body and registers Google Calendar events automatically.
        """
        conn = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == "gmail"
        ).first()

        if not conn or not conn.is_connected:
            return {"status": "error", "message": "Gmail not connected"}

        if conn.credentials.get("client_id") == "sandbox":
            return {"status": "success", "message": "Sandbox meeting scheduled (Primary calendar)"}

        try:
            msg_res = GoogleService.make_request(db, conn, "GET", f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}")
            if msg_res.status_code != 200:
                raise ValueError("Fetch email failed")

            msg_data = msg_res.json()
            headers = {h["name"].lower(): h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
            subject = headers.get("subject", "")
            snippet = msg_data.get("snippet", "")

            client = get_gemini_client()
            if not client:
                return {"status": "error", "message": "Gemini not configured"}

            prompt = (
                f"Analyze this email snippet to detect if it contains a meeting scheduling request:\n"
                f"Subject: {subject}\n"
                f"Snippet: {snippet}\n"
                f"Current local time: {datetime.now().isoformat()}\n\n"
                f"Output strictly in JSON format:\n"
                f"{{\n"
                f"  \"is_meeting_request\": true | false,\n"
                f"  \"summary\": \"Meeting Title\",\n"
                f"  \"description\": \"Description\",\n"
                f"  \"start_iso\": \"YYYY-MM-DDTHH:MM:SS\",\n"
                f"  \"end_iso\": \"YYYY-MM-DDTHH:MM:SS\"\n"
                f"}}"
            )

            ai_res = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt
            )
            clean_json = ai_res.text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            decision = json.loads(clean_json)
            if not decision.get("is_meeting_request", False):
                return {"status": "success", "meeting_detected": False}

            cal_conn = db.query(models.ToolConnection).filter(
                models.ToolConnection.business_id == business_id,
                models.ToolConnection.tool_name == "google_calendar",
                models.ToolConnection.is_connected == True
            ).first()

            if cal_conn:
                GoogleService.create_event(
                    db, cal_conn,
                    summary=decision["summary"],
                    description=decision.get("description", "Auto-scheduled via Agentra AI Gmail scanner."),
                    start_iso=decision["start_iso"],
                    end_iso=decision["end_iso"]
                )
                
                act = models.Activity(
                    business_id=business_id,
                    message=f"Meeting Detector: Detected request in email. Scheduled calendar event: '{decision['summary']}' at {decision['start_iso']}.",
                    type="info"
                )
                db.add(act)
                db.commit()
                return {"status": "success", "meeting_detected": True, "event": decision["summary"]}
            else:
                return {"status": "success", "meeting_detected": True, "message": "Google Calendar not connected to schedule event."}
        except Exception as e:
            logger.error(f"Meeting scheduler failure: {str(e)}")
            return {"status": "error", "message": str(e)}
