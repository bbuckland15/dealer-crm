from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from .models import LeadStatus, InteractionType


class VehicleBase(BaseModel):
    vin: str
    stock_number: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    trim: Optional[str] = None
    condition: Optional[str] = None
    color: Optional[str] = None
    drivetrain: Optional[str] = None
    body_style: Optional[str] = None
    price: Optional[int] = None
    image_url: Optional[str] = None
    source_url: Optional[str] = None


class Vehicle(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    last_synced_at: Optional[datetime] = None


class SyncResult(BaseModel):
    total_found: int
    created: int
    updated: int
    skipped: int


class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    interested_vehicle: Optional[str] = None
    vehicle_id: Optional[int] = None
    status: LeadStatus = LeadStatus.new
    ai_outreach_opt_in: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    interested_vehicle: Optional[str] = None
    vehicle_id: Optional[int] = None
    status: Optional[LeadStatus] = None
    ai_outreach_opt_in: Optional[bool] = None


class Customer(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    vehicle: Optional[Vehicle] = None


class NoteCreate(BaseModel):
    body: str


class NoteUpdate(BaseModel):
    body: str


class Note(NoteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    created_at: datetime


class InteractionCreate(BaseModel):
    type: InteractionType
    summary: str


class Interaction(InteractionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    created_at: datetime


class OutreachDraftResponse(BaseModel):
    customer_id: int
    draft_message: str
