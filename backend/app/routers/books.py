from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from ..database.connection import get_db
from ..models.models import Book, BookCopy, Author, Publisher, Genre, Rating, BorrowTransaction
from ..schemas.schemas import (
    BookCreate, BookUpdate, BookResponse, AuthorResponse,
    PublisherResponse, GenreResponse, CopyResponse
)
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/books", tags=["Books"], dependencies=[Depends(get_current_librarian)])


def serialize_book(b: Book, db: Session) -> BookResponse:
    total_copies = len(b.copies)
    avail_copies = sum(1 for c in b.copies if c.status == 'AVAILABLE')
    issued_copies = sum(1 for c in b.copies if c.status == 'ISSUED')

    ratings_data = db.query(
        func.coalesce(func.avg(Rating.rating), 0.0).label("avg_rating"),
        func.count(Rating.rating_id).label("rating_count")
    ).filter(Rating.book_id == b.book_id).first()

    return BookResponse(
        book_id=b.book_id,
        title=b.title,
        isbn=b.isbn,
        publisher_id=b.publisher_id,
        publication_year=b.publication_year,
        genre_id=b.genre_id,
        genre=GenreResponse.model_validate(b.genre) if b.genre else None,
        publisher=PublisherResponse.model_validate(b.publisher) if b.publisher else None,
        authors=[AuthorResponse.model_validate(a) for a in b.authors],
        total_copies=total_copies,
        available_copies=avail_copies,
        issued_copies=issued_copies,
        average_rating=round(float(ratings_data.avg_rating), 1) if ratings_data else 0.0,
        total_ratings=ratings_data.rating_count if ratings_data else 0
    )


@router.get("", response_model=List[BookResponse])
def get_books(
    search: Optional[str] = Query(None, description="Search by title or ISBN"),
    genre_id: Optional[int] = Query(None, description="Filter by Genre ID"),
    author_id: Optional[int] = Query(None, description="Filter by Author ID"),
    publisher_id: Optional[int] = Query(None, description="Filter by Publisher ID"),
    only_available: Optional[bool] = Query(False, description="Filter only books with available copies"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Book)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(Book.title.ilike(s), Book.isbn.ilike(s)))

    if genre_id:
        query = query.filter(Book.genre_id == genre_id)

    if publisher_id:
        query = query.filter(Book.publisher_id == publisher_id)

    if author_id:
        query = query.filter(Book.authors.any(Author.author_id == author_id))

    books = query.order_by(Book.title).offset(skip).limit(limit).all()

    results = []
    for b in books:
        resp = serialize_book(b, db)
        if only_available and resp.available_copies == 0:
            continue
        results.append(resp)

    return results


@router.get("/{book_id}")
def get_book_details(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book_summary = serialize_book(book, db)

    copies = [
        CopyResponse(
            copy_id=c.copy_id,
            book_id=c.book_id,
            status=c.status,
            barcode=c.barcode,
            added_date=c.added_date,
            book_title=book.title,
            isbn=book.isbn
        )
        for c in book.copies
    ]

    return {
        "book": book_summary,
        "copies": copies
    }


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(data: BookCreate, db: Session = Depends(get_db)):
    existing = db.query(Book).filter(Book.isbn == data.isbn.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A book with this ISBN already exists")

    publisher = db.query(Publisher).filter(Publisher.publisher_id == data.publisher_id).first()
    if not publisher:
        raise HTTPException(status_code=400, detail="Invalid publisher_id")

    genre = db.query(Genre).filter(Genre.genre_id == data.genre_id).first()
    if not genre:
        raise HTTPException(status_code=400, detail="Invalid genre_id")

    new_book = Book(
        title=data.title.strip(),
        isbn=data.isbn.strip(),
        publisher_id=data.publisher_id,
        publication_year=data.publication_year,
        genre_id=data.genre_id
    )

    if data.author_ids:
        authors = db.query(Author).filter(Author.author_id.in_(data.author_ids)).all()
        new_book.authors = authors

    db.add(new_book)
    db.commit()
    db.refresh(new_book)

    # Automatically create 1 initial physical copy for convenience
    default_copy = BookCopy(
        book_id=new_book.book_id,
        status="AVAILABLE",
        barcode=f"BC-{new_book.book_id:03d}-A"
    )
    db.add(default_copy)
    db.commit()
    db.refresh(new_book)

    return serialize_book(new_book, db)


@router.put("/{book_id}", response_model=BookResponse)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if data.isbn and data.isbn.strip() != book.isbn:
        existing = db.query(Book).filter(Book.isbn == data.isbn.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="A book with this ISBN already exists")
        book.isbn = data.isbn.strip()

    if data.title:
        book.title = data.title.strip()
    if data.publication_year:
        book.publication_year = data.publication_year
    if data.publisher_id:
        book.publisher_id = data.publisher_id
    if data.genre_id:
        book.genre_id = data.genre_id

    if data.author_ids is not None:
        authors = db.query(Author).filter(Author.author_id.in_(data.author_ids)).all()
        book.authors = authors

    db.commit()
    db.refresh(book)
    return serialize_book(book, db)


@router.delete("/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check if any copies are currently issued
    active_borrows = db.query(BorrowTransaction).join(
        BookCopy, BorrowTransaction.copy_id == BookCopy.copy_id
    ).filter(
        BookCopy.book_id == book_id,
        BorrowTransaction.return_date == None
    ).count()

    if active_borrows > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete book: {active_borrows} physical copies are currently checked out."
        )

    db.delete(book)
    db.commit()
    return {"message": f"Book '{book.title}' and associated copies deleted successfully"}

