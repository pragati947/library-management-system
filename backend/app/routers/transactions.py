import os
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.connection import get_db
from ..models.models import BorrowTransaction, BookCopy, Member, Librarian, Book
from ..schemas.schemas import IssueBookRequest, ReturnBookRequest, TransactionResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/transactions", tags=["Borrow Transactions"], dependencies=[Depends(get_current_librarian)])

DEFAULT_FINE_RATE = float(os.getenv("DEFAULT_DAILY_FINE_RATE", "5.00"))


def serialize_tx(t: BorrowTransaction) -> TransactionResponse:
    today = date.today()
    is_od = (t.return_date is None and t.due_date < today)
    days_od = (today - t.due_date).days if is_od else 0

    return TransactionResponse(
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
    )


@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    member_id: Optional[int] = Query(None, description="Filter by member ID"),
    copy_id: Optional[int] = Query(None, description="Filter by copy ID"),
    status: Optional[str] = Query(None, description="ACTIVE (unreturned) or RETURNED"),
    is_overdue: Optional[bool] = Query(None, description="Filter overdue only"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(BorrowTransaction)

    if member_id:
        query = query.filter(BorrowTransaction.member_id == member_id)
    if copy_id:
        query = query.filter(BorrowTransaction.copy_id == copy_id)
    if status:
        if status.upper() == "ACTIVE":
            query = query.filter(BorrowTransaction.return_date == None)
        elif status.upper() == "RETURNED":
            query = query.filter(BorrowTransaction.return_date != None)

    if is_overdue:
        query = query.filter(
            BorrowTransaction.return_date == None,
            BorrowTransaction.due_date < date.today()
        )

    txs = query.order_by(desc(BorrowTransaction.issue_date)).offset(skip).limit(limit).all()
    return [serialize_tx(t) for t in txs]


@router.get("/overdue", response_model=List[TransactionResponse])
def get_overdue_transactions(db: Session = Depends(get_db)):
    txs = db.query(BorrowTransaction).filter(
        BorrowTransaction.return_date == None,
        BorrowTransaction.due_date < date.today()
    ).order_by(BorrowTransaction.due_date).all()

    return [serialize_tx(t) for t in txs]


@router.post("/issue", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def issue_book(
    data: IssueBookRequest,
    current_librarian: Librarian = Depends(get_current_librarian),
    db: Session = Depends(get_db)
):
    # 1. Validate Member
    member = db.query(Member).filter(Member.member_id == data.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot issue book to member with status '{member.status}'. Only ACTIVE members are permitted."
        )

    # 2. Validate Copy
    copy = db.query(BookCopy).filter(BookCopy.copy_id == data.copy_id).first()
    if not copy:
        raise HTTPException(status_code=404, detail="Book copy not found")

    if copy.status != "AVAILABLE":
        raise HTTPException(
            status_code=400,
            detail=f"This book copy is currently '{copy.status}' and cannot be issued."
        )

    # 3. Compute Dates
    issue_date = data.issue_date or date.today()
    due_days = data.due_days if data.due_days and data.due_days > 0 else 14
    due_date = issue_date + timedelta(days=due_days)

    # 4. Create Transaction
    tx = BorrowTransaction(
        copy_id=copy.copy_id,
        member_id=member.member_id,
        librarian_id=current_librarian.librarian_id,
        issue_date=issue_date,
        due_date=due_date,
        fine_amount=0.00
    )

    # 5. Update Copy Status to ISSUED
    copy.status = "ISSUED"

    db.add(tx)
    db.commit()
    db.refresh(tx)

    return serialize_tx(tx)


@router.post("/return", response_model=TransactionResponse)
def return_book(
    data: ReturnBookRequest,
    db: Session = Depends(get_db)
):
    tx = db.query(BorrowTransaction).filter(BorrowTransaction.transaction_id == data.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.return_date is not None:
        raise HTTPException(
            status_code=400,
            detail=f"This book was already returned on {tx.return_date}."
        )

    return_date = date.today()
    tx.return_date = return_date

    # Calculate fine
    fine_rate = data.fine_rate if data.fine_rate is not None else DEFAULT_FINE_RATE
    fine_amount = 0.00
    if return_date > tx.due_date:
        days_overdue = (return_date - tx.due_date).days
        fine_amount = round(days_overdue * fine_rate, 2)

    tx.fine_amount = fine_amount

    # Update Copy Status to AVAILABLE
    if tx.copy:
        tx.copy.status = "AVAILABLE"

    db.commit()
    db.refresh(tx)

    return serialize_tx(tx)

