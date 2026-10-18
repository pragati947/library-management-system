from typing import List, Dict, Any
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case, text

from ..models.models import (
    Book, BookCopy, BorrowTransaction, Reservation,
    Rating, Genre, Author, Member, Publisher, book_authors
)

def get_most_borrowed_books(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Report: Top borrowed books with checkout count and average rating."""
    query = db.query(
        Book.book_id,
        Book.title,
        Book.isbn,
        Genre.genre_name,
        func.count(BorrowTransaction.transaction_id).label("borrow_count"),
        func.round(func.coalesce(func.avg(Rating.rating), 0), 1).label("avg_rating")
    ).join(BookCopy, Book.book_id == BookCopy.book_id)\
     .join(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id)\
     .join(Genre, Book.genre_id == Genre.genre_id)\
     .outerjoin(Rating, Book.book_id == Rating.book_id)\
     .group_by(Book.book_id, Book.title, Book.isbn, Genre.genre_name)\
     .having(func.count(BorrowTransaction.transaction_id) > 0)\
     .order_by(desc("borrow_count"))\
     .limit(limit).all()

    return [
        {
            "book_id": r.book_id,
            "title": r.title,
            "isbn": r.isbn,
            "genre": r.genre_name,
            "borrow_count": r.borrow_count,
            "avg_rating": float(r.avg_rating)
        }
        for r in query
    ]

def get_popular_genres(db: Session) -> List[Dict[str, Any]]:
    """Report: Genres ranked by total checkouts and book count."""
    query = db.query(
        Genre.genre_id,
        Genre.genre_name,
        func.count(func.distinct(Book.book_id)).label("total_titles"),
        func.count(BorrowTransaction.transaction_id).label("total_borrows")
    ).outerjoin(Book, Genre.genre_id == Book.genre_id)\
     .outerjoin(BookCopy, Book.book_id == BookCopy.book_id)\
     .outerjoin(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id)\
     .group_by(Genre.genre_id, Genre.genre_name)\
     .order_by(desc("total_borrows"), desc("total_titles")).all()

    return [
        {
            "genre_id": r.genre_id,
            "genre_name": r.genre_name,
            "total_titles": r.total_titles,
            "total_borrows": r.total_borrows
        }
        for r in query
    ]

def get_most_borrowed_authors(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Report: Authors whose books are borrowed the most."""
    query = db.query(
        Author.author_id,
        Author.author_name,
        func.count(BorrowTransaction.transaction_id).label("total_loans")
    ).join(book_authors, Author.author_id == book_authors.c.author_id)\
     .join(Book, book_authors.c.book_id == Book.book_id)\
     .join(BookCopy, Book.book_id == BookCopy.book_id)\
     .join(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id)\
     .group_by(Author.author_id, Author.author_name)\
     .having(func.count(BorrowTransaction.transaction_id) > 0)\
     .order_by(desc("total_loans"))\
     .limit(limit).all()

    return [
        {
            "author_id": r.author_id,
            "author_name": r.author_name,
            "total_loans": r.total_loans
        }
        for r in query
    ]

def get_top_members_by_activity(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Report: Members with highest borrowing activity."""
    query = db.query(
        Member.member_id,
        Member.name,
        Member.email,
        Member.status,
        func.count(BorrowTransaction.transaction_id).label("total_borrowed"),
        func.count(case((BorrowTransaction.return_date == None, 1))).label("currently_active"),
        func.coalesce(func.sum(BorrowTransaction.fine_amount), 0).label("fines_recorded")
    ).join(BorrowTransaction, Member.member_id == BorrowTransaction.member_id)\
     .group_by(Member.member_id, Member.name, Member.email, Member.status)\
     .order_by(desc("total_borrowed"))\
     .limit(limit).all()

    return [
        {
            "member_id": r.member_id,
            "name": r.name,
            "email": r.email,
            "status": r.status,
            "total_borrowed": r.total_borrowed,
            "currently_active": r.currently_active,
            "fines_recorded": float(r.fines_recorded)
        }
        for r in query
    ]

def get_overdue_report(db: Session) -> List[Dict[str, Any]]:
    """Report: Current overdue transactions with days overdue and fine calculation."""
    today = date.today()
    query = db.query(
        BorrowTransaction.transaction_id,
        BorrowTransaction.issue_date,
        BorrowTransaction.due_date,
        Member.member_id,
        Member.name.label("member_name"),
        Member.phone,
        Book.title.label("book_title"),
        BookCopy.barcode
    ).join(Member, BorrowTransaction.member_id == Member.member_id)\
     .join(BookCopy, BorrowTransaction.copy_id == BookCopy.copy_id)\
     .join(Book, BookCopy.book_id == Book.book_id)\
     .filter(BorrowTransaction.return_date == None)\
     .filter(BorrowTransaction.due_date < today)\
     .order_by(BorrowTransaction.due_date).all()

    results = []
    for r in query:
        days = (today - r.due_date).days
        results.append({
            "transaction_id": r.transaction_id,
            "member_id": r.member_id,
            "member_name": r.member_name,
            "phone": r.phone,
            "book_title": r.book_title,
            "barcode": r.barcode or f"Copy #{r.transaction_id}",
            "issue_date": str(r.issue_date),
            "due_date": str(r.due_date),
            "days_overdue": days,
            "projected_fine": days * 5.0
        })
    return results

def get_fines_summary(db: Session) -> Dict[str, Any]:
    """Report: Total fine collection summary."""
    total_fines = db.query(func.coalesce(func.sum(BorrowTransaction.fine_amount), 0.0)).scalar()
    fined_tx_count = db.query(func.count(BorrowTransaction.transaction_id))\
        .filter(BorrowTransaction.fine_amount > 0).scalar()

    recent_fines = db.query(
        BorrowTransaction.transaction_id,
        BorrowTransaction.return_date,
        BorrowTransaction.fine_amount,
        Member.name.label("member_name"),
        Book.title.label("book_title")
    ).join(Member, BorrowTransaction.member_id == Member.member_id)\
     .join(BookCopy, BorrowTransaction.copy_id == BookCopy.copy_id)\
     .join(Book, BookCopy.book_id == Book.book_id)\
     .filter(BorrowTransaction.fine_amount > 0)\
     .order_by(desc(BorrowTransaction.return_date))\
     .limit(10).all()

    return {
        "total_fine_collected": float(total_fines),
        "total_fined_transactions": fined_tx_count,
        "recent_fined_transactions": [
            {
                "transaction_id": f.transaction_id,
                "return_date": str(f.return_date),
                "fine_amount": float(f.fine_amount),
                "member_name": f.member_name,
                "book_title": f.book_title
            }
            for f in recent_fines
        ]
    }

def get_books_never_borrowed(db: Session) -> List[Dict[str, Any]]:
    """Report: Books that have never been checked out (Subquery demonstration)."""
    from sqlalchemy import select
    borrowed_book_ids = select(BookCopy.book_id)\
        .join(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id)\
        .distinct()

    books = db.query(Book, Genre, Publisher)\
        .join(Genre, Book.genre_id == Genre.genre_id)\
        .join(Publisher, Book.publisher_id == Publisher.publisher_id)\
        .filter(Book.book_id.not_in(borrowed_book_ids)).all()

    return [
        {
            "book_id": b.Book.book_id,
            "title": b.Book.title,
            "isbn": b.Book.isbn,
            "genre": b.Genre.genre_name,
            "publisher": b.Publisher.publisher_name,
            "publication_year": b.Book.publication_year,
            "total_copies": len(b.Book.copies)
        }
        for b in books
    ]

def get_top_rated_books(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Report: Top rated books with at least 1 rating."""
    query = db.query(
        Book.book_id,
        Book.title,
        Genre.genre_name,
        func.round(func.avg(Rating.rating), 2).label("avg_rating"),
        func.count(Rating.rating_id).label("total_ratings")
    ).join(Genre, Book.genre_id == Genre.genre_id)\
     .join(Rating, Book.book_id == Rating.book_id)\
     .group_by(Book.book_id, Book.title, Genre.genre_name)\
     .order_by(desc("avg_rating"), desc("total_ratings"))\
     .limit(limit).all()

    return [
        {
            "book_id": r.book_id,
            "title": r.title,
            "genre": r.genre_name,
            "avg_rating": float(r.avg_rating),
            "total_ratings": r.total_ratings
        }
        for r in query
    ]

def get_reservation_stats(db: Session) -> Dict[str, Any]:
    """Report: Reservation statuses and most reserved books."""
    counts = db.query(
        Reservation.status,
        func.count(Reservation.reservation_id)
    ).group_by(Reservation.status).all()

    status_dict = {status: count for status, count in counts}

    top_reserved = db.query(
        Book.book_id,
        Book.title,
        func.count(Reservation.reservation_id).label("res_count")
    ).join(Reservation, Book.book_id == Reservation.book_id)\
     .group_by(Book.book_id, Book.title)\
     .order_by(desc("res_count"))\
     .limit(5).all()

    return {
        "pending": status_dict.get("PENDING", 0),
        "fulfilled": status_dict.get("FULFILLED", 0),
        "cancelled": status_dict.get("CANCELLED", 0),
        "total": sum(status_dict.values()),
        "top_reserved_books": [
            {"book_id": r.book_id, "title": r.title, "reservations": r.res_count}
            for r in top_reserved
        ]
    }

