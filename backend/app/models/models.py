from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Numeric,
    ForeignKey, Table, Text, CheckConstraint, UniqueConstraint, Enum
)
from sqlalchemy.orm import relationship
from ..database.connection import Base

# Association Table: Book Author (Many-to-Many)
book_authors = Table(
    'book_authors',
    Base.metadata,
    Column('book_id', Integer, ForeignKey('books.book_id', ondelete='CASCADE'), primary_key=True),
    Column('author_id', Integer, ForeignKey('authors.author_id', ondelete='CASCADE'), primary_key=True)
)

# Association Table: Member Preference (Many-to-Many)
member_preferences = Table(
    'member_preferences',
    Base.metadata,
    Column('member_id', Integer, ForeignKey('members.member_id', ondelete='CASCADE'), primary_key=True),
    Column('genre_id', Integer, ForeignKey('genres.genre_id', ondelete='CASCADE'), primary_key=True)
)


class Member(Base):
    __tablename__ = 'members'

    member_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    join_date = Column(Date, default=date.today, nullable=False)
    status = Column(String(20), default='ACTIVE', nullable=False) # ACTIVE, SUSPENDED, EXPIRED
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transactions = relationship('BorrowTransaction', back_populates='member', cascade='all, delete-orphan')
    reservations = relationship('Reservation', back_populates='member', cascade='all, delete-orphan')
    ratings = relationship('Rating', back_populates='member', cascade='all, delete-orphan')
    preferred_genres = relationship('Genre', secondary=member_preferences, back_populates='preferred_members')


class Librarian(Base):
    __tablename__ = 'librarians'

    librarian_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transactions = relationship('BorrowTransaction', back_populates='librarian')


class Publisher(Base):
    __tablename__ = 'publishers'

    publisher_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    publisher_name = Column(String(150), unique=True, nullable=False)
    city = Column(String(100), nullable=True)

    # Relationships
    books = relationship('Book', back_populates='publisher')


class Author(Base):
    __tablename__ = 'authors'

    author_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    author_name = Column(String(120), unique=True, nullable=False, index=True)

    # Relationships
    books = relationship('Book', secondary=book_authors, back_populates='authors')


class Genre(Base):
    __tablename__ = 'genres'

    genre_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    genre_name = Column(String(80), unique=True, nullable=False, index=True)

    # Relationships
    books = relationship('Book', back_populates='genre')
    preferred_members = relationship('Member', secondary=member_preferences, back_populates='preferred_genres')


class Book(Base):
    __tablename__ = 'books'

    book_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    isbn = Column(String(20), unique=True, nullable=False, index=True)
    publisher_id = Column(Integer, ForeignKey('publishers.publisher_id'), nullable=False)
    publication_year = Column(Integer, nullable=False)
    genre_id = Column(Integer, ForeignKey('genres.genre_id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    publisher = relationship('Publisher', back_populates='books')
    genre = relationship('Genre', back_populates='books')
    authors = relationship('Author', secondary=book_authors, back_populates='books')
    copies = relationship('BookCopy', back_populates='book', cascade='all, delete-orphan')
    reservations = relationship('Reservation', back_populates='book', cascade='all, delete-orphan')
    ratings = relationship('Rating', back_populates='book', cascade='all, delete-orphan')


class BookCopy(Base):
    __tablename__ = 'book_copies'

    copy_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String(20), default='AVAILABLE', nullable=False) # AVAILABLE, ISSUED, MAINTENANCE, LOST
    barcode = Column(String(50), unique=True, nullable=True)
    added_date = Column(Date, default=date.today, nullable=False)

    # Relationships
    book = relationship('Book', back_populates='copies')
    transactions = relationship('BorrowTransaction', back_populates='copy')


class BorrowTransaction(Base):
    __tablename__ = 'borrow_transactions'

    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    copy_id = Column(Integer, ForeignKey('book_copies.copy_id'), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey('members.member_id'), nullable=False, index=True)
    librarian_id = Column(Integer, ForeignKey('librarians.librarian_id'), nullable=False)
    issue_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    fine_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    copy = relationship('BookCopy', back_populates='transactions')
    member = relationship('Member', back_populates='transactions')
    librarian = relationship('Librarian', back_populates='transactions')


class Reservation(Base):
    __tablename__ = 'reservations'

    reservation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey('members.member_id', ondelete='CASCADE'), nullable=False, index=True)
    reservation_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), default='PENDING', nullable=False) # PENDING, FULFILLED, CANCELLED

    # Relationships
    book = relationship('Book', back_populates='reservations')
    member = relationship('Member', back_populates='reservations')


class Rating(Base):
    __tablename__ = 'ratings'

    rating_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey('members.member_id', ondelete='CASCADE'), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False, index=True)
    rating = Column(Integer, nullable=False) # 1 to 5
    rating_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('member_id', 'book_id', name='uq_member_book_rating'),
        CheckConstraint('rating >= 1 AND rating <= 5', name='chk_rating_range'),
    )

    # Relationships
    member = relationship('Member', back_populates='ratings')
    book = relationship('Book', back_populates='ratings')

