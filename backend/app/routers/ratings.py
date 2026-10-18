from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.connection import get_db
from ..models.models import Rating, Book, Member
from ..schemas.schemas import RatingCreate, RatingResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/ratings", tags=["Ratings"], dependencies=[Depends(get_current_librarian)])

@router.get("", response_model=List[RatingResponse])
def get_ratings(
    book_id: Optional[int] = Query(None, description="Filter by book ID"),
    member_id: Optional[int] = Query(None, description="Filter by member ID"),
    db: Session = Depends(get_db)
):
    query = db.query(Rating)
    if book_id:
        query = query.filter(Rating.book_id == book_id)
    if member_id:
        query = query.filter(Rating.member_id == member_id)

    ratings = query.order_by(desc(Rating.rating_date)).all()
    return [
        RatingResponse(
            rating_id=r.rating_id,
            member_id=r.member_id,
            book_id=r.book_id,
            rating=r.rating,
            rating_date=r.rating_date,
            book_title=r.book.title if r.book else None,
            member_name=r.member.name if r.member else None
        )
        for r in ratings
    ]

@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def submit_rating(data: RatingCreate, db: Session = Depends(get_db)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    book = db.query(Book).filter(Book.book_id == data.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    member = db.query(Member).filter(Member.member_id == data.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    existing = db.query(Rating).filter(
        Rating.member_id == data.member_id,
        Rating.book_id == data.book_id
    ).first()

    if existing:
        # Update existing rating
        existing.rating = data.rating
        existing.rating_date = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        new_rating = Rating(
            member_id=data.member_id,
            book_id=data.book_id,
            rating=data.rating,
            rating_date=datetime.utcnow()
        )
        db.add(new_rating)
        db.commit()
        db.refresh(new_rating)
        target = new_rating

    return RatingResponse(
        rating_id=target.rating_id,
        member_id=target.member_id,
        book_id=target.book_id,
        rating=target.rating,
        rating_date=target.rating_date,
        book_title=book.title,
        member_name=member.name
    )

@router.delete("/{rating_id}")
def delete_rating(rating_id: int, db: Session = Depends(get_db)):
    rating = db.query(Rating).filter(Rating.rating_id == rating_id).first()
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    db.delete(rating)
    db.commit()
    return {"message": "Rating removed successfully"}

