from fastapi import APIRouter
from app.api import (
    orders, 
    inventory, 
    tasks, 
    employee, 
    knowledge, 
    analytics, 
    products, 
    customers, 
    invoices,
    connections,
    memory,
    workflows,
    prompt_studio,
    business,
    providers
)

api_router = APIRouter()

api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(employee.router, prefix="/employee", tags=["AI Employee"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge Base"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(connections.router, prefix="/connections", tags=["Tool Connections"])
api_router.include_router(memory.router, prefix="/memory", tags=["AI Memory"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["AI Workflows"])
api_router.include_router(prompt_studio.router, prefix="/prompts", tags=["Prompt Studio"])
api_router.include_router(business.router, prefix="/business", tags=["Business Environment"])
api_router.include_router(providers.router, prefix="/providers", tags=["AI Providers"])

@api_router.get("/health", tags=["Health"])
def health_check():
    """Verify service health status under API v1."""
    return {
        "status": "healthy",
        "service": "agentra-gaas-core-v1"
    }
