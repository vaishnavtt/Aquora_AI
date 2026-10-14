from datetime import datetime
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    database: str
    ml_model_loaded: bool
