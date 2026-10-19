import os
import sys

# Configure UTF-8 encoding on Windows to prevent UnicodeEncodeError in CP1252 consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure both backend and parent directories are in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

os.environ["PYTHONPATH"] = current_dir + os.pathsep + os.environ.get("PYTHONPATH", "")

import uvicorn

if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    print(f"[AQUORA AI] Starting Backend Server at http://{host}:{port}")
    print(f"[AQUORA AI] Swagger Docs available at http://{host}:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload, app_dir=current_dir)
