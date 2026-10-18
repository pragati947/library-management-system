from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..models.models import (
    Member, Book, BookCopy, BorrowTransaction, Reservation,
    Rating, Genre, Author, Publisher, book_authors, member_preferences
)
from ..schemas.schemas import RecommendationItem


def get_personalized_recommendations(member_id: int, db: Session, limit: int = 10) -> List[RecommendationItem]:
    """
    Intelligent & Deterministic Database-Driven Recommendation Engine.
    Evaluates:
    1. Member's explicitly preferred genres (member_preferences)
    2. Previously borrowed books (borrow_transactions)
    3. Frequently borrowed authors
    4. Member's high ratings (ratings >= 4)
    5. Reservation history (reservations)
    6. System-wide book popularity and average ratings
    7. Real-time book copy availability
    """
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        return []

    # 1. Preferred Genres
    pref_genre_ids = {g.genre_id for g in member.preferred_genres}
    pref_genre_names = {g.genre_id: g.genre_name for g in member.preferred_genres}

    # 2. Previously Borrowed Books & Active Loans
    all_member_txs = db.query(BorrowTransaction).filter(BorrowTransaction.member_id == member_id).all()
    currently_borrowed_book_ids = set()
    previously_borrowed_book_ids = set()
    borrowed_genre_counts: Dict[int, int] = {}
    borrowed_author_counts: Dict[int, int] = {}
    borrowed_book_titles = {}

    for tx in all_member_txs:
        if tx.copy and tx.copy.book:
            b = tx.copy.book
            borrowed_book_titles[b.book_id] = b.title
            if tx.return_date is None:
                currently_borrowed_book_ids.add(b.book_id)
            else:
                previously_borrowed_book_ids.add(b.book_id)
                borrowed_genre_counts[b.genre_id] = borrowed_genre_counts.get(b.genre_id, 0) + 1
                for author in b.authors:
                    borrowed_author_counts[author.author_id] = borrowed_author_counts.get(author.author_id, 0) + 1

    # 3. Member's High Ratings
    high_rated_books = db.query(Rating).filter(
        Rating.member_id == member_id,
        Rating.rating >= 4
    ).all()
    high_rated_book_ids = {r.book_id for r in high_rated_books}
    high_rated_author_ids = set()
    for r in high_rated_books:
        book = db.query(Book).filter(Book.book_id == r.book_id).first()
        if book:
            for author in book.authors:
                high_rated_author_ids.add(author.author_id)

    # 4. Member Reservations
    member_reserved_book_ids = {
        res.book_id for res in db.query(Reservation).filter(
            Reservation.member_id == member_id
        ).all()
    }

    # 5. System-wide Book Popularity (Total Borrow Count)
    popularity_query = db.query(
        BookCopy.book_id,
        func.count(BorrowTransaction.transaction_id).label("total_borrows")
    ).join(BorrowTransaction, BookCopy.copy_id == BorrowTransaction.copy_id, isouter=True)\
     .group_by(BookCopy.book_id).all()
    popularity_map = {row.book_id: (row.total_borrows or 0) for row in popularity_query}

    # 6. System-wide Book Ratings
    ratings_query = db.query(
        Rating.book_id,
        func.avg(Rating.rating).label("avg_rating"),
        func.count(Rating.rating_id).label("rating_count")
    ).group_by(Rating.book_id).all()
    avg_ratings_map = {row.book_id: float(row.avg_rating or 0.0) for row in ratings_query}

    # Query all books
    all_books = db.query(Book).all()
    candidate_scores = []

    for book in all_books:
        # Skip books the member is currently holding
        if book.book_id in currently_borrowed_book_ids:
            continue

        score = 0.0
        reasons = []

        total_copies = len(book.copies)
        available_copies = sum(1 for c in book.copies if c.status == 'AVAILABLE')
        is_available = available_copies > 0

        # Factor 1: Explicit Preferred Genre (+35 pts)
        if book.genre_id in pref_genre_ids:
            score += 35.0
            reasons.append(f"Matches preferred genre '{book.genre.genre_name}'.")

        # Factor 2: Borrowed Genre History (+15 pts per previous borrow in genre, max 30)
        genre_borrow_freq = borrowed_genre_counts.get(book.genre_id, 0)
        if genre_borrow_freq > 0:
            genre_boost = min(genre_borrow_freq * 15.0, 30.0)
            score += genre_boost
            if book.genre_id not in pref_genre_ids:
                reasons.append(f"Frequently borrows books in '{book.genre.genre_name}' ({genre_borrow_freq} previously borrowed).")

        # Factor 3: Author Affinity (+25 pts per author)
        book_author_ids = {a.author_id for a in book.authors}
        author_matches = []
        for author in book.authors:
            borrow_count = borrowed_author_counts.get(author.author_id, 0)
            if borrow_count > 0:
                score += 25.0 + min(borrow_count * 5.0, 15.0)
                author_matches.append(f"{author.author_name} ({borrow_count} previous loans)")
            elif author.author_id in high_rated_author_ids:
                score += 20.0
                author_matches.append(f"{author.author_name} (previously rated 4+ stars)")

        if author_matches:
            reasons.append(f"Written by familiar author: {', '.join(author_matches)}.")

        # Factor 4: High Rating in Preferred Genre (+15 pts)
        avg_rating = avg_ratings_map.get(book.book_id, 0.0)
        if avg_rating >= 4.0 and book.genre_id in pref_genre_ids:
            score += 15.0
            reasons.append(f"Highly rated ({avg_rating:.1f}/5) in preferred '{book.genre.genre_name}' category.")

        # Factor 5: Reservation Interest (+20 pts)
        if book.book_id in member_reserved_book_ids:
            score += 20.0
            reasons.append("Previously expressed interest via reservation history.")

        # Factor 6: System-wide Popularity (+up to 15 pts)
        borrows = popularity_map.get(book.book_id, 0)
        if borrows > 0:
            score += min(borrows * 2.0, 15.0)
            if borrows >= 2 and not reasons:
                reasons.append(f"Popular choice in library ({borrows} total checkouts).")

        # Factor 7: Real-time Copy Availability (+25 pts)
        if is_available:
            score += 25.0
            reasons.append(f"Currently available on shelf ({available_copies} of {total_copies} available).")
        else:
            reasons.append("Currently all copies checked out (available for reservation).")

        # Default fallback reason if no specific match
        if not reasons:
            reasons.append(f"Featured collection in '{book.genre.genre_name}'.")

        primary_reason = reasons[0]

        candidate_scores.append({
            "book": book,
            "score": round(score, 1),
            "reasons": reasons,
            "primary_reason": primary_reason,
            "is_available": is_available,
            "available_copies": available_copies,
            "total_copies": total_copies,
            "avg_rating": round(avg_rating, 1)
        })

    # Sort candidates by score descending, prioritizing available books
    candidate_scores.sort(
        key=lambda x: (x["score"], x["is_available"], x["available_copies"]),
        reverse=True
    )

    results = []
    for item in candidate_scores[:limit]:
        b = item["book"]
        results.append(RecommendationItem(
            book_id=b.book_id,
            title=b.title,
            isbn=b.isbn,
            genre_name=b.genre.genre_name if b.genre else "General",
            authors=[a.author_name for a in b.authors],
            publisher_name=b.publisher.publisher_name if b.publisher else "Unknown",
            available_copies=item["available_copies"],
            total_copies=item["total_copies"],
            is_available=item["is_available"],
            average_rating=item["avg_rating"],
            recommendation_score=item["score"],
            reasons=item["reasons"],
            primary_reason=item["primary_reason"]
        ))

    return results

