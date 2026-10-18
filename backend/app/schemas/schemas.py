from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import date, datetime

# --- AUTH SCHEMAS ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    librarian: "LibrarianResponse"

class LibrarianResponse(BaseModel):
    librarian_id: int
    name: str
    email: str
    phone: str
    username: str

    class Config:
        from_attributes = True


# --- GENRE SCHEMAS ---
class GenreBase(BaseModel):
    genre_name: str

class GenreCreate(GenreBase):
    pass

class GenreUpdate(GenreBase):
    pass

class GenreResponse(GenreBase):
    genre_id: int

    class Config:
        from_attributes = True


# --- AUTHOR SCHEMAS ---
class AuthorBase(BaseModel):
    author_name: str

class AuthorCreate(AuthorBase):
    pass

class AuthorUpdate(AuthorBase):
    pass

class AuthorResponse(AuthorBase):
    author_id: int

    class Config:
        from_attributes = True


# --- PUBLISHER SCHEMAS ---
class PublisherBase(BaseModel):
    publisher_name: str
    city: Optional[str] = None

class PublisherCreate(PublisherBase):
    pass

class PublisherUpdate(PublisherBase):
    pass

class PublisherResponse(PublisherBase):
    publisher_id: int

    class Config:
        from_attributes = True


# --- BOOK SCHEMAS ---
class BookBase(BaseModel):
    title: str
    isbn: str
    publisher_id: int
    publication_year: int
    genre_id: int

class BookCreate(BookBase):
    author_ids: List[int] = []

class BookUpdate(BaseModel):
    title: Optional[str] = None
    isbn: Optional[str] = None
    publisher_id: Optional[int] = None
    publication_year: Optional[int] = None
    genre_id: Optional[int] = None
    author_ids: Optional[List[int]] = None

class BookResponse(BookBase):
    book_id: int
    genre: Optional[GenreResponse] = None
    publisher: Optional[PublisherResponse] = None
    authors: List[AuthorResponse] = []
    total_copies: int = 0
    available_copies: int = 0
    issued_copies: int = 0
    average_rating: float = 0.0
    total_ratings: int = 0

    class Config:
        from_attributes = True


# --- BOOK COPY SCHEMAS ---
class CopyCreate(BaseModel):
    book_id: int
    barcode: Optional[str] = None
    status: str = "AVAILABLE" # AVAILABLE, ISSUED, MAINTENANCE, LOST
    added_date: Optional[date] = None

class CopyUpdate(BaseModel):
    status: Optional[str] = None
    barcode: Optional[str] = None

class CopyResponse(BaseModel):
    copy_id: int
    book_id: int
    status: str
    barcode: Optional[str] = None
    added_date: date
    book_title: Optional[str] = None
    isbn: Optional[str] = None

    class Config:
        from_attributes = True


# --- MEMBER SCHEMAS ---
class MemberBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    status: str = "ACTIVE" # ACTIVE, SUSPENDED, EXPIRED

class MemberCreate(MemberBase):
    preferred_genre_ids: Optional[List[int]] = []

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    preferred_genre_ids: Optional[List[int]] = None

class MemberResponse(MemberBase):
    member_id: int
    join_date: date
    preferred_genres: List[GenreResponse] = []
    active_borrows_count: int = 0
    overdue_count: int = 0

    class Config:
        from_attributes = True


# --- TRANSACTION SCHEMAS ---
class IssueBookRequest(BaseModel):
    member_id: int
    copy_id: int
    due_days: Optional[int] = 14
    issue_date: Optional[date] = None

class ReturnBookRequest(BaseModel):
    transaction_id: int
    fine_rate: Optional[float] = None # Configurable in backend

class TransactionResponse(BaseModel):
    transaction_id: int
    copy_id: int
    member_id: int
    librarian_id: int
    issue_date: date
    due_date: date
    return_date: Optional[date] = None
    fine_amount: float = 0.0
    book_id: Optional[int] = None
    book_title: Optional[str] = None
    barcode: Optional[str] = None
    member_name: Optional[str] = None
    is_overdue: bool = False
    days_overdue: int = 0

    class Config:
        from_attributes = True


# --- RESERVATION SCHEMAS ---
class ReservationCreate(BaseModel):
    book_id: int
    member_id: int

class ReservationUpdate(BaseModel):
    status: str # PENDING, FULFILLED, CANCELLED

class ReservationResponse(BaseModel):
    reservation_id: int
    book_id: int
    member_id: int
    reservation_date: datetime
    status: str
    book_title: Optional[str] = None
    member_name: Optional[str] = None
    queue_position: Optional[int] = None

    class Config:
        from_attributes = True


# --- RATING SCHEMAS ---
class RatingCreate(BaseModel):
    member_id: int
    book_id: int
    rating: int = Field(..., ge=1, le=5)

class RatingResponse(BaseModel):
    rating_id: int
    member_id: int
    book_id: int
    rating: int
    rating_date: datetime
    book_title: Optional[str] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- RECOMMENDATION SCHEMAS ---
class RecommendationItem(BaseModel):
    book_id: int
    title: str
    isbn: str
    genre_name: str
    authors: List[str]
    publisher_name: str
    available_copies: int
    total_copies: int
    is_available: bool
    average_rating: float
    recommendation_score: float
    reasons: List[str]
    primary_reason: str


# --- MEMBER PROFILE SCHEMAS ---
class MemberProfileResponse(BaseModel):
    member: MemberResponse
    preferred_genres: List[GenreResponse]
    current_borrows: List[TransactionResponse]
    borrow_history: List[TransactionResponse]
    reservations: List[ReservationResponse]
    ratings: List[RatingResponse]
    frequently_borrowed_authors: List[dict]
    stats: dict
    recommendations: List[RecommendationItem] = []


# --- DASHBOARD & REPORTS SCHEMAS ---
class DashboardStatsResponse(BaseModel):
    total_books: int
    total_book_copies: int
    available_copies: int
    issued_copies: int
    total_members: int
    active_members: int
    currently_issued_books: int
    overdue_books: int
    total_reservations: int
    pending_reservations: int
    total_fines: float
    database_status: dict

class DashboardChartsResponse(BaseModel):
    books_by_genre: List[dict]
    most_borrowed_books: List[dict]
    popular_authors: List[dict]
    monthly_borrowing_trends: List[dict]
    ratings_distribution: List[dict]

class SettingsUpdate(BaseModel):
    default_daily_fine_rate: Optional[float] = None
    default_borrow_days: Optional[int] = None

