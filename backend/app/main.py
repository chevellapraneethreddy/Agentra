from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.api.api import api_router
import logging

# Ensure all database tables are created on server startup
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agentra")

app = FastAPI(
    title="Agentra GaaS Core API",
    description="Backend services for Agentra Generative AI as a Service platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include central routing
app.include_router(api_router, prefix="/api/v1")

@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect to API documentation."""
    return RedirectResponse(url="/docs")

@app.get("/health", tags=["Health"])
def health_check():
    """Verify service health status."""
    return {
        "status": "healthy",
        "service": "agentra-gaas-core",
        "debug_mode": settings.DEBUG
    }

@app.on_event("startup")
def startup_event():
    from app.core.database import SessionLocal
    from datetime import datetime, timedelta
    import threading
    import time
    
    # Run Startup Validation audit on stored integrations
    db = SessionLocal()
    try:
        from app.services.integrations.integration_manager import IntegrationManager
        IntegrationManager.validate_and_register_integrations(db)
    except Exception as startup_err:
        logger.error(f"Startup validation failure: {str(startup_err)}")
    finally:
        db.close()
    
    def worker_loop():
        logger.info("Scheduled email and workflow background worker started.")
        last_daily_summary_run = None
        last_gmail_poll = None
        
        while True:
            try:
                db = SessionLocal()
                try:
                    # 1. Process scheduled email queue
                    from app.services.integrations.gmail_workflows import GmailWorkflows
                    sent = GmailWorkflows.process_scheduled_emails(db)
                    if sent > 0:
                        logger.info(f"Scheduled worker sent {sent} emails.")

                    # 2. Process waiting workflows state machine
                    from app.services.workflow_engine import WorkflowEngine
                    WorkflowEngine.process_waiting_workflows(db)

                    # 3. Check for 8 AM daily summaries scheduled workflows
                    now = datetime.now()
                    today_str = now.strftime("%Y-%m-%d")
                    if now.hour == 8 and last_daily_summary_run != today_str:
                        logger.info("Triggering 8 AM scheduled daily summary workflows...")
                        from app.models import models
                        businesses = db.query(models.Business).all()
                        for biz in businesses:
                            WorkflowEngine.run_workflow_event(db, biz.id, "schedule_8am", {})
                        last_daily_summary_run = today_str

                    # 4. Gmail Monitoring Service: Poll new unread emails for all workspaces every 60 seconds
                    if last_gmail_poll is None or (now - last_gmail_poll) >= timedelta(seconds=60):
                        from app.services.integrations.gmail_monitor import GmailMonitorService
                        GmailMonitorService.poll_unread_emails_for_all_workspaces(db)
                        last_gmail_poll = now

                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Background worker loop error: {str(e)}")
            time.sleep(15)
            
    thread = threading.Thread(target=worker_loop, daemon=True)
    thread.start()
