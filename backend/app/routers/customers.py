from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=List[schemas.Customer])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.created_at.desc()).all()


@router.post("/", response_model=schemas.Customer, status_code=201)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, payload: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    db.delete(customer)
    db.commit()


# --- Notes (each customer can have many free-text notes) ---

@router.get("/{customer_id}/notes", response_model=List[schemas.Note])
def list_notes(customer_id: int, db: Session = Depends(get_db)):
    return db.query(models.Note).filter(models.Note.customer_id == customer_id).order_by(models.Note.created_at.desc()).all()


@router.post("/{customer_id}/notes", response_model=schemas.Note, status_code=201)
def add_note(customer_id: int, payload: schemas.NoteCreate, db: Session = Depends(get_db)):
    if not db.get(models.Customer, customer_id):
        raise HTTPException(404, "Customer not found")
    note = models.Note(customer_id=customer_id, body=payload.body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/{customer_id}/notes/{note_id}", response_model=schemas.Note)
def update_note(customer_id: int, note_id: int, payload: schemas.NoteUpdate, db: Session = Depends(get_db)):
    note = db.get(models.Note, note_id)
    if not note or note.customer_id != customer_id:
        raise HTTPException(404, "Note not found")
    note.body = payload.body
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{customer_id}/notes/{note_id}", status_code=204)
def delete_note(customer_id: int, note_id: int, db: Session = Depends(get_db)):
    note = db.get(models.Note, note_id)
    if not note or note.customer_id != customer_id:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()


# --- Interactions (call/email/text/visit/ai_outreach log) ---

@router.get("/{customer_id}/interactions", response_model=List[schemas.Interaction])
def list_interactions(customer_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Interaction)
        .filter(models.Interaction.customer_id == customer_id)
        .order_by(models.Interaction.created_at.desc())
        .all()
    )


@router.post("/{customer_id}/interactions", response_model=schemas.Interaction, status_code=201)
def add_interaction(customer_id: int, payload: schemas.InteractionCreate, db: Session = Depends(get_db)):
    if not db.get(models.Customer, customer_id):
        raise HTTPException(404, "Customer not found")
    interaction = models.Interaction(customer_id=customer_id, **payload.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction
