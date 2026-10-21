from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class AlertDispatchRequest(BaseModel):
    water_body_id: Optional[int] = Field(None, description="Optional associated water body ID")
    water_body_name: str = Field(..., description="Name of the aquatic site triggering the alert")
    severity: str = Field("high", description="Severity level: low, moderate, high, extreme")
    message: str = Field(..., description="Actionable advisory message for downstream delivery")
    channel: str = Field("webhook", description="Target delivery channel: 'webhook', 'email', or 'sms'")
    recipient: Optional[str] = Field(None, description="Optional target endpoint URL, email address, or phone number")
    test_mode: bool = Field(False, description="When true, executes a safe dry run and does not contact external network")
    force: bool = Field(False, description="When true, bypasses duplicate suppression window")

class AlertTestRequest(BaseModel):
    channel: str = Field("webhook", description="Target delivery channel: 'webhook', 'email', or 'sms'")
    recipient: Optional[str] = Field(None, description="Optional target endpoint URL, email address, or phone number")
    water_body_name: str = Field("Cascade Canyon River", description="Station name for the test notification")
    safe_simulation_only: bool = Field(True, description="When true, executes a safe dry run simulation without external transmission")

class AlertDispatchResponse(BaseModel):
    delivery_id: str = Field(..., description="Unique delivery UUID")
    channel: str = Field(..., description="Delivery channel used")
    recipient: str = Field(..., description="Target endpoint or address")
    severity: str = Field(..., description="Alert severity level")
    status: str = Field(..., description="Delivery status: DELIVERED, ACCEPTED, FAILED, TEST_MODE_SIMULATED, UNCONFIGURED, DUPLICATE_SUPPRESSED")
    confirmed_by_provider: bool = Field(..., description="Whether the upstream provider explicitly confirmed delivery")
    provider_message: str = Field(..., description="Confirmation details or error from the upstream provider")
    dispatched_at: datetime = Field(..., description="Timestamp of dispatch attempt")
    test_mode: bool = Field(..., description="Whether the dispatch was processed in safe test mode")
    notice: str = Field(..., description="Advisory context regarding transmission validity")

class AlertDeliverySchema(BaseModel):
    id: str
    alert_id: Optional[int] = None
    water_body_id: Optional[int] = None
    water_body_name: str
    severity: str
    channel: str
    recipient: str
    message: str
    status: str
    confirmed_by_provider: bool
    provider_message: str
    is_test_mode: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertChannelStatusResponse(BaseModel):
    webhook_configured: bool
    email_configured: bool
    sms_configured: bool = False
    default_webhook_url: Optional[str] = None
    default_email_recipient: Optional[str] = None
    default_sms_recipient: Optional[str] = None
    test_mode_enforced: bool
    dedup_window_seconds: float = 60.0
    notice: str
