from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class CurrencyNested(BaseModel):
    code: str
    symbol: str
    name: str

    model_config = ConfigDict(from_attributes=True)

class ClientBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    contact_person: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    tax_id: str | None = Field(default=None, max_length=100)

    # Detailed Address
    address_line1: str = Field(..., min_length=1, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    postal_code: str = Field(..., min_length=1, max_length=50)
    country: str = Field(..., min_length=1, max_length=100)

    # Financial & terms
    hourly_rate: float = Field(default=0.0, ge=0.0)
    currency_code: str = Field(..., min_length=1, max_length=10)
    payment_terms_days: int = Field(default=15, ge=0, le=365)
    is_active: bool = True

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=200)
    contact_person: str | None = Field(default=None, min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = None
    tax_id: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    hourly_rate: float | None = Field(default=None, ge=0.0)
    currency_code: str | None = None
    payment_terms_days: int | None = Field(default=None, ge=0, le=365)
    is_active: bool | None = None

class ClientResponse(ClientBase):
    id: str
    created_at: datetime
    updated_at: datetime
    currency: CurrencyNested | None = None
    total_incoming_amount: float = 0.0
    total_equivalent_inr: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class ClientSummary(BaseModel):
    id: str
    company_name: str
    contact_person: str
    currency_code: str
    hourly_rate: float
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
