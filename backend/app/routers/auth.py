from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.models import Librarian
from ..schemas.schemas import LoginRequest, TokenResponse, LibrarianResponse
from ..auth.security import verify_password
from ..auth.jwt import create_access_token, get_current_librarian

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    librarian = db.query(Librarian).filter(Librarian.username == request.username).first()
    if not librarian or not verify_password(request.password, librarian.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password. Please try again."
        )

    access_token = create_access_token(data={"sub": librarian.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "librarian": librarian
    }

@router.post("/logout")
def logout(current_user: Librarian = Depends(get_current_librarian)):
    # With stateless JWT, client deletes token
    return {"message": f"Successfully logged out librarian {current_user.username}"}

@router.get("/me", response_model=LibrarianResponse)
def get_me(current_user: Librarian = Depends(get_current_librarian)):
    return current_user

