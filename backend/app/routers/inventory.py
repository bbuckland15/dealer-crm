"""
Pulls real inventory data from the dealership's own public website and stores
it as Vehicle rows, so a Customer can be linked to an actual vehicle (VIN,
price, photo, etc.) instead of a free-text guess.

How it works (see README's "Inventory sync" section for the full writeup):
1. Fetch the site's inventory XML sitemap -> list of vehicle detail page (VDP) URLs.
2. Fetch each VDP page and pull whatever structured data it exposes -- mainly
   OpenGraph/meta tags (price, title, photo) plus the VIN, which DealerInspire
   embeds in the URL itself rather than a dedicated meta tag.
3. Upsert each vehicle into the `vehicles` table, matched by VIN.

This is intentionally manual (triggered by a "Sync Inventory" button), not a
background job -- see README roadmap for turning this into a scheduled sync.
"""
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/inventory", tags=["inventory"])

USER_AGENT = "DealerCRM-InventorySync/1.0 (internal tool; contact: dealership staff)"
VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")  # standard VIN charset, excludes I/O/Q
YEAR_RE = re.compile(r"^(19|20)\d{2}$")


def _meta(soup: BeautifulSoup, name: str) -> Optional[str]:
    tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
    content = tag.get("content") if tag else None
    return content.strip() if content else None


def _parse_vdp(url: str, html: str) -> Optional[dict]:
    """Best-effort parse of one vehicle detail page. Returns None if we can't
    even identify a VIN, since that's the one field everything else hangs off of."""
    slug = url.rstrip("/").split("/")[-1]
    parts = slug.split("-")
    vin = parts[-1].upper() if parts else None
    if not vin or not VIN_RE.match(vin):
        return None

    soup = BeautifulSoup(html, "html.parser")

    condition = (
        "certified" if slug.startswith("certified-used-")
        else "used" if slug.startswith("used-")
        else "new" if slug.startswith("new-")
        else None
    )

    year = make = model = trim = None
    og_title = _meta(soup, "og:title")
    if og_title:
        tokens = og_title.split()
        for i, tok in enumerate(tokens):
            if YEAR_RE.match(tok):
                year = int(tok)
                rest = tokens[i + 1:]
                if rest:
                    make = rest[0]
                    model = rest[1] if len(rest) > 1 else None
                    trim = " ".join(rest[2:]) if len(rest) > 2 else None
                break

    color = None
    for i in range(1, 6):
        label = _meta(soup, f"twitter:label{i}")
        data = _meta(soup, f"twitter:data{i}")
        if label and "color" in label.lower() and data:
            color = data
            break

    drivetrain = body_style = None
    m = re.search(r"(front|rear|all|four)-wheel-drive-([a-z]+)", slug)
    if m:
        drivetrain = f"{m.group(1)}-wheel drive".title()
        body_style = m.group(2).title()

    price = None
    price_raw = _meta(soup, "product:price:amount")
    if price_raw:
        try:
            price = int(float(price_raw))
        except ValueError:
            pass

    return dict(
        vin=vin,
        year=year,
        make=make,
        model=model,
        trim=trim,
        condition=condition,
        color=color,
        drivetrain=drivetrain,
        body_style=body_style,
        price=price,
        image_url=_meta(soup, "og:image"),
        source_url=url,
    )


def _fetch_vdp_urls(sitemap_url: str) -> List[str]:
    resp = httpx.get(sitemap_url, timeout=15, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    root = ET.fromstring(resp.content)
    # Sitemaps use a namespaced <url><loc> structure; strip the namespace to keep this simple.
    return [
        el.text.strip()
        for el in root.iter()
        if el.tag.endswith("loc") and el.text
    ]


@router.post("/sync", response_model=schemas.SyncResult)
def sync_inventory(db: Session = Depends(get_db)):
    sitemap_url = os.getenv("INVENTORY_SITEMAP_URL")
    if not sitemap_url:
        raise HTTPException(
            500,
            "INVENTORY_SITEMAP_URL is not set in backend/.env. "
            "Add it (see .env.example) and restart the backend.",
        )

    try:
        urls = _fetch_vdp_urls(sitemap_url)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Could not fetch inventory sitemap: {e}")

    created = updated = skipped = 0
    with httpx.Client(timeout=10, headers={"User-Agent": USER_AGENT}) as client:
        for url in urls:
            try:
                page = client.get(url)
                page.raise_for_status()
            except httpx.HTTPError:
                skipped += 1
                continue

            data = _parse_vdp(url, page.text)
            if not data:
                skipped += 1
                continue

            existing = db.query(models.Vehicle).filter(models.Vehicle.vin == data["vin"]).first()
            if existing:
                for field, value in data.items():
                    setattr(existing, field, value)
                existing.last_synced_at = datetime.utcnow()
                updated += 1
            else:
                db.add(models.Vehicle(**data, last_synced_at=datetime.utcnow()))
                created += 1

            time.sleep(0.15)  # small courtesy delay between requests

    db.commit()
    return schemas.SyncResult(total_found=len(urls), created=created, updated=updated, skipped=skipped)


@router.get("/vehicles", response_model=List[schemas.Vehicle])
def list_vehicles(q: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Vehicle)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Vehicle.make.ilike(like))
            | (models.Vehicle.model.ilike(like))
            | (models.Vehicle.trim.ilike(like))
            | (models.Vehicle.vin.ilike(like))
        )
    return query.order_by(models.Vehicle.year.desc()).limit(50).all()
