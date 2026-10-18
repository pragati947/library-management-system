from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..auth.jwt import get_current_librarian
from ..services import report_service

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"], dependencies=[Depends(get_current_librarian)])

@router.get("/most-borrowed")
def report_most_borrowed_books(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    return report_service.get_most_borrowed_books(db, limit)

@router.get("/popular-genres")
def report_popular_genres(db: Session = Depends(get_db)):
    return report_service.get_popular_genres(db)

@router.get("/borrowed-authors")
def report_borrowed_authors(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    return report_service.get_most_borrowed_authors(db, limit)

@router.get("/top-members")
def report_top_members(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    return report_service.get_top_members_by_activity(db, limit)

@router.get("/overdue")
def report_overdue(db: Session = Depends(get_db)):
    return report_service.get_overdue_report(db)

@router.get("/fines")
def report_fines(db: Session = Depends(get_db)):
    return report_service.get_fines_summary(db)

@router.get("/never-borrowed")
def report_never_borrowed(db: Session = Depends(get_db)):
    return report_service.get_books_never_borrowed(db)

@router.get("/top-rated")
def report_top_rated(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    return report_service.get_top_rated_books(db, limit)

@router.get("/reservations")
def report_reservations(db: Session = Depends(get_db)):
    return report_service.get_reservation_stats(db)

