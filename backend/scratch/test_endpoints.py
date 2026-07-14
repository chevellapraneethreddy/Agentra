import urllib.request
import json
import sys

ENDPOINTS = [
    ("/health", "Root Health"),
    ("/api/v1/health", "API v1 Health"),
    ("/api/v1/orders/", "Orders Database GET"),
    ("/api/v1/inventory/", "Inventory Database GET"),
    ("/api/v1/tasks/", "Tasks Checklist GET"),
    ("/api/v1/employee/", "AI Employee Registry GET"),
    ("/api/v1/knowledge/documents", "RAG Documents GET"),
    ("/api/v1/analytics/summary", "Analytics Metrics GET"),
    ("/api/v1/connections/", "Integrations connections GET"),
    ("/api/v1/memory/", "Reflective memories GET"),
    ("/api/v1/workflows/", "AI Workflows Config GET"),
    ("/api/v1/workflows/history", "AI Workflows History GET"),
    ("/api/v1/prompts/", "Prompt Studio List GET"),
    ("/api/v1/business/me", "Business Profile GET"),
    ("/api/v1/providers/", "AI Providers List GET")
]

def run_tests():
    base_url = "http://127.0.0.1:8000"
    token = "dev-token-test-suite@agentra.ai"
    
    print("==================================================")
    print("     AGENTRA GaaS CORE - API ROUTE HEALTH CHECKS  ")
    print("==================================================")
    
    passed_count = 0
    for path, label in ENDPOINTS:
        url = f"{base_url}{path}"
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {token}")
        
        try:
            with urllib.request.urlopen(req, timeout=3.0) as response:
                status = response.getcode()
                body = response.read().decode('utf-8')
                print(f"[SUCCESS] {label:<30} | Path: {path:<30} | Status: {status}")
                passed_count += 1
        except Exception as e:
            print(f"[FAILED]  {label:<30} | Path: {path:<30} | Error: {str(e)}")
            
    print("==================================================")
    print(f"Results: {passed_count}/{len(ENDPOINTS)} endpoints responding successfully.")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
