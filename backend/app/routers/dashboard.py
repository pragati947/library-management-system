from fastapi import APIRouter, Depends
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case

from ..database.connection import get_db, get_db_status
from ..models.models import (
    Book, BookCopy, Member, BorrowTransaction, Reservation,
    Rating, Genre, Author, book_authors
)
from ..schemas.schemas import DashboardStatsResponse, DashboardChartsResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_librarian)])

@router.get("/statistics", response_model=DashboardStatsResponse)
def get_dashboard_statistics(db: Session = Depends(get_db)):
    today = date.today()

    total_books = db.query(func.count(Book.book_id)).scalar() or 0
    total_copies = db.query(func.count(BookCopy.copy_id)).scalar() or 0
    avail_copies = db.query(func.count(BookCopy.copy_id)).filter(BookCopy.status == 'AVAILABLE').scalar() or 0
    issued_copies = db.query(func.count(BookCopy.copy_id)).filter(BookCopy.status == 'ISSUED').scalar() or 0

    total_members = db.query(func.count(Member.member_id)).scalar() or 0
    active_members = db.query(func.count(Member.member_id)).filter(Member.status == 'ACTIVE').scalar() or 0

    currently_issued = db.query(func.count(BorrowTransaction.transaction_id)).filter(
        BorrowTransaction.return_date == None
    ).scalar() or 0

    overdue_books = db.query(func.count(BorrowTransaction.transaction_id)).filter(
        BorrowTransaction.return_date == None,
        BorrowTransaction.due_date < today
    ).scalar() or 0

    total_reservations = db.query(func.count(Reservation.reservation_id)).scalar() or 0
    pending_reservations = db.query(func.count(Reservation.reservation_id)).filter(
        Reservation.status == 'PENDING'
    ).scalar() or 0

    total_fines = db.query(func.coalesce(func.sum(BorrowTransaction.fine_amount), 0.0)).scalar() or 0.0

    return DashboardStatsResponse(
        total_books=total_books,
        total_book_copies=total_copies,
        available_copies=avail_copies,
        issued_copies=issued_copies,
        total_members=total_members,
        active_members=active_members,
        currently_issued_books=currently_issued,
        overdue_books=overdue_books,
        total_reservations=total_reservations,
        pending_reservations=pending_reservations,
        total_fines=float(total_fines),
        database_status=get_db_status()
    )


@router.get("/charts", response_model=DashboardChartsResponse)
def get_dashboard_charts(db: Session = Depends(get_db)):
    # 1. Books by Genre
    books_by_genre_raw = db.query(
        Genre.genre_name,
        func.count(Book.book_id).label("book_count")
    ).outerjoin(Book, Genre.genre_id == Book.genre_id)\
     .group_by(Genre.genre_name)\
     .order_by(desc("book_count")).all()

    books_by_genre = [
        {"genre": r.genre_name, "count": r.book_count}
        for r in books_by_genre_raw
    ]

    # 2. Most Borrowed Books
    most_borrowed_raw = db.query(
        Book.title,
        func.count(BorrowTransaction.transaction_id).label("borrow_count")
    ).join(BookCopy, Book.book_id == BookCopy.book_id)\
     .join(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id)\
     .group_by(Book.book_id, Book.title)\
     .order_by(desc("borrow_count"))\
     .limit(6).all()

    most_borrowed_books = [
        {"title": r.title[:25] + ("..." if len(r.title) > 25 else ""), "full_title": r.title, "count": r.borrow_count}
        for r in most_borrowed_raw
    ]

    # 3. Popular Authors
    popular_authors_raw = db.query(
        Author.author_name,
        func.count(BorrowTransaction.transaction_id).label("loan_count")
    ).join(book_authors, Author.author_id == book_authors.c.author_id)\
     .join(Book, book_authors.c.book_id == Book.book_id)\
     .join(BookCopy, Book.book_id == BookCopy.book_id)\
     .join(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id)\
     .group_by(Author.author_id, Author.author_name)\
     .order_by(desc("loan_count"))\
     .limit(6).all()

    popular_authors = [
        {"author": r.author_name, "loans": r.loan_count}
        for r in popular_authors_raw
    ]

    # 4. Monthly Borrowing Trends (Group by Month of issue_date)
    # Compatible across SQLite and MySQL
    all_dates = db.query(BorrowTransaction.issue_date).all()
    month_counts = {}
    for (d,) in all_dates:
        if d:
            m_key = d.strftime("%b %Y")
            month_counts[m_key] = month_counts.get(m_key, 0) + 1

    monthly_trends = [
        {"month": k, "borrows": v}
        for k, v in list(month_counts.items())[-6:]
    ]
    if not monthly_trends:
        monthly_trends = [{"month": "Current", "borrows": len(all_dates)}]

    # 5. Ratings Distribution (1 to 5 stars)
    rating_counts_raw = db.query(
        Rating.rating,
        func.count(Rating.rating_id).label("count")
    ).group_by(Rating.rating).all()

    ratings_map = {r.rating: r.count for r in rating_counts_raw}
    ratings_distribution = [
        {"stars": f"{star} Star{'s' if star > 1 else ''}", "count": ratings_map.get(star, 0)}
        for star in range(5, 0, -1)
    ]

    return DashboardChartsResponse(
        books_by_genre=books_by_genre,
        most_borrowed_books=most_borrowed_books,
        popular_authors=popular_authors,
        monthly_borrowing_trends=monthly_trends,
        ratings_distribution=ratings_distribution
    )

