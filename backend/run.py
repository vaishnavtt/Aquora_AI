import os
import sys
import uvicorn

# Ensure the root directory is on the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    print(f"🌊 Starting AQUORA AI Backend Server at http://{host}:{port}")
    print(f"📖 Swagger Docs available at http://{host}:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
