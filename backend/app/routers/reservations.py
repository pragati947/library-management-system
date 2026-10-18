from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.connection import get_db
from ..models.models import Reservation, Book, Member
from ..schemas.schemas import ReservationCreate, ReservationUpdate, ReservationResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/reservations", tags=["Reservations"], dependencies=[Depends(get_current_librarian)])

@router.get("", response_model=List[ReservationResponse])
def get_reservations(
    book_id: Optional[int] = Query(None, description="Filter by book ID"),
    member_id: Optional[int] = Query(None, description="Filter by member ID"),
    status: Optional[str] = Query(None, description="PENDING, FULFILLED, CANCELLED"),
    db: Session = Depends(get_db)
):
    query = db.query(Reservation)
    if book_id:
        query = query.filter(Reservation.book_id == book_id)
    if member_id:
        query = query.filter(Reservation.member_id == member_id)
    if status:
        query = query.filter(Reservation.status == status.upper())

    reservations = query.order_by(Reservation.reservation_date.asc()).all()

    # Calculate queue position for pending reservations per book
    book_queue_counter = {}
    results = []
    for r in reservations:
        q_pos = None
        if r.status == 'PENDING':
            book_queue_counter[r.book_id] = book_queue_counter.get(r.book_id, 0) + 1
            q_pos = book_queue_counter[r.book_id]

        results.append(ReservationResponse(
            reservation_id=r.reservation_id,
            book_id=r.book_id,
            member_id=r.member_id,
            reservation_date=r.reservation_date,
            status=r.status,
            book_title=r.book.title if r.book else None,
            member_name=r.member.name if r.member else None,
            queue_position=q_pos
        ))

    return results

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == data.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    member = db.query(Member).filter(Member.member_id == data.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Check if there is already an active pending reservation for this member and book
    existing = db.query(Reservation).filter(
        Reservation.book_id == data.book_id,
        Reservation.member_id == data.member_id,
        Reservation.status == 'PENDING'
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Member already has a pending reservation for this book")

    res = Reservation(
        book_id=data.book_id,
        member_id=data.member_id,
        status="PENDING",
        reservation_date=datetime.utcnow()
    )
    db.add(res)
    db.commit()
    db.refresh(res)

    # Queue position
    pending_count = db.query(Reservation).filter(
        Reservation.book_id == data.book_id,
        Reservation.status == 'PENDING',
        Reservation.reservation_date <= res.reservation_date
    ).count()

    return ReservationResponse(
        reservation_id=res.reservation_id,
        book_id=res.book_id,
        member_id=res.member_id,
        reservation_date=res.reservation_date,
        status=res.status,
        book_title=book.title,
        member_name=member.name,
        queue_position=pending_count
    )

@router.put("/{reservation_id}", response_model=ReservationResponse)
def update_reservation(reservation_id: int, data: ReservationUpdate, db: Session = Depends(get_db)):
    res = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")

    res.status = data.status.upper()
    db.commit()
    db.refresh(res)

    return ReservationResponse(
        reservation_id=res.reservation_id,
        book_id=res.book_id,
        member_id=res.member_id,
        reservation_date=res.reservation_date,
        status=res.status,
        book_title=res.book.title if res.book else None,
        member_name=res.member.name if res.member else None
    )

@router.delete("/{reservation_id}")
def delete_reservation(reservation_id: int, db: Session = Depends(get_db)):
    res = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    db.delete(res)
    db.commit()
    return {"message": "Reservation deleted successfully"}

