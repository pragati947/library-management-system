import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.connection import get_db, get_db_status
from ..models.models import Librarian
from ..auth.jwt import get_current_librarian
from ..schemas.schemas import SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(get_current_librarian)])

# Runtime configuration state (can be overridden during server run)
runtime_config = {
    "default_daily_fine_rate": float(os.getenv("DEFAULT_DAILY_FINE_RATE", "5.00")),
    "default_borrow_days": int(os.getenv("DEFAULT_BORROW_DAYS", "14")),
    "currency_symbol": "₹"
}

@router.get("")
def get_settings(current_librarian: Librarian = Depends(get_current_librarian)):
    return {
        "config": runtime_config,
        "librarian": {
            "librarian_id": current_librarian.librarian_id,
            "name": current_librarian.name,
            "email": current_librarian.email,
            "phone": current_librarian.phone,
            "username": current_librarian.username
        },
        "database": get_db_status()
    }

@router.put("")
def update_settings(data: SettingsUpdate, current_librarian: Librarian = Depends(get_current_librarian)):
    if data.default_daily_fine_rate is not None:
        if data.default_daily_fine_rate < 0:
            raise HTTPException(status_code=400, detail="Fine rate cannot be negative")
        runtime_config["default_daily_fine_rate"] = data.default_daily_fine_rate

    if data.default_borrow_days is not None:
        if data.default_borrow_days < 1:
            raise HTTPException(status_code=400, detail="Borrow days must be at least 1")
        runtime_config["default_borrow_days"] = data.default_borrow_days

    return {
        "message": "Settings updated successfully",
        "config": runtime_config
    }

