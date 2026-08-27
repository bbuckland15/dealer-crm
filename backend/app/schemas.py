from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from .models import LeadStatus, InteractionType


class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    interested_vehicle: Optional[str] = None
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
    status: Optional[LeadStatus] = None
    ai_outreach_opt_in: Optional[bool] = None


class Customer(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
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
