from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

class CompanyProfile(BaseModel):
    name: str = Field(default="", description="Company or Sole Proprietor Name")
    address: str = Field(default="", description="Registered Office / Billing Address")
    phone: str = Field(default="", description="Contact Phone Number")
    pan: str = Field(default="", description="Permanent Account Number (PAN)")
    gstin: str = Field(default="", description="GST Identification Number")
    email: str = Field(default="", description="Billing / Official Email")
    website: str = Field(default="", description="Official Website URL")

class ThemeSettings(BaseModel):
    accent_color: str = Field(default="#ffffff", description="Hex accent color code")
    theme_mode: str = Field(default="dark", description="'dark' or 'light'")

class CurrencyBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=10, description="ISO Currency Code, e.g. INR, USD")
    symbol: str = Field(..., min_length=1, max_length=10, description="Symbol, e.g. ₹, $")
    name: str = Field(..., min_length=1, max_length=100, description="Display Name")
    is_base_currency: bool = Field(default=False, description="Whether this is the system primary base currency")
    is_active: bool = Field(default=True)

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.strip().upper()

class CurrencyCreate(CurrencyBase):
    pass

class CurrencyUpdate(BaseModel):
    symbol: Optional[str] = None
    name: Optional[str] = None
    is_base_currency: Optional[bool] = None
    is_active: Optional[bool] = None

class CurrencyOut(CurrencyBase):
    model_config = ConfigDict(from_attributes=True)

class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    size_display: str
    created_at: str

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
