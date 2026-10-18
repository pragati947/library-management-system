from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from ..database.connection import get_db
from ..models.models import (
    Member, Genre, BorrowTransaction, Reservation, Rating,
    BookCopy, Book, Author, book_authors
)
from ..schemas.schemas import (
    MemberCreate, MemberUpdate, MemberResponse,
    MemberProfileResponse, TransactionResponse,
    ReservationResponse, RatingResponse, GenreResponse,
    RecommendationItem
)
from ..auth.jwt import get_current_librarian
from ..services.recommendation_service import get_personalized_recommendations

router = APIRouter(prefix="/members", tags=["Members"], dependencies=[Depends(get_current_librarian)])


@router.get("", response_model=List[MemberResponse])
def get_members(
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, SUSPENDED, EXPIRED"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Member)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Member.name.ilike(s),
                Member.email.ilike(s),
                Member.phone.ilike(s)
            )
        )

    if status:
        query = query.filter(Member.status == status.upper())

    members = query.order_by(Member.name).offset(skip).limit(limit).all()

    results = []
    for m in members:
        # compute active loans and overdue count
        active_count = db.query(BorrowTransaction).filter(
            BorrowTransaction.member_id == m.member_id,
            BorrowTransaction.return_date == None
        ).count()
        overdue_count = db.query(BorrowTransaction).filter(
            BorrowTransaction.member_id == m.member_id,
            BorrowTransaction.return_date == None,
            BorrowTransaction.due_date < date.today()
        ).count()

        results.append(MemberResponse(
            member_id=m.member_id,
            name=m.name,
            email=m.email,
            phone=m.phone,
            status=m.status,
            join_date=m.join_date,
            preferred_genres=[GenreResponse.model_validate(g) for g in m.preferred_genres],
            active_borrows_count=active_count,
            overdue_count=overdue_count
        ))

    return results


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    active_count = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member.member_id,
        BorrowTransaction.return_date == None
    ).count()
    overdue_count = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member.member_id,
        BorrowTransaction.return_date == None,
        BorrowTransaction.due_date < date.today()
    ).count()

    return MemberResponse(
        member_id=member.member_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        status=member.status,
        join_date=member.join_date,
        preferred_genres=[GenreResponse.model_validate(g) for g in member.preferred_genres],
        active_borrows_count=active_count,
        overdue_count=overdue_count
    )


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def create_member(data: MemberCreate, db: Session = Depends(get_db)):
    existing = db.query(Member).filter(Member.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A member with this email already exists")

    new_member = Member(
        name=data.name.strip(),
        email=data.email.strip().lower(),
        phone=data.phone.strip(),
        status=data.status.upper() if data.status else "ACTIVE",
        join_date=date.today()
    )

    if data.preferred_genre_ids:
        genres = db.query(Genre).filter(Genre.genre_id.in_(data.preferred_genre_ids)).all()
        new_member.preferred_genres = genres

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return MemberResponse(
        member_id=new_member.member_id,
        name=new_member.name,
        email=new_member.email,
        phone=new_member.phone,
        status=new_member.status,
        join_date=new_member.join_date,
        preferred_genres=[GenreResponse.model_validate(g) for g in new_member.preferred_genres],
        active_borrows_count=0,
        overdue_count=0
    )


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.email and data.email != member.email:
        existing = db.query(Member).filter(Member.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already used by another member")
        member.email = data.email.strip().lower()

    if data.name:
        member.name = data.name.strip()
    if data.phone:
        member.phone = data.phone.strip()
    if data.status:
        member.status = data.status.upper()

    if data.preferred_genre_ids is not None:
        genres = db.query(Genre).filter(Genre.genre_id.in_(data.preferred_genre_ids)).all()
        member.preferred_genres = genres

    db.commit()
    db.refresh(member)

    active_count = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member.member_id,
        BorrowTransaction.return_date == None
    ).count()
    overdue_count = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member.member_id,
        BorrowTransaction.return_date == None,
        BorrowTransaction.due_date < date.today()
    ).count()

    return MemberResponse(
        member_id=member.member_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        status=member.status,
        join_date=member.join_date,
        preferred_genres=[GenreResponse.model_validate(g) for g in member.preferred_genres],
        active_borrows_count=active_count,
        overdue_count=overdue_count
    )


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Check active loans
    active_loans = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member_id,
        BorrowTransaction.return_date == None
    ).count()

    if active_loans > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete member: {active_loans} book copy(s) are currently checked out. Return all books first."
        )

    db.delete(member)
    db.commit()
    return {"message": f"Member '{member.name}' deleted successfully"}


@router.get("/{member_id}/borrow-history", response_model=List[TransactionResponse])
def get_member_borrow_history(member_id: int, db: Session = Depends(get_db)):
    transactions = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member_id
    ).order_by(desc(BorrowTransaction.issue_date)).all()

    today = date.today()
    results = []
    for t in transactions:
        is_od = (t.return_date is None and t.due_date < today)
        days_od = (today - t.due_date).days if is_od else 0
        results.append(TransactionResponse(
            transaction_id=t.transaction_id,
            copy_id=t.copy_id,
            member_id=t.member_id,
            librarian_id=t.librarian_id,
            issue_date=t.issue_date,
            due_date=t.due_date,
            return_date=t.return_date,
            fine_amount=float(t.fine_amount),
            book_id=t.copy.book_id if t.copy else None,
            book_title=t.copy.book.title if (t.copy and t.copy.book) else None,
            barcode=t.copy.barcode if t.copy else None,
            member_name=t.member.name if t.member else None,
            is_overdue=is_od,
            days_overdue=days_od
        ))
    return results


