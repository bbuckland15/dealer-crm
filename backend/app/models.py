import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, Boolean
)
from sqlalchemy.orm import relationship

from .database import Base


class LeadStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    interested = "interested"
    negotiating = "negotiating"
    sold = "sold"
    lost = "lost"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(30), nullable=True)
    interested_vehicle = Column(String(200), nullable=True)  # free-text fallback, e.g. "2024 Tiguan"
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)  # linked to real inventory, if matched
    status = Column(SAEnum(LeadStatus), default=LeadStatus.new, nullable=False)
    ai_outreach_opt_in = Column(Boolean, default=True)  # allow AI to draft/send follow-ups
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    notes = relationship("Note", back_populates="customer", cascade="all, delete-orphan")
    interactions = relationship("Interaction", back_populates="customer", cascade="all, delete-orphan")
    vehicle = relationship("Vehicle")


class Vehicle(Base):
    """A vehicle pulled from the dealership's live inventory (see routers/inventory.py)."""
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vin = Column(String(17), unique=True, index=True, nullable=False)
    stock_number = Column(String(50), nullable=True)
    year = Column(Integer, nullable=True)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    trim = Column(String(200), nullable=True)
    condition = Column(String(20), nullable=True)  # new / used / certified
    color = Column(String(50), nullable=True)
    drivetrain = Column(String(50), nullable=True)
    body_style = Column(String(50), nullable=True)
    price = Column(Integer, nullable=True)  # whole dollars
    image_url = Column(String(500), nullable=True)
    source_url = Column(String(500), nullable=True)  # the VDP page this was pulled from
    last_synced_at = Column(DateTime, nullable=True)


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="notes")


class InteractionType(str, enum.Enum):
    call = "call"
    email = "email"
    text = "text"
    visit = "visit"
    ai_outreach = "ai_outreach"


class Interaction(Base):
    """A log of every touchpoint with a customer, including AI-generated outreach."""
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    type = Column(SAEnum(InteractionType), nullable=False)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="interactions")
