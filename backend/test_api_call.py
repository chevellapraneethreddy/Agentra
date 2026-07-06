import urllib.request
import json

def test_live_api():
    url = "http://127.0.0.1:8000/api/v1/employee/"
    req = urllib.request.Request(url)
    # Use development sandbox token bypass check
    req.add_header("Authorization", "Bearer dev-token-live-verify@agentra.ai")
    
    print(f"Making HTTP GET request to live server: {url}")
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Server responded with status code: {status_code}")
            
            data = json.loads(body)
            print(f"\nSuccessfully retrieved {len(data)} AI Employees from live REST API:")
            for idx, emp in enumerate(data):
                print(f"{idx+1}. {emp['name']} - Role: {emp['role']}")
                print(f"   Goal: {emp['goal']}")
                print(f"   Tools: {emp['tools']} | Tasks Completed: {emp['completed_tasks']}\n")
    except Exception as e:
        print(f"API request failed: {str(e)}")
        print("Please check if the FastAPI dev server is running on port 8000.")

if __name__ == "__main__":
    test_live_api()
