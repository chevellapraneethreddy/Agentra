import logging
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models import models
from app.services.integrations.google_service import GoogleService
from app.services.integrations.gmail_workflows import GmailWorkflows
from app.services.integrations.ai_decision_layer import AIDecisionLayer, get_gemini_client

logger = logging.getLogger("agentra")

class WorkflowEngine:
    """
    Production-grade AI Email Automation Engine.
    Orchestrates triggers, evaluates conditions using Gemini, and executes actions.
    Serves as the shared runtime for all AI Employees.
    """

    @staticmethod
    def get_or_create_connection(db: Session, business_id: str, tool_name: str) -> Optional[models.ToolConnection]:
        """Helper to get connected tool connection."""
        return db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == tool_name
        ).first()

    @staticmethod
    def seed_default_workflows(db: Session, business_id: str):
        """Pre-seeds the 5 required automation workflows if they don't exist yet."""
        existing = db.query(models.Workflow).filter(models.Workflow.business_id == business_id).count()
        if existing > 0:
            return

        defaults = [
            {
                "name": "Workflow 1: New Lead Follow-up",
                "trigger_type": "new_email",
                "conditions": {"keywords": ["pricing", "demo", "quote", "interested"]},
                "steps": [
                    {"action": "ai_classify_lead", "args": {}},
                    {"action": "send_initial_reply", "args": {}},
                    {"action": "wait", "args": {"days": 3}},
                    {"action": "send_followup_1", "args": {}},
                    {"action": "wait", "args": {"days": 7}},
                    {"action": "send_followup_2", "args": {}}
                ]
            },
            {
                "name": "Workflow 2: Invoice Reminder",
                "trigger_type": "invoice_generated",
                "conditions": {},
                "steps": [
                    {"action": "email_invoice", "args": {}},
                    {"action": "wait", "args": {"days": 7}},
                    {"action": "check_payment_status", "args": {}},
                    {"action": "send_reminder_1", "args": {}},
                    {"action": "wait", "args": {"days": 7}},
                    {"action": "send_reminder_2", "args": {}}
                ]
            },
            {
                "name": "Workflow 3: Meeting Scheduler",
                "trigger_type": "new_email",
                "conditions": {"ai_detect": "meeting"},
                "steps": [
                    {"action": "ai_parse_meeting", "args": {}},
                    {"action": "find_free_slot", "args": {}},
                    {"action": "create_meeting", "args": {}},
                    {"action": "send_calendar_invite", "args": {}}
                ]
            },
            {
                "name": "Workflow 4: Customer Support Routing",
                "trigger_type": "new_email",
                "conditions": {"ai_detect": "support"},
                "steps": [
                    {"action": "ai_classify_issue", "args": {}},
                    {"action": "route_support_issue", "args": {}}
                ]
            },
            {
                "name": "Workflow 5: Daily Summary",
                "trigger_type": "schedule_8am",
                "conditions": {},
                "steps": [
                    {"action": "generate_summary", "args": {}},
                    {"action": "email_summary_to_owner", "args": {}}
                ]
            }
        ]

        for d in defaults:
            wf = models.Workflow(
                business_id=business_id,
                name=d["name"],
                trigger_type=d["trigger_type"],
                conditions=d["conditions"],
                steps=d["steps"],
                is_active=True
            )
            db.add(wf)
        db.commit()

    @staticmethod
    def run_workflow_event(db: Session, business_id: str, trigger_type: str, payload: Dict[str, Any]):
        """Evaluates triggers and executes matching active workflows."""
        # Auto-seed defaults if empty
        WorkflowEngine.seed_default_workflows(db, business_id)

        workflows = db.query(models.Workflow).filter(
            models.Workflow.business_id == business_id,
            models.Workflow.trigger_type == trigger_type,
            models.Workflow.is_active == True
        ).all()

        for wf in workflows:
            # Evaluate basic string conditions
            if trigger_type == "new_email":
                body = payload.get("body", "").lower()
                subject = payload.get("subject", "").lower()
                keywords = wf.conditions.get("keywords", [])
                
                # Check keywords match
                match = True
                if keywords:
                    match = any(kw in body or kw in subject for kw in keywords)

                # Check AI classification match
                ai_detect = wf.conditions.get("ai_detect")
                if ai_detect:
                    ai_analysis = AIDecisionLayer.classify_and_analyze_email(payload.get("subject", ""), payload.get("body", ""))
                    if ai_detect == "meeting" and not ai_analysis.get("is_meeting_request"):
                        match = False
                    if ai_detect == "support" and not ai_analysis.get("category") == "Support":
                        match = False

                if not match:
                    continue

            # Spawn execution history instance
            history = models.WorkflowHistory(
                workflow_id=wf.id,
                business_id=business_id,
                trigger_source=trigger_type,
                input_payload={"payload": payload, "current_step": 0},
                ai_decision={},
                actions_performed=[],
                status="running",
                retries=0,
                execution_time=datetime.utcnow()
            )
            db.add(history)
            db.commit()
            db.refresh(history)

            # Start execution loop
            WorkflowEngine.execute_loop(db, wf, history)

    @staticmethod
    def execute_loop(db: Session, wf: models.Workflow, history: models.WorkflowHistory):
        """
        Autonomous ReAct Loop Engine.
        Dynamically chooses tools to run, observes execution outcomes, and retry/scales fallbacks.
        """
        from app.services.integrations.integration_manager import IntegrationManager
        from app.services.integrations.ai_decision_layer import get_gemini_client
        
        business_id = wf.business_id
        payload = history.input_payload.get("payload", {})
        current_step = history.input_payload.get("current_step", 0)
        actions = list(history.actions_performed)

        # Get connected tools list
        connections = db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.is_connected == True
        ).all()
        connected_tools = [c.tool_name for c in connections]
        if "gmail" in connected_tools:
            # Shared google services automatically enabled
            connected_tools.extend(["google_calendar", "google_drive", "google_sheets"])
        connected_tools = list(set(connected_tools))

        client = get_gemini_client()
        max_iterations = 5
        iteration = 0

        # Construct previous run history for ReAct loop
        run_history = []
        for act in actions:
            run_history.append(f"Thought/Action: {act.get('type')} - Message: {act.get('message')}")

        try:
            while iteration < max_iterations:
                iteration += 1
                history_str = "\n".join(run_history) if run_history else "No actions executed yet."
                
                # Default fallback action in case AI fails or mock mode is on
                default_action = {
                    "thought": "Evaluate the next step in the workflow sequential instructions.",
                    "action": "terminate",
                    "args": {}
                }
                
                # Check if we should execute hardcoded step if Gemini is unavailable
                if current_step < len(wf.steps):
                    next_step = wf.steps[current_step]
                    default_action["action"] = next_step["action"]
                    default_action["args"] = next_step.get("args", {})

                if not client:
                    # Deterministic fallback mode
                    decision = default_action
                else:
                    # Run ReAct prompt
                    prompt = (
                        f"You are the autonomous AI workflow coordinator executing workflow '{wf.name}' for business workspace '{business_id}'.\n"
                        f"Your goal is to complete the business objective using available integrations.\n\n"
                        f"Trigger payload details:\n{json.dumps(payload, indent=2)}\n\n"
                        f"Available integrations connected in this workspace: {connected_tools}\n\n"
                        f"Logs of executed actions and observations so far:\n{history_str}\n\n"
                        f"Decide the next action to execute. Return strictly valid JSON format matching this schema:\n"
                        f"{{\n"
                        f"  \"thought\": \"Brief explanation of your reasoning based on observations.\",\n"
                        f"  \"action\": \"send_email\" | \"reply_email\" | \"create_calendar_event\" | \"send_whatsapp\" | \"update_crm\" | \"upload_drive\" | \"append_sheet\" | \"notify_slack\" | \"create_task\" | \"wait\" | \"terminate\",\n"
                        f"  \"args\": {{ ... }}\n"
                        f"}}"
                    )
                    try:
                        res = client.models.generate_content(
                            model='gemini-2.5-pro',
                            contents=prompt
                        )
                        clean_json = res.text.strip()
                        if "```json" in clean_json:
                            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                        elif "```" in clean_json:
                            clean_json = clean_json.split("```")[1].split("```")[0].strip()
                        decision = json.loads(clean_json)
                    except Exception as ai_err:
                        logger.error(f"Workflow ReAct loop AI reasoning error: {str(ai_err)}. Falling back.")
                        decision = default_action

                action = decision.get("action", "terminate")
                args = decision.get("args", {})
                thought = decision.get("thought", "")

                logger.info(f"WorkflowEngine: ReAct Loop Thought: {thought}")
                logger.info(f"WorkflowEngine: ReAct Loop Action: {action} with args: {args}")

                # 1. Action: Terminate
                if action == "terminate":
                    actions.append({"step": current_step, "type": "terminate", "message": "Objective completed successfully."})
                    break

                # 2. Action: Wait
                elif action == "wait":
                    days = args.get("days", 1)
                    resume_at = datetime.utcnow() + timedelta(days=days)
                    history.status = "waiting"
                    history.input_payload = {
                        "payload": payload,
                        "current_step": current_step,
                        "resume_at": resume_at.isoformat()
                    }
                    history.actions_performed = actions
                    db.commit()
                    return

                # 3. Action execution block
                else:
                    # Map action to connection
                    import json
                    tool_map = {
                        "send_email": ("gmail", "send", {"to_email": args.get("to_email") or payload.get("sender") or "client@billing.com", "subject": args.get("subject", "AI Alert"), "body": args.get("body", "")}),
                        "reply_email": ("gmail", "reply", {"thread_id": args.get("thread_id") or payload.get("thread_id"), "body": args.get("body", "")}),
                        "create_calendar_event": ("google_calendar", "create", {"summary": args.get("summary", "AI Event"), "description": args.get("description", ""), "start_iso": args.get("start_iso"), "end_iso": args.get("end_iso")}),
                        "send_whatsapp": ("whatsapp", "send", {"to_number": args.get("to_number") or payload.get("sender") or "+15555550100", "message": args.get("message") or args.get("body", "")}),
                        "update_crm": ("hubspot", "update_deal", {"deal_id": args.get("deal_id", "DEAL-MOCK"), "stage": args.get("stage", "closed-won")}),
                        "upload_drive": ("google_drive", "upload", {"filename": args.get("filename", "document.txt"), "content_bytes": args.get("content_bytes") or b"AI document content.", "mime_type": args.get("mime_type", "text/plain")}),
                        "append_sheet": ("google_sheets", "append", {"spreadsheet_id": args.get("spreadsheet_id", "my-sheet-id"), "range_name": args.get("range_name", "Sheet1!A1"), "row": args.get("row", [])}),
                        "notify_slack": ("slack", "post", {"message": args.get("message") or args.get("body", ""), "channel": args.get("channel")}),
                    }

                    if action not in tool_map and action != "create_task":
                        # Unknown action fallback observation
                        run_history.append(f"Observation: Unknown action '{action}' chosen.")
                        continue

                    exec_success = False
                    error_detail = ""

                    if action == "create_task":
                        try:
                            # Create local database task
                            task = models.Task(
                                business_id=business_id,
                                title=args.get("title", "AI Workflow Task Request"),
                                status="pending"
                            )
                            db.add(task)
                            db.commit()
                            exec_success = True
                            action_msg = f"Created task: '{task.title}'."
                        except Exception as task_err:
                            error_detail = str(task_err)
                    else:
                        t_name, t_action, t_params = tool_map[action]
                        # Fetch connection record
                        conn = db.query(models.ToolConnection).filter(
                            models.ToolConnection.business_id == business_id,
                            models.ToolConnection.tool_name == t_name
                        ).first()

                        if not conn:
                            # Fallback dummy connection mapping
                            conn = models.ToolConnection(
                                business_id=business_id,
                                tool_name=t_name,
                                credentials={"client_id": "sandbox"},
                                is_connected=True,
                                logs=[]
                            )
                            db.add(conn)
                            db.flush()

                        # Run execution call using IntegrationManager wrapper (implements auto-retries!)
                        res = IntegrationManager.execute(db, conn, t_action, t_params)
                        if res.get("status") == "success":
                            exec_success = True
                            action_msg = f"Executed integration '{t_name}' / '{t_action}' successfully."
                        else:
                            error_detail = res.get("detail", "Unknown connection failure.")

                    if exec_success:
                        # Write activity to database timeline
                        act = models.Activity(
                            business_id=business_id,
                            message=f"AI Workflow '{wf.name}': {action_msg}",
                            type="action",
                            created_at=datetime.utcnow()
                        )
                        db.add(act)
                        db.commit()

                        # Append successful run step
                        actions.append({"step": current_step, "type": action, "message": action_msg})
                        run_history.append(f"Observation: Action '{action}' succeeded. Outcome: {action_msg}")
                    else:
                        # Escalation check: if error occurs, try fallback strategy or escalate
                        logger.warning(f"WorkflowEngine: Action '{action}' execution failed: {error_detail}")
                        
                        # Trigger escalation notifications
                        notif = models.Notification(
                            business_id=business_id,
                            title=f"Workflow Escalation: {wf.name}",
                            message=f"Action '{action}' failed: {error_detail}. Human review escalated.",
                            read=False
                        )
                        db.add(notif)
                        
                        act = models.Activity(
                            business_id=business_id,
                            message=f"AI Workflow '{wf.name}' Escalation: Action '{action}' failed: {error_detail}",
                            type="warning",
                            created_at=datetime.utcnow()
                        )
                        db.add(act)
                        db.commit()

                        actions.append({"step": current_step, "type": f"{action}_failed", "message": f"Action failed: {error_detail}. Escalated."})
                        run_history.append(f"Observation: Action '{action}' failed with error: {error_detail}. Local escalation notification sent.")

                current_step += 1

            # Save execution logs
            history.status = "success"
            history.actions_performed = actions
            history.input_payload = {"payload": payload, "current_step": current_step}
            db.commit()

        except Exception as e:
            logger.error(f"WorkflowEngine ReAct run error: {str(e)}")
            history.status = "failed"
            history.errors = str(e)
            history.actions_performed = actions
            db.commit()

    @staticmethod
    def process_waiting_workflows(db: Session):
        """Resumes active workflows paused on 'wait' steps."""
        now = datetime.utcnow()
        waiting = db.query(models.WorkflowHistory).filter(models.WorkflowHistory.status == "waiting").all()

        for hist in waiting:
            resume_at_str = hist.input_payload.get("resume_at")
            if resume_at_str:
                resume_time = datetime.fromisoformat(resume_at_str)
                if resume_time <= now:
                    # Retrieve parent workflow
                    wf = db.query(models.Workflow).filter(models.Workflow.id == hist.workflow_id).first()
                    if wf and wf.is_active:
                        hist.status = "running"
                        db.commit()
                        WorkflowEngine.execute_loop(db, wf, hist)
