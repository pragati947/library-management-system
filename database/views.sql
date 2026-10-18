-- =====================================================================
-- Intelligent & Personalized Library Management System
-- Database Views (MySQL 8.0)
-- =====================================================================

USE library_db;

-- 1. VIEW: Comprehensive Book Details with Copies and Ratings
CREATE OR REPLACE VIEW view_book_details AS
SELECT 
    b.book_id,
    b.title,
    b.isbn,
    b.publication_year,
    p.publisher_id,
    p.publisher_name,
    g.genre_id,
    g.genre_name,
    COALESCE(GROUP_CONCAT(DISTINCT a.author_name ORDER BY a.author_name SEPARATOR ', '), 'Unknown') AS authors,
    COUNT(DISTINCT bc.copy_id) AS total_copies,
    COUNT(DISTINCT CASE WHEN bc.status = 'AVAILABLE' THEN bc.copy_id END) AS available_copies,
    COUNT(DISTINCT CASE WHEN bc.status = 'ISSUED' THEN bc.copy_id END) AS issued_copies,
    COALESCE(ROUND(AVG(r.rating), 2), 0.00) AS average_rating,
    COUNT(DISTINCT r.rating_id) AS total_ratings
FROM books b
JOIN publishers p ON b.publisher_id = p.publisher_id
JOIN genres g ON b.genre_id = g.genre_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
LEFT JOIN ratings r ON b.book_id = r.book_id
GROUP BY b.book_id, b.title, b.isbn, b.publication_year, p.publisher_id, p.publisher_name, g.genre_id, g.genre_name;

-- 2. VIEW: Member Borrowing Summary & Activity
CREATE OR REPLACE VIEW view_member_borrow_summary AS
SELECT 
    m.member_id,
    m.name AS member_name,
    m.email,
    m.phone,
    m.status,
    m.join_date,
    COUNT(DISTINCT bt.transaction_id) AS total_borrowed,
    COUNT(DISTINCT CASE WHEN bt.return_date IS NULL THEN bt.transaction_id END) AS currently_issued,
    COUNT(DISTINCT CASE WHEN bt.return_date IS NULL AND bt.due_date < CURDATE() THEN bt.transaction_id END) AS overdue_count,
    COALESCE(SUM(bt.fine_amount), 0.00) AS total_fines_recorded,
    COUNT(DISTINCT r.rating_id) AS total_ratings_given,
    COUNT(DISTINCT res.reservation_id) AS total_reservations_made
FROM members m
LEFT JOIN borrow_transactions bt ON m.member_id = bt.member_id
LEFT JOIN ratings r ON m.member_id = r.member_id
LEFT JOIN reservations res ON m.member_id = res.member_id
GROUP BY m.member_id, m.name, m.email, m.phone, m.status, m.join_date;

-- 3. VIEW: Genre Popularity and Member Preferences
CREATE OR REPLACE VIEW view_genre_popularity AS
SELECT 
    g.genre_id,
    g.genre_name,
    COUNT(DISTINCT b.book_id) AS total_books,
    COUNT(DISTINCT bt.transaction_id) AS total_borrows,
    COUNT(DISTINCT mp.member_id) AS preferred_by_members_count
FROM genres g
LEFT JOIN books b ON g.genre_id = b.genre_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
LEFT JOIN borrow_transactions bt ON bc.copy_id = bt.copy_id
LEFT JOIN member_preferences mp ON g.genre_id = mp.genre_id
GROUP BY g.genre_id, g.genre_name;

-- 4. VIEW: Top Borrowed Books Ranking
CREATE OR REPLACE VIEW view_top_borrowed_books AS
SELECT 
    b.book_id,
    b.title,
    g.genre_name,
    COUNT(bt.transaction_id) AS borrow_count,
    ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
    COUNT(DISTINCT CASE WHEN bc.status = 'AVAILABLE' THEN bc.copy_id END) AS available_copies
FROM books b
JOIN genres g ON b.genre_id = g.genre_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
LEFT JOIN borrow_transactions bt ON bc.copy_id = bt.copy_id
LEFT JOIN ratings r ON b.book_id = r.book_id
GROUP BY b.book_id, b.title, g.genre_name
HAVING borrow_count > 0
ORDER BY borrow_count DESC;

-- 5. VIEW: Active Overdue Borrow Transactions
CREATE OR REPLACE VIEW view_overdue_loans AS
SELECT 
    bt.transaction_id,
    m.member_id,
    m.name AS member_name,
    m.phone,
    b.book_id,
    b.title AS book_title,
    bc.copy_id,
    bc.barcode,
    bt.issue_date,
    bt.due_date,
    DATEDIFF(CURDATE(), bt.due_date) AS days_overdue,
    (DATEDIFF(CURDATE(), bt.due_date) * 5.00) AS calculated_fine
FROM borrow_transactions bt
JOIN members m ON bt.member_id = m.member_id
JOIN book_copies bc ON bt.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
WHERE bt.return_date IS NULL AND bt.due_date < CURDATE()
ORDER BY days_overdue DESC;

