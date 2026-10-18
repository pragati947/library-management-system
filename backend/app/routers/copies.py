from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import BookCopy, Book, BorrowTransaction
from ..schemas.schemas import CopyCreate, CopyUpdate, CopyResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/copies", tags=["Book Copies"], dependencies=[Depends(get_current_librarian)])

@router.get("", response_model=List[CopyResponse])
def get_copies(
    book_id: Optional[int] = Query(None, description="Filter by book ID"),
    status: Optional[str] = Query(None, description="Filter by status: AVAILABLE, ISSUED, MAINTENANCE, LOST"),
    db: Session = Depends(get_db)
):
    query = db.query(BookCopy)
    if book_id:
        query = query.filter(BookCopy.book_id == book_id)
    if status:
        query = query.filter(BookCopy.status == status.upper())

    copies = query.order_by(BookCopy.copy_id).all()
    return [
        CopyResponse(
            copy_id=c.copy_id,
            book_id=c.book_id,
            status=c.status,
            barcode=c.barcode,
            added_date=c.added_date,
            book_title=c.book.title if c.book else None,
            isbn=c.book.isbn if c.book else None
        )
        for c in copies
    ]

@router.post("", response_model=CopyResponse, status_code=status.HTTP_201_CREATED)
def create_copy(data: CopyCreate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.book_id == data.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    barcode = data.barcode
    if not barcode:
        existing_count = db.query(BookCopy).filter(BookCopy.book_id == data.book_id).count()
        char_suffix = chr(65 + (existing_count % 26))
        barcode = f"BC-{data.book_id:03d}-{char_suffix}"

    copy = BookCopy(
        book_id=data.book_id,
        status=data.status.upper() if data.status else "AVAILABLE",
        barcode=barcode,
        added_date=data.added_date or date.today()
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)

    return CopyResponse(
        copy_id=copy.copy_id,
        book_id=copy.book_id,
        status=copy.status,
        barcode=copy.barcode,
        added_date=copy.added_date,
        book_title=book.title,
        isbn=book.isbn
    )

@router.put("/{copy_id}", response_model=CopyResponse)
def update_copy(copy_id: int, data: CopyUpdate, db: Session = Depends(get_db)):
    copy = db.query(BookCopy).filter(BookCopy.copy_id == copy_id).first()
    if not copy:
        raise HTTPException(status_code=404, detail="Copy not found")

    if data.status:
        copy.status = data.status.upper()
    if data.barcode:
        copy.barcode = data.barcode

    db.commit()
    db.refresh(copy)

    return CopyResponse(
        copy_id=copy.copy_id,
        book_id=copy.book_id,
        status=copy.status,
        barcode=copy.barcode,
        added_date=copy.added_date,
        book_title=copy.book.title if copy.book else None,
        isbn=copy.book.isbn if copy.book else None
    )

@router.delete("/{copy_id}")
def delete_copy(copy_id: int, db: Session = Depends(get_db)):
    copy = db.query(BookCopy).filter(BookCopy.copy_id == copy_id).first()
    if not copy:
        raise HTTPException(status_code=404, detail="Copy not found")

    if copy.status == "ISSUED":
        raise HTTPException(status_code=400, detail="Cannot delete a copy that is currently ISSUED")

    db.delete(copy)
    db.commit()
    return {"message": "Book copy deleted successfully"}

