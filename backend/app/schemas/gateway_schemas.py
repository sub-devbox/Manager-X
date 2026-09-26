from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class GatewayBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    currency_code: str = Field(default="USD", min_length=1, max_length=10)
    gateway_note: str = Field(default="")
    is_active: bool = True

class GatewayCreate(GatewayBase):
    pass

class GatewayUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    currency_code: Optional[str] = Field(default=None, min_length=1, max_length=10)
    gateway_note: Optional[str] = None
    is_active: Optional[bool] = None

class GatewayResponse(GatewayBase):
    id: str
    total_incoming_amount: float = 0.0
    total_equivalent_inr: float = 0.0
    average_rate: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
