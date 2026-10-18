from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Publisher
from ..schemas.schemas import PublisherCreate, PublisherUpdate, PublisherResponse
from ..auth.jwt import get_current_librarian

router = APIRouter(prefix="/publishers", tags=["Publishers"], dependencies=[Depends(get_current_librarian)])

@router.get("", response_model=List[PublisherResponse])
def get_publishers(db: Session = Depends(get_db)):
    return db.query(Publisher).order_by(Publisher.publisher_name).all()

@router.post("", response_model=PublisherResponse, status_code=status.HTTP_201_CREATED)
def create_publisher(data: PublisherCreate, db: Session = Depends(get_db)):
    existing = db.query(Publisher).filter(Publisher.publisher_name == data.publisher_name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Publisher already exists")
    publisher = Publisher(
        publisher_name=data.publisher_name.strip(),
        city=data.city.strip() if data.city else None
    )
    db.add(publisher)
    db.commit()
    db.refresh(publisher)
    return publisher

@router.put("/{publisher_id}", response_model=PublisherResponse)
def update_publisher(publisher_id: int, data: PublisherUpdate, db: Session = Depends(get_db)):
    publisher = db.query(Publisher).filter(Publisher.publisher_id == publisher_id).first()
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    publisher.publisher_name = data.publisher_name.strip()
    publisher.city = data.city.strip() if data.city else None
    db.commit()
    db.refresh(publisher)
    return publisher

@router.delete("/{publisher_id}")
def delete_publisher(publisher_id: int, db: Session = Depends(get_db)):
    publisher = db.query(Publisher).filter(Publisher.publisher_id == publisher_id).first()
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    db.delete(publisher)
    db.commit()
    return {"message": "Publisher deleted successfully"}

