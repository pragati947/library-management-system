from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.models import Member
from ..schemas.schemas import RecommendationItem
from ..auth.jwt import get_current_librarian
from ..services.recommendation_service import get_personalized_recommendations

router = APIRouter(prefix="/recommendations", tags=["Recommendations"], dependencies=[Depends(get_current_librarian)])

@router.get("/{member_id}", response_model=List[RecommendationItem])
def get_recommendations_for_member(
    member_id: int,
    limit: int = Query(10, ge=1, le=50, description="Max recommendations to return"),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    return get_personalized_recommendations(member_id=member_id, db=db, limit=limit)

