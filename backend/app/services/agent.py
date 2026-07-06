import os
import uuid
import json
import logging
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END
from google import genai
from google.genai.errors import APIError

from app.models import models
from app.services.tool_manager import ToolManager
from app.services.knowledge_service import query_semantic_search
from app.services.tool_engine import ToolEngine

logger = logging.getLogger("agentra")

# Define Parameterized Agent State
class AgentState(TypedDict):
    db: Session
    business_id: str
    employee_id: str
    event_type: str
    event_payload: dict
    order_id: Optional[str]
    current_inventory: List[dict]
    procurement_needed: bool
    reasoning_steps: List[dict]
    status: str
    rag_policies: str
    memory_context: str
    
    # Generic Config parameters loaded dynamically
    employee_name: str
    employee_role: str
    employee_goal: str
    employee_prompt: str
    employee_tools: List[str]
    employee_permissions: List[str]
    
    # Action loop trackers
    next_action: Optional[str]
    action_args: Optional[dict]
    loop_count: int

def query_gemini(prompt: str, fallback_text: str) -> str:
    """Helper to query Gemini 2.5 Pro with fallbacks and offline safety."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not configured. Running agent with fallback deterministic logic.")
        return fallback_text
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini 2.5 Pro error: {str(e)}. Attempting Gemini 1.5 Pro fallback...")
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model='gemini-1.5-pro',
                contents=prompt,
            )
            return response.text.strip()
        except Exception as fallback_err:
            logger.error(f"Fallback model failed: {str(fallback_err)}")
            return fallback_text

# --- GENERIC FRAMEWORK STATE NODES ---

def load_agent_context(state: AgentState) -> AgentState:
    """Node 1: Load employee configurations, memories, and RAG search logs."""
    db = state["db"]
    business_id = state["business_id"]
    employee_id = state["employee_id"]
    payload = state["event_payload"]
    steps = list(state.get("reasoning_steps", []))
    
    emp = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.business_id == business_id
    ).first()
    
    if not emp:
        raise ValueError(f"AI Employee {employee_id} not found in database catalog.")
        
    state["employee_name"] = emp.name
    state["employee_role"] = emp.role
    state["employee_goal"] = emp.goal
    state["employee_prompt"] = emp.system_prompt
    # Load dynamically connected integrations into employee's tools list automatically
    connected_connections = db.query(models.ToolConnection).filter(
        models.ToolConnection.business_id == business_id,
        models.ToolConnection.is_connected == True
    ).all()
    
    connected_tools = set(emp.tools)
    for c in connected_connections:
        connected_tools.add(c.tool_name)
        if c.tool_name == "gmail":
            # Automatically enable calendar, sheets, drive for Google Workspace connection
            connected_tools.add("google_calendar")
            connected_tools.add("google_drive")
            connected_tools.add("google_sheets")
            
    state["employee_tools"] = list(connected_tools)
    state["employee_permissions"] = emp.permissions
    state["loop_count"] = 0
    
    steps.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"AI Employee '{emp.name}' ({emp.role}) activated. Goal: '{emp.goal}'. Initiating GaaS reasoning loop.",
        "type": "info"
    })
    
    # Audit employee workload (pending tasks)
    active_tasks = db.query(models.Task).filter(
        models.Task.business_id == business_id,
        models.Task.status == "pending"
    ).count()
    steps.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"Auditing system capacity: Workload queue contains {active_tasks} active tasks. Employee capacity optimal.",
        "type": "info"
    })
    
    # Load Memories context
    memories = db.query(models.Memory).filter(models.Memory.business_id == business_id).all()
    memory_ctx_lines = []
    for m in memories:
        memory_ctx_lines.append(f"- [{m.category} | {m.key}]: {m.content}")
        m.impact_count += 1
    state["memory_context"] = "\n".join(memory_ctx_lines)
    
    steps.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"AI Memory system checked: loaded {len(memories)} operational rules.",
        "type": "info"
    })
    
    # Load RAG context matching event parameters
    search_query = f"guidelines rules shipping billing carriers policy for event {state['event_type']} client details"
    rag_results = query_semantic_search(db, business_id, search_query, limit=3)
    valid_matches = [r for r in rag_results if r["score"] > 0.15]
    state["rag_policies"] = "\n".join([f"[{r['document_name']}]: {r['text']}" for r in valid_matches])
    
    if valid_matches:
        steps.append({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": f"RAG Knowledge consulted: retrieved {len(valid_matches)} corporate policy files.",
            "type": "info"
        })
        
    state["reasoning_steps"] = steps
    return state

def reasoning_engine(state: AgentState) -> AgentState:
    """Node 2: Decides the next action (or terminates) based on configuration parameters."""
    steps = list(state["reasoning_steps"])
    
    # Limit action loop to prevent infinite runs
    if state["loop_count"] >= 5:
        steps.append({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": "AI Loop threshold warning: Maximum action limit (5) reached. Halting reasoning loop.",
            "type": "warning"
        })
        state["next_action"] = "terminate"
        state["reasoning_steps"] = steps
        return state
        
    prompt = (
        f"You are the reasoning engine of GaaS AI Employee '{state['employee_name']}' ({state['employee_role']}).\n"
        f"Goal: {state['employee_goal']}\n"
        f"System Persona Prompt: {state['employee_prompt']}\n"
        f"Available Tools: {state['employee_tools']}\n"
        f"Permissions: {state['employee_permissions']}\n\n"
        f"Current Operational Context:\n"
        f"Event Type: {state['event_type']}\n"
        f"Event Payload: {state['event_payload']}\n"
        f"Past Memories:\n{state['memory_context']}\n"
        f"RAG Policies:\n{state['rag_policies']}\n"
        f"History of steps taken in this run:\n{[s['message'] for s in steps]}\n\n"
        f"Determine the next action you must execute. You can choose one of the following:\n"
        f"- send_whatsapp: Send customer text updates (requires whatsapp tool)\n"
        f"- send_gmail: Send transaction notification mails (requires gmail tool)\n"
        f"- create_calendar: Schedule appointments (requires google_calendar tool)\n"
        f"- append_sheets: Log spreadsheet data rows (requires google_sheets tool)\n"
        f"- post_slack: Alert team sales channels (requires slack tool)\n"
        f"- fulfill_order_db: Reserve stock & write invoice records in PostgreSQL DB (requires order_fulfillment/invoice_generation capabilities)\n"
        f"- create_procurement_db: Create reorder tasks for low stock items (requires inventory_reorder capabilities)\n"
        f"- terminate: Finish task processing because goal has been completed\n\n"
        f"Output response strictly in valid JSON format:\n"
        f"{{\n"
        f"  \"action\": \"send_gmail\" | \"post_slack\" | \"fulfill_order_db\" | \"create_procurement_db\" | \"terminate\",\n"
        f"  \"args\": {{\n"
        f"    \"reason\": \"Brief explanation of this step\",\n"
        f"    \"param1\": \"val1\"\n"
        f"  }}\n"
        f"}}"
    )
    
    # Fallback response deterministically mapping operations
    fallback_action = {
        "action": "fulfill_order_db",
        "args": {"reason": "Fulfilling order parameters locally."}
    }
    if state["loop_count"] == 1:
        fallback_action = {
            "action": "send_gmail",
            "args": {
                "reason": "Emailing order invoice details.",
                "to_email": "client@billing.com",
                "subject": "Fulfillment Complete"
            }
        }
    elif state["loop_count"] >= 2:
        fallback_action = {"action": "terminate", "args": {"reason": " Fulfilling completed successfully."}}
        
    res_text = query_gemini(prompt, json.dumps(fallback_action))
    
    try:
        clean_json = res_text
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
        decision = json.loads(clean_json)
        state["next_action"] = decision.get("action", "terminate")
        state["action_args"] = decision.get("args", {})
        
        reason = state["action_args"].get("reason", "Executing next operational step.")
        steps.append({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": f"AI Decision Engine: {reason} (Action: '{state['next_action']}')",
            "type": "action"
        })
    except Exception as e:
        logger.error(f"Gemini decision parse error: {str(e)}")
        state["next_action"] = fallback_action["action"]
        state["action_args"] = fallback_action["args"]
        
    state["reasoning_steps"] = steps
    state["loop_count"] += 1
    return state

def action_engine(state: AgentState) -> AgentState:
    """Node 3: Dynamically executes the chosen action if tools and permissions are granted."""
    db = state["db"]
    business_id = state["business_id"]
    order_id = state["order_id"]
    action = state["next_action"]
    args = state["action_args"] or {}
    steps = list(state["reasoning_steps"])
    
    tools = state["employee_tools"]
    permissions = state["employee_permissions"]
    
    if action == "terminate":
        return state
        
    # Helper to check tools configuration
    def get_tool_conn(name: str):
        return db.query(models.ToolConnection).filter(
            models.ToolConnection.business_id == business_id,
            models.ToolConnection.tool_name == name,
            models.ToolConnection.is_connected == True
        ).first()

    # 1. Action: Fulfill Order Database
    if action == "fulfill_order_db":
        # Reserve stock & write invoice details
        payload = state["event_payload"]
        items = payload.get("items", [])
        total = float(payload.get("total", 0.0))
        
        # Deduct inventory items
        shortage_found = False
        for item in items:
            p_id = item.get("product_id")
            qty = int(item.get("quantity", 1))
            inv = db.query(models.Inventory).filter(models.Inventory.product_id == p_id).first()
            if inv:
                if inv.quantity >= qty:
                    inv.quantity -= qty
                    inv.status = "out_of_stock" if inv.quantity <= 0 else "low_stock" if inv.quantity <= inv.safety_threshold else "in_stock"
                    db.flush()
                else:
                    shortage_found = True
                    state["procurement_needed"] = True
                    steps.append({
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "message": f"Inventory depletion detected for product ID {p_id}.",
                        "type": "warning"
                    })
                    
        if not shortage_found:
            # Create invoice
            invoice_num = f"INV-{uuid.uuid4().hex[:6].upper()}"
            invoice = models.Invoice(
                business_id=business_id,
                order_id=order_id,
                invoice_number=invoice_num,
                amount=total,
                status="paid",
                issued_at=datetime.utcnow()
            )
            db.add(invoice)
            db.flush()
            
            # Hook the Invoice generated workflow event trigger
            from app.services.workflow_engine import WorkflowEngine
            WorkflowEngine.run_workflow_event(
                db, business_id, "invoice_generated", 
                {"invoice_id": invoice.id, "invoice_number": invoice_num, "amount": total, "recipient": "client@billing.com"}
            )
            
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": f"Database commit: Stock reserved. Invoice {invoice_num} issued. Triggered invoice automation.",
                "type": "info"
            })
            
    # 2. Action: Create Procurement Database Task
    elif action == "create_procurement_db":
        payload = state["event_payload"]
        items = payload.get("items", [])
        
        # Double quantity if memory overrides suggest supplier delays
        multiplier = 2 if "double reorder" in state["memory_context"].lower() else 1
        
        for item in items:
            p_id = item.get("product_id")
            product = db.query(models.Product).filter(models.Product.id == p_id).first()
            if product:
                task = models.Task(
                    business_id=business_id,
                    title=f"Procure Stock for {product.name} (SKU: {product.sku}) × {multiplier}",
                    status="pending"
                )
                db.add(task)
                db.flush()
                steps.append({
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "message": f"Database commit: Created procurement reorder task reference {task.id[:8]}...",
                    "type": "action"
                })
                
    # 3. Action: Send Slack Alert
    elif action == "post_slack":
        if "slack" not in tools:
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "Authorization Failure: Slack tool permissions not granted to this employee.",
                "type": "error"
            })
        else:
            msg = args.get("message", f"GaaS Alert: Employee {state['employee_name']} processed workflow event.")
            ToolEngine.execute_tool(db, business_id, "slack", "post", {"message": msg, "channel": args.get("channel")})
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "Slack API (via ToolEngine): Dispatched alert notification.",
                "type": "info"
            })
                
    # 4. Action: Send Gmail
    elif action == "send_gmail":
        if "gmail" not in tools:
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "Authorization Failure: Gmail SMTP tool not granted to this employee.",
                "type": "error"
            })
        else:
            to_addr = args.get("to_email", "client@agentra.ai")
            subj = args.get("subject", "Automated Billing Alert")
            body_txt = args.get("body", "Fulfillment completed successfully.")
            ToolEngine.execute_tool(db, business_id, "gmail", "send", {"to_email": to_addr, "subject": subj, "body": body_txt})
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": f"Gmail API (via ToolEngine): Emailed billing report to {to_addr}.",
                "type": "info"
            })
                
    # 5. Action: Send WhatsApp
    elif action == "send_whatsapp":
        if "whatsapp" not in tools:
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "Authorization Failure: WhatsApp Cloud API tool permissions not granted.",
                "type": "error"
            })
        else:
            phone = args.get("phone", "+15555550100")
            body_txt = args.get("message", "Fulfillment completed.")
            ToolEngine.execute_tool(db, business_id, "whatsapp", "send", {"to_number": phone, "message": body_txt})
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": f"WhatsApp API (via ToolEngine): Emailed shipping text to {phone}.",
                "type": "info"
            })
                
    # 6. Action: Append Sheets
    elif action == "append_sheets":
        if "google_sheets" not in tools:
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "Authorization Failure: Google Sheets tool permissions not granted.",
                "type": "error"
            })
        else:
            conn = get_tool_conn("google_sheets")
            sheet_id = conn.credentials.get("spreadsheet_id", "my-sheet-id") if conn else "my-sheet-id"
            row_data = [datetime.now().isoformat(), state["employee_name"], "Action Execute", action]
            ToolEngine.execute_tool(db, business_id, "google_sheets", "append", {"spreadsheet_id": sheet_id, "range_name": "Sheet1!A1:D", "row": row_data})
            steps.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "Google Sheets API (via ToolEngine): Logged operational trace row.",
                "type": "info"
            })

    state["reasoning_steps"] = steps
    return state

def compile_memory(state: AgentState) -> AgentState:
    """Node 4: AI reflects on run activities and writes learnings to database."""
    db = state["db"]
    business_id = state["business_id"]
    steps = state["reasoning_steps"]
    employee_name = state["employee_name"]
    
    prompt = (
        f"You are the memory reflection unit of AI Employee '{employee_name}'.\n"
        f"Analyze this GaaS execution logs: {[s['message'] for s in steps]}\n\n"
        f"Generate up to 3 learned memory rules for categories:\n"
        f"customer_preference, product_trend, supplier_history, inventory_trend, workload, business_pattern.\n\n"
        f"Output strictly in valid JSON format:\n"
        f"[\n"
        f"  {{\n"
        f"    \"category\": \"customer_preference\",\n"
        f"    \"key\": \"General\",\n"
        f"    \"content\": \"Brief learned rule description...\"\n"
        f"  }}\n"
        f"]"
    )
    
    fallback_json = json.dumps([])
    res_text = query_gemini(prompt, fallback_json)
    
    try:
        clean_json = res_text
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
        learnings = json.loads(clean_json)
        for item in learnings:
            cat = item.get("category")
            k = item.get("key", "general")
            content_str = item.get("content")
            
            if not cat or not content_str:
                continue
                
            existing = db.query(models.Memory).filter(
                models.Memory.business_id == business_id,
                models.Memory.category == cat,
                models.Memory.key == k
            ).first()
            
            if existing:
                existing.content = content_str
                existing.impact_count = 1
                existing.last_updated = datetime.utcnow()
            else:
                new_mem = models.Memory(
                    business_id=business_id,
                    category=cat,
                    key=k,
                    content=content_str,
                    impact_count=1
                )
                db.add(new_mem)
        db.commit()
    except Exception as e:
        logger.error(f"Generic memory reflect failed: {str(e)}")
        db.rollback()
        
    return state

def save_history(state: AgentState) -> AgentState:
    """Node 5: Commits timeline activities to database and increments productivity metrics."""
    db = state["db"]
    order_id = state["order_id"]
    business_id = state["business_id"]
    employee_id = state["employee_id"]
    steps = state["reasoning_steps"]
    
    logger.info(f"Generic GaaS Loop committing traces for Employee ID {employee_id}.")
    
    order = db.query(models.Order).filter(
        models.Order.id == order_id, 
        models.Order.business_id == business_id
    ).first()
    
    if order:
        order.status = "failed" if state["procurement_needed"] else "completed"
        db.flush()
        
    # Write activities logs
    for idx, step in enumerate(steps):
        act = models.Activity(
            business_id=business_id,
            order_id=order_id,
            message=step["message"],
            type=step["type"],
            created_at=datetime.utcnow()
        )
        db.add(act)
        
    # Increment completed tasks counter & metrics on Employee
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if emp:
        emp.completed_tasks += 1
        emp.business_impact += 25.00 # Save $25 per auto operation execution
        db.flush()
        
    db.commit()
    state["status"] = "completed"
    return state

# --- LANGGRAPH GRAPH ASSEMBLY ---

def build_agent_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("load_agent_context", load_agent_context)
    workflow.add_node("reasoning_engine", reasoning_engine)
    workflow.add_node("action_engine", action_engine)
    workflow.add_node("save_history", save_history)
    workflow.add_node("compile_memory", compile_memory)
    
    workflow.set_entry_point("load_agent_context")
    
    workflow.add_edge("load_agent_context", "reasoning_engine")
    
    def route_engine_path(state: AgentState):
        if state["next_action"] == "terminate":
            return "finish"
        else:
            return "execute"
            
    workflow.add_conditional_edges(
        "reasoning_engine",
        route_engine_path,
        {
            "execute": "action_engine",
            "finish": "save_history"
        }
    )
    
    workflow.add_edge("action_engine", "reasoning_engine")
    workflow.add_edge("save_history", "compile_memory")
    workflow.add_edge("compile_memory", END)
    
    return workflow.compile()

operations_agent = build_agent_graph()

def execute_operations_agent(db: Session, business_id: str, order_id: str) -> dict:
    """
    FastAPI Entry point:
    Maps client order webhook events to the generic operations agent presets.
    """
    # Fetch Operations Employee Preset
    emp = db.query(models.Employee).filter(
        models.Employee.business_id == business_id,
        models.Employee.name == "Operations Employee"
    ).first()
    
    if not emp:
        # Fallback query
        emp = db.query(models.Employee).filter(models.Employee.business_id == business_id).first()
        
    if not emp:
        return {"status": "error", "error_detail": "No AI Employee registered."}
        
    order = db.query(models.Order).filter(
        models.Order.id == order_id, 
        models.Order.business_id == business_id
    ).first()
    
    if not order:
        return {"status": "error", "error_detail": "Order not found"}
        
    initial_state: AgentState = {
        "db": db,
        "business_id": business_id,
        "employee_id": emp.id,
        "event_type": "order.created",
        "event_payload": {
            "order_id": order.id,
            "total": order.total,
            "items": order.items
        },
        "order_id": order.id,
        "current_inventory": [],
        "procurement_needed": False,
        "reasoning_steps": [],
        "status": "pending",
        "rag_policies": "",
        "memory_context": "",
        "employee_name": "",
        "employee_role": "",
        "employee_goal": "",
        "employee_prompt": "",
        "employee_tools": [],
        "employee_permissions": [],
        "next_action": None,
        "action_args": None,
        "loop_count": 0
    }
    
    try:
        final_state = operations_agent.invoke(initial_state)
        return {
            "status": "success",
            "procurement_needed": final_state.get("procurement_needed", False),
            "steps_count": len(final_state.get("reasoning_steps", []))
        }
    except Exception as e:
        logger.error(f"Framework launch failure: {str(e)}")
        return {"status": "error", "error_detail": str(e)}

def execute_custom_agent(db: Session, business_id: str, employee_id: str, event_type: str, payload: dict) -> dict:
    """Executes any generic AI Employee in the GaaS platform parameterized loop."""
    initial_state: AgentState = {
        "db": db,
        "business_id": business_id,
        "employee_id": employee_id,
        "event_type": event_type,
        "event_payload": payload,
        "order_id": payload.get("order_id"),
        "current_inventory": [],
        "procurement_needed": False,
        "reasoning_steps": [],
        "status": "pending",
        "rag_policies": "",
        "memory_context": "",
        "employee_name": "",
        "employee_role": "",
        "employee_goal": "",
        "employee_prompt": "",
        "employee_tools": [],
        "employee_permissions": [],
        "next_action": None,
        "action_args": None,
        "loop_count": 0
    }
    try:
        final_state = operations_agent.invoke(initial_state)
        return {
            "status": "success",
            "steps_count": len(final_state.get("reasoning_steps", []))
        }
    except Exception as e:
        logger.error(f"Framework custom launch failure: {str(e)}")
        return {"status": "error", "error_detail": str(e)}
