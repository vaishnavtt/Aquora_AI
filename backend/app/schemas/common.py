from enum import Enum
from typing import List, Union
from pydantic import BaseModel, Field

class RiskLevelEnum(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    EXTREME = "extreme"

class WaterBodyTypeEnum(str, Enum):
    LAKE = "lake"
    RIVER = "river"
    RESERVOIR = "reservoir"
    COASTAL = "coastal"
    QUARRY = "quarry"
    WATERFALL = "waterfall"
    CANAL = "canal"
    POND = "pond"

class ErrorDetailItem(BaseModel):
    loc: List[Union[str, int]] = Field(..., description="Location of the validation error")
    msg: str = Field(..., description="Description of the validation failure")
    type: str = Field(..., description="Type of validation error (e.g. enum, greater_than_equal)")

class ErrorResponse(BaseModel):
    detail: Union[List[ErrorDetailItem], str] = Field(..., description="Error message or list of RFC-7807 validation errors")
