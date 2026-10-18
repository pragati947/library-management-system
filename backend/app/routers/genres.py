from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Genre
from ..schemas.schemas import GenreCreate, GenreUpdate, GenreResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/genres", tags=["Genres"], dependencies=[Depends(get_current_librarian)])

@router.get("", response_model=List[GenreResponse])
def get_genres(db: Session = Depends(get_db)):
    return db.query(Genre).order_by(Genre.genre_name).all()

@router.post("", response_model=GenreResponse, status_code=status.HTTP_201_CREATED)
def create_genre(data: GenreCreate, db: Session = Depends(get_db)):
    existing = db.query(Genre).filter(Genre.genre_name == data.genre_name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Genre already exists")
    genre = Genre(genre_name=data.genre_name.strip())
    db.add(genre)
    db.commit()
    db.refresh(genre)
    return genre

@router.put("/{genre_id}", response_model=GenreResponse)
def update_genre(genre_id: int, data: GenreUpdate, db: Session = Depends(get_db)):
    genre = db.query(Genre).filter(Genre.genre_id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    genre.genre_name = data.genre_name.strip()
    db.commit()
    db.refresh(genre)
    return genre

@router.delete("/{genre_id}")
def delete_genre(genre_id: int, db: Session = Depends(get_db)):
    genre = db.query(Genre).filter(Genre.genre_id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    db.delete(genre)
    db.commit()
    return {"message": "Genre deleted successfully"}

