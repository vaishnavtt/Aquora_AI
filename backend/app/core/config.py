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

    # Outbound Alert & Notification Dispatch Settings
    # Safe test mode: when True, simulates delivery without contacting external network
    ALERT_TEST_MODE: bool = os.getenv("ALERT_TEST_MODE", "false").lower() in ("true", "1", "yes")
    ALERT_WEBHOOK_URL: str | None = os.getenv("ALERT_WEBHOOK_URL") or os.getenv("WEBHOOK_ALERT_URL", None)
    ALERT_WEBHOOK_AUTH_TOKEN: str | None = os.getenv("ALERT_WEBHOOK_AUTH_TOKEN") or os.getenv("WEBHOOK_ALERT_AUTH_TOKEN", None)

    SMTP_HOST: str | None = os.getenv("SMTP_HOST", None)
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME", None)
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD", None)
    ALERT_FROM_EMAIL: str = os.getenv("ALERT_FROM_EMAIL", "alerts@aquora.local")
    ALERT_TO_EMAIL: str | None = os.getenv("ALERT_TO_EMAIL", None)

    # Official River Telemetry API Configuration
    NWIC_API_KEY: str | None = os.getenv("NWIC_API_KEY", None)
    NWIC_API_BASE_URL: str = os.getenv("NWIC_API_BASE_URL", "https://nwdp.gov.in/api/v1")
    USGS_API_BASE_URL: str = os.getenv("USGS_API_BASE_URL", "https://waterservices.usgs.gov/nwis/iv/")
    USGS_DEFAULT_SITE: str = os.getenv("USGS_DEFAULT_SITE", "11164500")

settings = Settings()
