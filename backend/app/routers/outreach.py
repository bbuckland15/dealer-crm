"""
Agentic AI outreach: given a customer + their notes/interaction history, draft
a personalized follow-up message. This is the seed of the "reach back out to
interested customers" feature from the project brief.

Kept deliberately simple: one function that builds context from the DB and
asks Claude for a draft. You (or a scheduled job) review/send the draft --
nothing here sends messages automatically yet, by design, so you stay in
control of what goes out to real customers.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/outreach", tags=["outreach"])


def _build_context(customer: models.Customer, notes: list[models.Note]) -> str:
    lines = [
        f"Customer: {customer.first_name} {customer.last_name}",
        f"Status: {customer.status.value}",
        f"Interested vehicle: {customer.interested_vehicle or 'unspecified'}",
    ]
    if notes:
        lines.append("Sales rep notes:")
        for n in notes:
            lines.append(f"- {n.body}")
    return "\n".join(lines)


@router.post("/{customer_id}/draft", response_model=schemas.OutreachDraftResponse)
def draft_outreach_message(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    if not customer.ai_outreach_opt_in:
        raise HTTPException(400, "Customer has opted out of AI outreach")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your-key-here":
        raise HTTPException(
            500,
            "ANTHROPIC_API_KEY is not set. Add it to backend/.env to enable AI drafting.",
        )

    notes = (
        db.query(models.Note)
        .filter(models.Note.customer_id == customer_id)
        .order_by(models.Note.created_at.desc())
        .limit(10)
        .all()
    )
    context = _build_context(customer, notes)

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        system=(
            "You are a friendly, low-pressure sales assistant at a car dealership. "
            "Write a short, warm follow-up message (2-4 sentences) to re-engage an "
            "interested customer, using the context given. No pushy sales language, "
            "no fake urgency, no discounts you weren't told about. Sign off as "
            "'The Sales Team'."
        ),
        messages=[{"role": "user", "content": context}],
    )
    draft = message.content[0].text

    # Log that a draft was generated (not that it was sent -- sending is a
    # separate, explicit step so a human stays in the loop).
    db.add(models.Interaction(
        customer_id=customer_id,
        type=models.InteractionType.ai_outreach,
        summary=f"AI drafted a follow-up message: {draft[:200]}",
    ))
    db.commit()

    return schemas.OutreachDraftResponse(customer_id=customer_id, draft_message=draft)
