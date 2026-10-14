import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from root or backend directory if present
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

class Settings(BaseModel):
    PROJECT_NAME: str = "AQUORA AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    
    # SQLite Database URL - defaults to predictable backend/aquora.db
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'aquora.db')).replace(os.sep, '/')}"
    )
    
    # CORS Origins (frontend URLs)
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Optional Gemini API Key
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY", None)

settings = Settings()
