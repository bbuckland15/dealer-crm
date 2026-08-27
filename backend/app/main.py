from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import customers, outreach, inventory

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dealership Sales CRM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(outreach.router)
app.include_router(inventory.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "dealer-crm-api"}
