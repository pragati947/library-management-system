import sys
from datetime import date, datetime, timedelta
import logging
from sqlalchemy.orm import Session

from .connection import Base, engine, SessionLocal, get_db_status
from ..models.models import (
    Member, Librarian, Publisher, Author, Genre,
    Book, BookCopy, BorrowTransaction, Reservation,
    Rating, book_authors, member_preferences
)
from ..auth.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_database(db: Session):
    logger.info("Checking database tables and seed data...")

    # 1. Librarians
    if db.query(Librarian).count() == 0:
        logger.info("Seeding librarians...")
        hashed = get_password_hash("admin123")
        admin = Librarian(
            name="Head Librarian Admin",
            email="admin@library.edu",
            phone="+91-9876543210",
            username="admin",
            password_hash=hashed
        )
        assistant = Librarian(
            name="Assistant Librarian Sneha",
            email="sneha@library.edu",
            phone="+91-9876543211",
            username="sneha",
            password_hash=hashed
        )
        db.add_all([admin, assistant])
        db.commit()

    # 2. Publishers
    if db.query(Publisher).count() == 0:
        logger.info("Seeding publishers...")
        publishers = [
            Publisher(publisher_id=1, publisher_name="Pearson Education", city="London"),
            Publisher(publisher_id=2, publisher_name="O'Reilly Media", city="Sebastopol"),
            Publisher(publisher_id=3, publisher_name="MIT Press", city="Cambridge"),
            Publisher(publisher_id=4, publisher_name="Addison-Wesley", city="Boston"),
            Publisher(publisher_id=5, publisher_name="McGraw-Hill Education", city="New York"),
            Publisher(publisher_id=6, publisher_name="Penguin Random House", city="New York"),
            Publisher(publisher_id=7, publisher_name="HarperCollins", city="New York"),
            Publisher(publisher_id=8, publisher_name="Oxford University Press", city="Oxford"),
        ]
        db.add_all(publishers)
        db.commit()

    # 3. Authors
    if db.query(Author).count() == 0:
        logger.info("Seeding authors...")
        authors = [
            Author(author_id=1, author_name="Abraham Silberschatz"),
            Author(author_id=2, author_name="Peter Baer Galvin"),
            Author(author_id=3, author_name="Greg Gagne"),
            Author(author_id=4, author_name="Andrew S. Tanenbaum"),
            Author(author_id=5, author_name="Robert C. Martin"),
            Author(author_id=6, author_name="Martin Fowler"),
            Author(author_id=7, author_name="Thomas H. Cormen"),
            Author(author_id=8, author_name="Charles E. Leiserson"),
            Author(author_id=9, author_name="Stuart Russell"),
            Author(author_id=10, author_name="Peter Norvig"),
            Author(author_id=11, author_name="Isaac Asimov"),
            Author(author_id=12, author_name="Arthur Conan Doyle"),
            Author(author_id=13, author_name="Donald Knuth"),
            Author(author_id=14, author_name="Yuval Noah Harari"),
            Author(author_id=15, author_name="Bjarne Stroustrup"),
            Author(author_id=16, author_name="Ian Goodfellow"),
            Author(author_id=17, author_name="Frank Herbert"),
        ]
        db.add_all(authors)
        db.commit()

    # 4. Genres
    if db.query(Genre).count() == 0:
        logger.info("Seeding genres...")
        genres = [
            Genre(genre_id=1, genre_name="Database Systems"),
            Genre(genre_id=2, genre_name="Operating Systems"),
            Genre(genre_id=3, genre_name="Computer Networks"),
            Genre(genre_id=4, genre_name="Software Engineering"),
            Genre(genre_id=5, genre_name="Algorithms & Data Structures"),
            Genre(genre_id=6, genre_name="Artificial Intelligence"),
            Genre(genre_id=7, genre_name="Science Fiction"),
            Genre(genre_id=8, genre_name="Mystery & Thriller"),
            Genre(genre_id=9, genre_name="World History"),
            Genre(genre_id=10, genre_name="Programming Languages"),
        ]
        db.add_all(genres)
        db.commit()

    # 5. Books & Authors mapping
    if db.query(Book).count() == 0:
        logger.info("Seeding books and authors...")
        author_map = {a.author_id: a for a in db.query(Author).all()}

        books_data = [
            (1, "Database System Concepts", "978-0078022159", 5, 2019, 1, [1, 2, 3]),
            (2, "Operating System Concepts", "978-1118063330", 1, 2018, 2, [1, 2, 3]),
            (3, "Computer Networks", "978-0132126953", 1, 2021, 3, [4]),
            (4, "Clean Code: A Handbook of Agile Software Craftsmanship", "978-0132350884", 4, 2008, 4, [5]),
            (5, "Refactoring: Improving the Design of Existing Code", "978-0134757599", 4, 2018, 4, [6]),
            (6, "Introduction to Algorithms (CLRS)", "978-0262033848", 3, 2009, 5, [7, 8]),
            (7, "Artificial Intelligence: A Modern Approach", "978-0134610993", 1, 2020, 6, [9, 10]),
            (8, "Foundation", "978-0553293357", 6, 1951, 7, [11]),
            (9, "I, Robot", "978-0553382563", 6, 1950, 7, [11]),
            (10, "The Complete Sherlock Holmes", "978-0553328257", 6, 1892, 8, [12]),
            (11, "Sapiens: A Brief History of Humankind", "978-0062316097", 7, 2014, 9, [14]),
            (12, "The C++ Programming Language", "978-0321563842", 4, 2013, 10, [15]),
            (13, "Deep Learning", "978-0262035613", 3, 2016, 6, [16]),
            (14, "Dune", "978-0441172719", 6, 1965, 7, [17]),
            (15, "Modern Operating Systems", "978-0133591620", 1, 2014, 2, [4]),
            (16, "Designing Data-Intensive Applications", "978-1449373320", 2, 2017, 1, [6]),
            (17, "Clean Architecture", "978-0134494166", 4, 2017, 4, [5]),
            (18, "Structure and Interpretation of Computer Programs", "978-0262510875", 3, 1996, 5, [7]),
            (19, "The Hound of the Baskervilles", "978-0140437867", 6, 1902, 8, [12]),
            (20, "Homo Deus: A Brief History of Tomorrow", "978-0062464316", 7, 2016, 9, [14]),
            (21, "Computer Organization and Architecture", "978-0132936330", 1, 2015, 2, [4]),
            (22, "The Art of Computer Programming, Vol 1", "978-0201896831", 4, 1997, 5, [13]),
            (23, "Pattern Recognition and Machine Learning", "978-0387310732", 8, 2006, 6, [9]),
            (24, "The Caves of Steel", "978-0553293401", 6, 1954, 7, [11]),
            (25, "SQL Queries for Mere Mortals", "978-0134858333", 4, 2018, 1, [1])
        ]

        for bid, title, isbn, pub_id, yr, gid, a_ids in books_data:
            b = Book(
                book_id=bid,
                title=title,
                isbn=isbn,
                publisher_id=pub_id,
                publication_year=yr,
                genre_id=gid
            )
            b.authors = [author_map[aid] for aid in a_ids if aid in author_map]
            db.add(b)
        db.commit()

    # 6. Book Copies
    if db.query(BookCopy).count() == 0:
        logger.info("Seeding book copies...")
        copies = [
            # Book 1
            BookCopy(copy_id=1, book_id=1, status='AVAILABLE', barcode='BC-001-A', added_date=date(2025,1,10)),
            BookCopy(copy_id=2, book_id=1, status='ISSUED', barcode='BC-001-B', added_date=date(2025,1,10)),
            BookCopy(copy_id=3, book_id=1, status='AVAILABLE', barcode='BC-001-C', added_date=date(2025,1,10)),
            # Book 2
            BookCopy(copy_id=4, book_id=2, status='AVAILABLE', barcode='BC-002-A', added_date=date(2025,1,10)),
            BookCopy(copy_id=5, book_id=2, status='ISSUED', barcode='BC-002-B', added_date=date(2025,1,10)),
            # Book 3
            BookCopy(copy_id=6, book_id=3, status='AVAILABLE', barcode='BC-003-A', added_date=date(2025,1,10)),
            BookCopy(copy_id=7, book_id=3, status='AVAILABLE', barcode='BC-003-B', added_date=date(2025,1,10)),
            # Book 4
            BookCopy(copy_id=8, book_id=4, status='AVAILABLE', barcode='BC-004-A', added_date=date(2025,1,11)),
            BookCopy(copy_id=9, book_id=4, status='ISSUED', barcode='BC-004-B', added_date=date(2025,1,11)),
            # Book 5
            BookCopy(copy_id=10, book_id=5, status='AVAILABLE', barcode='BC-005-A', added_date=date(2025,1,11)),
            BookCopy(copy_id=11, book_id=5, status='AVAILABLE', barcode='BC-005-B', added_date=date(2025,1,11)),
            # Book 6
            BookCopy(copy_id=12, book_id=6, status='AVAILABLE', barcode='BC-006-A', added_date=date(2025,1,12)),
            BookCopy(copy_id=13, book_id=6, status='ISSUED', barcode='BC-006-B', added_date=date(2025,1,12)),
            BookCopy(copy_id=14, book_id=6, status='MAINTENANCE', barcode='BC-006-C', added_date=date(2025,1,12)),
            # Book 7
            BookCopy(copy_id=15, book_id=7, status='AVAILABLE', barcode='BC-007-A', added_date=date(2025,1,12)),
            BookCopy(copy_id=16, book_id=7, status='AVAILABLE', barcode='BC-007-B', added_date=date(2025,1,12)),
            # Book 8
            BookCopy(copy_id=17, book_id=8, status='AVAILABLE', barcode='BC-008-A', added_date=date(2025,1,12)),
            BookCopy(copy_id=18, book_id=8, status='AVAILABLE', barcode='BC-008-B', added_date=date(2025,1,12)),
            # Book 9
            BookCopy(copy_id=19, book_id=9, status='AVAILABLE', barcode='BC-009-A', added_date=date(2025,1,13)),
            BookCopy(copy_id=20, book_id=9, status='ISSUED', barcode='BC-009-B', added_date=date(2025,1,13)),
            # Book 10
            BookCopy(copy_id=21, book_id=10, status='AVAILABLE', barcode='BC-010-A', added_date=date(2025,1,13)),
            BookCopy(copy_id=22, book_id=10, status='AVAILABLE', barcode='BC-010-B', added_date=date(2025,1,13)),
            # Book 11
            BookCopy(copy_id=23, book_id=11, status='AVAILABLE', barcode='BC-011-A', added_date=date(2025,1,14)),
            BookCopy(copy_id=24, book_id=11, status='AVAILABLE', barcode='BC-011-B', added_date=date(2025,1,14)),
            # Book 12-25
            BookCopy(copy_id=25, book_id=12, status='AVAILABLE', barcode='BC-012-A', added_date=date(2025,1,14)),
            BookCopy(copy_id=26, book_id=13, status='AVAILABLE', barcode='BC-013-A', added_date=date(2025,1,15)),
            BookCopy(copy_id=27, book_id=13, status='AVAILABLE', barcode='BC-013-B', added_date=date(2025,1,15)),
            BookCopy(copy_id=28, book_id=14, status='AVAILABLE', barcode='BC-014-A', added_date=date(2025,1,15)),
            BookCopy(copy_id=29, book_id=14, status='AVAILABLE', barcode='BC-014-B', added_date=date(2025,1,15)),
            BookCopy(copy_id=30, book_id=15, status='AVAILABLE', barcode='BC-015-A', added_date=date(2025,1,15)),
            BookCopy(copy_id=31, book_id=16, status='AVAILABLE', barcode='BC-016-A', added_date=date(2025,1,16)),
            BookCopy(copy_id=32, book_id=16, status='AVAILABLE', barcode='BC-016-B', added_date=date(2025,1,16)),
            BookCopy(copy_id=33, book_id=17, status='AVAILABLE', barcode='BC-017-A', added_date=date(2025,1,16)),
            BookCopy(copy_id=34, book_id=18, status='AVAILABLE', barcode='BC-018-A', added_date=date(2025,1,16)),
            BookCopy(copy_id=35, book_id=19, status='AVAILABLE', barcode='BC-019-A', added_date=date(2025,1,17)),
            BookCopy(copy_id=36, book_id=20, status='AVAILABLE', barcode='BC-020-A', added_date=date(2025,1,17)),
            BookCopy(copy_id=37, book_id=21, status='AVAILABLE', barcode='BC-021-A', added_date=date(2025,1,17)),
            BookCopy(copy_id=38, book_id=22, status='AVAILABLE', barcode='BC-022-A', added_date=date(2025,1,18)),
            BookCopy(copy_id=39, book_id=23, status='AVAILABLE', barcode='BC-023-A', added_date=date(2025,1,18)),
            BookCopy(copy_id=40, book_id=24, status='AVAILABLE', barcode='BC-024-A', added_date=date(2025,1,18)),
            BookCopy(copy_id=41, book_id=25, status='AVAILABLE', barcode='BC-025-A', added_date=date(2025,1,18)),
        ]
        db.add_all(copies)
        db.commit()

    # 7. Members & Preferences
    if db.query(Member).count() == 0:
        logger.info("Seeding members and preferences...")
        genre_map = {g.genre_id: g for g in db.query(Genre).all()}

        members_data = [
            (1, "Pragati Ulman", "pragati@example.com", "+91-9823456781", date(2025,1,15), "ACTIVE", [1, 6, 7]),
            (2, "Aarav Sharma", "aarav.sharma@example.com", "+91-9811223344", date(2025,2,1), "ACTIVE", [4, 5]),
            (3, "Rohan Verma", "rohan.verma@example.com", "+91-9877665544", date(2025,2,10), "ACTIVE", [2, 3]),
            (4, "Ananya Iyer", "ananya.iyer@example.com", "+91-9988776655", date(2025,2,15), "ACTIVE", [7, 8]),
            (5, "Vikram Mehta", "vikram.mehta@example.com", "+91-9765432109", date(2025,3,1), "ACTIVE", [1, 4]),
            (6, "Neha Kulkarni", "neha.k@example.com", "+91-9654321987", date(2025,3,5), "SUSPENDED", [3]),
            (7, "Kabir Patil", "kabir.patil@example.com", "+91-9543216789", date(2025,3,12), "ACTIVE", [6, 10]),
            (8, "Pooja Nair", "pooja.nair@example.com", "+91-9432187654", date(2025,3,20), "ACTIVE", [9]),
            (9, "Rahul Deshmukh", "rahul.d@example.com", "+91-9321876543", date(2025,4,1), "EXPIRED", [5]),
            (10, "Tanvi Joshi", "tanvi.j@example.com", "+91-9218765432", date(2025,4,5), "ACTIVE", [5, 6]),
            (11, "Siddharth Rao", "sid.rao@example.com", "+91-9109876543", date(2025,4,10), "ACTIVE", [1, 2]),
            (12, "Meera Sen", "meera.sen@example.com", "+91-9098765432", date(2025,4,15), "ACTIVE", [7]),
        ]

        for mid, name, email, phone, jdate, status, g_ids in members_data:
            m = Member(
                member_id=mid,
                name=name,
                email=email,
                phone=phone,
                join_date=jdate,
                status=status
            )
            m.preferred_genres = [genre_map[gid] for gid in g_ids if gid in genre_map]
            db.add(m)
        db.commit()

    # 8. Transactions
    if db.query(BorrowTransaction).count() == 0:
        logger.info("Seeding borrow transactions...")
        today = date.today()
        txs = [
            # Returned historic
            BorrowTransaction(transaction_id=1, copy_id=1, member_id=1, librarian_id=1, issue_date=date(2025,1,20), due_date=date(2025,2,4), return_date=date(2025,2,3), fine_amount=0.00),
            BorrowTransaction(transaction_id=2, copy_id=6, member_id=1, librarian_id=1, issue_date=date(2025,2,10), due_date=date(2025,2,24), return_date=date(2025,2,22), fine_amount=0.00),
            BorrowTransaction(transaction_id=3, copy_id=17, member_id=1, librarian_id=1, issue_date=date(2025,3,1), due_date=date(2025,3,15), return_date=date(2025,3,14), fine_amount=0.00),
            BorrowTransaction(transaction_id=4, copy_id=8, member_id=2, librarian_id=1, issue_date=date(2025,2,5), due_date=date(2025,2,19), return_date=date(2025,2,18), fine_amount=0.00),
            BorrowTransaction(transaction_id=5, copy_id=12, member_id=2, librarian_id=1, issue_date=date(2025,2,20), due_date=date(2025,3,6), return_date=date(2025,3,5), fine_amount=0.00),
            BorrowTransaction(transaction_id=6, copy_id=4, member_id=3, librarian_id=1, issue_date=date(2025,2,15), due_date=date(2025,3,1), return_date=date(2025,3,8), fine_amount=35.00),
            BorrowTransaction(transaction_id=7, copy_id=21, member_id=4, librarian_id=1, issue_date=date(2025,2,18), due_date=date(2025,3,4), return_date=date(2025,3,3), fine_amount=0.00),

            # Currently active loans (Copy 2, 9, 5, 13, 20)
            BorrowTransaction(transaction_id=8, copy_id=2, member_id=1, librarian_id=1, issue_date=today - timedelta(days=5), due_date=today + timedelta(days=9), return_date=None, fine_amount=0.00),
            BorrowTransaction(transaction_id=9, copy_id=9, member_id=2, librarian_id=1, issue_date=today - timedelta(days=6), due_date=today + timedelta(days=8), return_date=None, fine_amount=0.00),
            BorrowTransaction(transaction_id=10, copy_id=5, member_id=5, librarian_id=1, issue_date=today - timedelta(days=25), due_date=today - timedelta(days=11), return_date=None, fine_amount=0.00), # OVERDUE
            BorrowTransaction(transaction_id=11, copy_id=13, member_id=7, librarian_id=1, issue_date=today - timedelta(days=30), due_date=today - timedelta(days=16), return_date=None, fine_amount=0.00), # OVERDUE
            BorrowTransaction(transaction_id=12, copy_id=20, member_id=8, librarian_id=1, issue_date=today - timedelta(days=3), due_date=today + timedelta(days=11), return_date=None, fine_amount=0.00),
        ]
        db.add_all(txs)
        db.commit()

    # 9. Reservations
    if db.query(Reservation).count() == 0:
        logger.info("Seeding reservations...")
        reservations = [
            Reservation(reservation_id=1, book_id=7, member_id=1, reservation_date=datetime.utcnow() - timedelta(days=7), status='PENDING'),
            Reservation(reservation_id=2, book_id=16, member_id=1, reservation_date=datetime.utcnow() - timedelta(days=6), status='PENDING'),
            Reservation(reservation_id=3, book_id=4, member_id=3, reservation_date=datetime.utcnow() - timedelta(days=5), status='PENDING'),
            Reservation(reservation_id=4, book_id=6, member_id=4, reservation_date=datetime.utcnow() - timedelta(days=4), status='PENDING'),
            Reservation(reservation_id=5, book_id=1, member_id=5, reservation_date=datetime.utcnow() - timedelta(days=15), status='FULFILLED'),
            Reservation(reservation_id=6, book_id=14, member_id=8, reservation_date=datetime.utcnow() - timedelta(days=2), status='PENDING'),
        ]
        db.add_all(reservations)
        db.commit()

    # 10. Ratings
    if db.query(Rating).count() == 0:
        logger.info("Seeding ratings...")
        ratings = [
            Rating(rating_id=1, member_id=1, book_id=1, rating=5, rating_date=datetime.utcnow() - timedelta(days=40)),
            Rating(rating_id=2, member_id=1, book_id=3, rating=5, rating_date=datetime.utcnow() - timedelta(days=35)),
            Rating(rating_id=3, member_id=1, book_id=8, rating=5, rating_date=datetime.utcnow() - timedelta(days=30)),
            Rating(rating_id=4, member_id=2, book_id=4, rating=5, rating_date=datetime.utcnow() - timedelta(days=32)),
            Rating(rating_id=5, member_id=2, book_id=6, rating=4, rating_date=datetime.utcnow() - timedelta(days=28)),
            Rating(rating_id=6, member_id=3, book_id=2, rating=4, rating_date=datetime.utcnow() - timedelta(days=25)),
            Rating(rating_id=7, member_id=4, book_id=10, rating=5, rating_date=datetime.utcnow() - timedelta(days=24)),
            Rating(rating_id=8, member_id=4, book_id=8, rating=4, rating_date=datetime.utcnow() - timedelta(days=20)),
            Rating(rating_id=9, member_id=5, book_id=1, rating=4, rating_date=datetime.utcnow() - timedelta(days=18)),
            Rating(rating_id=10, member_id=7, book_id=7, rating=5, rating_date=datetime.utcnow() - timedelta(days=15)),
            Rating(rating_id=11, member_id=8, book_id=11, rating=5, rating_date=datetime.utcnow() - timedelta(days=10)),
            Rating(rating_id=12, member_id=10, book_id=6, rating=5, rating_date=datetime.utcnow() - timedelta(days=5)),
        ]
        db.add_all(ratings)
        db.commit()

    logger.info("Database seeding completed successfully!")


def init_all():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

if __name__ == "__main__":
    init_all()