@router.get("/{member_id}/reservations", response_model=List[ReservationResponse])
def get_member_reservations(member_id: int, db: Session = Depends(get_db)):
    reservations = db.query(Reservation).filter(
        Reservation.member_id == member_id
    ).order_by(desc(Reservation.reservation_date)).all()

    results = []
    for r in reservations:
        results.append(ReservationResponse(
            reservation_id=r.reservation_id,
            book_id=r.book_id,
            member_id=r.member_id,
            reservation_date=r.reservation_date,
            status=r.status,
            book_title=r.book.title if r.book else None,
            member_name=r.member.name if r.member else None
        ))
    return results


@router.get("/{member_id}/ratings", response_model=List[RatingResponse])
def get_member_ratings(member_id: int, db: Session = Depends(get_db)):
    ratings = db.query(Rating).filter(
        Rating.member_id == member_id
    ).order_by(desc(Rating.rating_date)).all()

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


@router.get("/{member_id}/preferences", response_model=List[GenreResponse])
def get_member_preferences(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return [GenreResponse.model_validate(g) for g in member.preferred_genres]


@router.put("/{member_id}/preferences", response_model=List[GenreResponse])
def update_member_preferences(member_id: int, genre_ids: List[int], db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    genres = db.query(Genre).filter(Genre.genre_id.in_(genre_ids)).all()
    member.preferred_genres = genres
    db.commit()
    db.refresh(member)
    return [GenreResponse.model_validate(g) for g in member.preferred_genres]


@router.get("/{member_id}/recommendations", response_model=List[RecommendationItem])
def get_member_recommendations_endpoint(
    member_id: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return get_personalized_recommendations(member_id=member_id, db=db, limit=limit)


@router.get("/{member_id}/profile", response_model=MemberProfileResponse)
def get_member_full_profile(member_id: int, db: Session = Depends(get_db)):
    """
    Dedicated high-efficiency endpoint for the 'Member Profile' page.
    Returns: Member Details, Preferred Genres, Current Borrows, Borrow History,
    Frequently Borrowed Authors, Ratings, Reservations, and Personalized Recommendations.
    """
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    today = date.today()
    all_txs = db.query(BorrowTransaction).filter(
        BorrowTransaction.member_id == member_id
    ).order_by(desc(BorrowTransaction.issue_date)).all()

    current_borrows = []
    borrow_history = []
    total_fines = 0.0
    author_counts = {}

    for t in all_txs:
        is_od = (t.return_date is None and t.due_date < today)
        days_od = (today - t.due_date).days if is_od else 0
        total_fines += float(t.fine_amount)

        b_item = TransactionResponse(
            transaction_id=t.transaction_id,
            copy_id=t.copy_id,
            member_id=t.member_id,
            librarian_id=t.librarian_id,
            issue_date=t.issue_date,
            due_date=t.due_date,
            return_date=t.return_date,
            fine_amount=float(t.fine_amount),
            book_id=t.copy.book_id if t.copy else None,
            book_title=t.copy.book.title if (t.copy and t.copy.book) else None,
            barcode=t.copy.barcode if t.copy else None,
            member_name=member.name,
            is_overdue=is_od,
            days_overdue=days_od
        )

        if t.return_date is None:
            current_borrows.append(b_item)
        else:
            borrow_history.append(b_item)

        if t.copy and t.copy.book:
            for auth in t.copy.book.authors:
                author_counts[auth.author_name] = author_counts.get(auth.author_name, 0) + 1

    sorted_authors = [
        {"author_name": name, "borrow_count": count}
        for name, count in sorted(author_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    res_list = db.query(Reservation).filter(
        Reservation.member_id == member_id
    ).order_by(desc(Reservation.reservation_date)).all()
    reservations = [
        ReservationResponse(
            reservation_id=r.reservation_id,
            book_id=r.book_id,
            member_id=r.member_id,
            reservation_date=r.reservation_date,
            status=r.status,
            book_title=r.book.title if r.book else None,
            member_name=member.name
        )
        for r in res_list
    ]

    ratings_list = db.query(Rating).filter(
        Rating.member_id == member_id
    ).order_by(desc(Rating.rating_date)).all()
    ratings = [
        RatingResponse(
            rating_id=r.rating_id,
            member_id=r.member_id,
            book_id=r.book_id,
            rating=r.rating,
            rating_date=r.rating_date,
            book_title=r.book.title if r.book else None,
            member_name=member.name
        )
        for r in ratings_list
    ]

    recommendations = get_personalized_recommendations(member_id=member_id, db=db, limit=8)

    stats = {
        "total_borrowed": len(all_txs),
        "currently_issued": len(current_borrows),
        "total_overdue": sum(1 for c in current_borrows if c.is_overdue),
        "total_fines_paid": round(total_fines, 2),
        "total_ratings": len(ratings),
        "total_reservations": len(reservations)
    }

    member_resp = MemberResponse(
        member_id=member.member_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        status=member.status,
        join_date=member.join_date,
        preferred_genres=[GenreResponse.model_validate(g) for g in member.preferred_genres],
        active_borrows_count=len(current_borrows),
        overdue_count=stats["total_overdue"]
    )

    return MemberProfileResponse(
        member=member_resp,
        preferred_genres=[GenreResponse.model_validate(g) for g in member.preferred_genres],
        current_borrows=current_borrows,
        borrow_history=borrow_history,
        reservations=reservations,
        ratings=ratings,
        frequently_borrowed_authors=sorted_authors[:5],
        stats=stats,
        recommendations=recommendations
    )

