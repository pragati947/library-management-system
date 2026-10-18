from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database.connection import get_db
from ..models.models import Author, book_authors
from ..schemas.schemas import AuthorCreate, AuthorUpdate, AuthorResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/authors", tags=["Authors"], dependencies=[Depends(get_current_librarian)])

@router.get("", response_model=List[AuthorResponse])
def get_authors(db: Session = Depends(get_db)):
    return db.query(Author).order_by(Author.author_name).all()

@router.post("", response_model=AuthorResponse, status_code=status.HTTP_201_CREATED)
def create_author(data: AuthorCreate, db: Session = Depends(get_db)):
    existing = db.query(Author).filter(Author.author_name == data.author_name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Author already exists")
    author = Author(author_name=data.author_name.strip())
    db.add(author)
    db.commit()
    db.refresh(author)
    return author

@router.put("/{author_id}", response_model=AuthorResponse)
def update_author(author_id: int, data: AuthorUpdate, db: Session = Depends(get_db)):
    author = db.query(Author).filter(Author.author_id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    author.author_name = data.author_name.strip()
    db.commit()
    db.refresh(author)
    return author

@router.delete("/{author_id}")
def delete_author(author_id: int, db: Session = Depends(get_db)):
    author = db.query(Author).filter(Author.author_id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    db.delete(author)
    db.commit()
    return {"message": "Author deleted successfully"}

