from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class InvoiceItemBase(BaseModel):
    task_id: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=255)
    hsn_sac: Optional[str] = ""
    price: float = Field(default=0.0, ge=0)
    quantity: float = Field(default=1.0, ge=0)
    unit_price: float = Field(default=0.0, ge=0)
    total: float = Field(default=0.0)
    sort_order: int = 0

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: str
    invoice_id: str
    model_config = ConfigDict(from_attributes=True)

class ClientSummary(BaseModel):
    id: str
    company_name: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    tax_id: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    currency_code: str
    hourly_rate: float
    payment_terms_days: int
    model_config = ConfigDict(from_attributes=True)

class InvoiceBase(BaseModel):
    client_id: str
    issue_date: str
    due_date: str
    payment_gateway: Optional[str] = "Razorpay"
    status: str = "draft"
    discount_type: str = "fixed"
    discount_value: float = 0.0
    discount_amount: float = 0.0
    round_off: float = 0.0
    gateway_notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    invoice_number: Optional[str] = None
    subtotal: Optional[float] = 0.0
    final_amount: Optional[float] = 0.0
    currency_code: Optional[str] = "USD"
    items: List[InvoiceItemCreate] = []

class InvoiceUpdate(BaseModel):
    client_id: Optional[str] = None
    invoice_number: Optional[str] = None
    status: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    payment_gateway: Optional[str] = None
    subtotal: Optional[float] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: Optional[float] = None
    round_off: Optional[float] = None
    final_amount: Optional[float] = None
    currency_code: Optional[str] = None
    gateway_notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None

class InvoiceResponse(InvoiceBase):
    id: str
    invoice_number: str
    subtotal: float
    final_amount: float
    currency_code: str
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientSummary] = None
    items: List[InvoiceItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class UnbilledTaskOut(BaseModel):
    id: str
    title: str
    project_id: str
    project_name: Optional[str] = None
    estimated_hours: float = 0.0
    hourly_rate: Optional[float] = None
    time_spent_seconds: int = 0
