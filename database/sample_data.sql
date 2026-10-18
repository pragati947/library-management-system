-- =====================================================================
-- Intelligent & Personalized Library Management System
-- Sample Dataset (MySQL 8.0)
-- =====================================================================

USE library_db;

-- 1. LIBRARIANS
INSERT INTO librarians (librarian_id, name, email, phone, username, password_hash) VALUES
(1, 'Head Librarian Admin', 'admin@library.edu', '+91-9876543210', 'admin', '$2b$12$E8yTvgx8Gxrw/Ph1ckL31uHA6OdDiYiAhtaMRpXfMWtmJZhOhv9oi'),
(2, 'Assistant Librarian Sneha', 'sneha@library.edu', '+91-9876543211', 'sneha', '$2b$12$E8yTvgx8Gxrw/Ph1ckL31uHA6OdDiYiAhtaMRpXfMWtmJZhOhv9oi')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. PUBLISHERS
INSERT INTO publishers (publisher_id, publisher_name, city) VALUES
(1, 'Pearson Education', 'London'),
(2, "O'Reilly Media", 'Sebastopol'),
(3, 'MIT Press', 'Cambridge'),
(4, 'Addison-Wesley', 'Boston'),
(5, 'McGraw-Hill Education', 'New York'),
(6, 'Penguin Random House', 'New York'),
(7, 'HarperCollins', 'New York'),
(8, 'Oxford University Press', 'Oxford')
ON DUPLICATE KEY UPDATE publisher_name=VALUES(publisher_name);

-- 3. AUTHORS
INSERT INTO authors (author_id, author_name) VALUES
(1, 'Abraham Silberschatz'),
(2, 'Peter Baer Galvin'),
(3, 'Greg Gagne'),
(4, 'Andrew S. Tanenbaum'),
(5, 'Robert C. Martin'),
(6, 'Martin Fowler'),
(7, 'Thomas H. Cormen'),
(8, 'Charles E. Leiserson'),
(9, 'Stuart Russell'),
(10, 'Peter Norvig'),
(11, 'Isaac Asimov'),
(12, 'Arthur Conan Doyle'),
(13, 'Donald Knuth'),
(14, 'Yuval Noah Harari'),
(15, 'Bjarne Stroustrup'),
(16, 'Ian Goodfellow'),
(17, 'Frank Herbert')
ON DUPLICATE KEY UPDATE author_name=VALUES(author_name);

-- 4. GENRES
INSERT INTO genres (genre_id, genre_name) VALUES
(1, 'Database Systems'),
(2, 'Operating Systems'),
(3, 'Computer Networks'),
(4, 'Software Engineering'),
(5, 'Algorithms & Data Structures'),
(6, 'Artificial Intelligence'),
(7, 'Science Fiction'),
(8, 'Mystery & Thriller'),
(9, 'World History'),
(10, 'Programming Languages')
ON DUPLICATE KEY UPDATE genre_name=VALUES(genre_name);

-- 5. BOOKS
INSERT INTO books (book_id, title, isbn, publisher_id, publication_year, genre_id) VALUES
(1, 'Database System Concepts', '978-0078022159', 5, 2019, 1),
(2, 'Operating System Concepts', '978-1118063330', 1, 2018, 2),
(3, 'Computer Networks', '978-0132126953', 1, 2021, 3),
(4, 'Clean Code: A Handbook of Agile Software Craftsmanship', '978-0132350884', 4, 2008, 4),
(5, 'Refactoring: Improving the Design of Existing Code', '978-0134757599', 4, 2018, 4),
(6, 'Introduction to Algorithms (CLRS)', '978-0262033848', 3, 2009, 5),
(7, 'Artificial Intelligence: A Modern Approach', '978-0134610993', 1, 2020, 6),
(8, 'Foundation', '978-0553293357', 6, 1951, 7),
(9, 'I, Robot', '978-0553382563', 6, 1950, 7),
(10, 'The Complete Sherlock Holmes', '978-0553328257', 6, 1892, 8),
(11, 'Sapiens: A Brief History of Humankind', '978-0062316097', 7, 2014, 9),
(12, 'The C++ Programming Language', '978-0321563842', 4, 2013, 10),
(13, 'Deep Learning', '978-0262035613', 3, 2016, 6),
(14, 'Dune', '978-0441172719', 6, 1965, 7),
(15, 'Modern Operating Systems', '978-0133591620', 1, 2014, 2),
(16, 'Designing Data-Intensive Applications', '978-1449373320', 2, 2017, 1),
(17, 'Clean Architecture', '978-0134494166', 4, 2017, 4),
(18, 'Structure and Interpretation of Computer Programs', '978-0262510875', 3, 1996, 5),
(19, 'The Hound of the Baskervilles', '978-0140437867', 6, 1902, 8),
(20, 'Homo Deus: A Brief History of Tomorrow', '978-0062464316', 7, 2016, 9),
(21, 'Computer Organization and Architecture', '978-0132936330', 1, 2015, 2),
(22, 'The Art of Computer Programming, Vol 1', '978-0201896831', 4, 1997, 5),
(23, 'Pattern Recognition and Machine Learning', '978-0387310732', 8, 2006, 6),
(24, 'The Caves of Steel', '978-0553293401', 6, 1954, 7),
(25, 'SQL Queries for Mere Mortals', '978-0134858333', 4, 2018, 1)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 6. BOOK_AUTHORS
INSERT INTO book_authors (book_id, author_id) VALUES
(1, 1), (1, 2), (1, 3), -- Silberschatz, Galvin, Gagne
(2, 1), (2, 2), (2, 3), -- Silberschatz, Galvin, Gagne
(3, 4),                -- Tanenbaum
(4, 5),                -- Robert C Martin
(5, 6),                -- Martin Fowler
(6, 7), (6, 8),        -- Cormen, Leiserson
(7, 9), (7, 10),       -- Russell, Norvig
(8, 11),               -- Asimov
(9, 11),               -- Asimov
(10, 12),              -- Conan Doyle
(11, 14),              -- Harari
(12, 15),              -- Stroustrup
(13, 16),              -- Goodfellow
(14, 17),              -- Frank Herbert
(15, 4),               -- Tanenbaum
(16, 6),               -- Fowler
(17, 5),               -- Martin
(18, 7),               -- Cormen
(19, 12),              -- Conan Doyle
(20, 14),              -- Harari
(21, 4),               -- Tanenbaum
(22, 13),              -- Knuth
(23, 9),               -- Russell
(24, 11),              -- Asimov
(25, 1)                -- Silberschatz
ON DUPLICATE KEY UPDATE author_id=VALUES(author_id);

-- 7. MEMBERS
INSERT INTO members (member_id, name, email, phone, join_date, status) VALUES
(1, 'Pragati Ulman', 'pragati@example.com', '+91-9823456781', '2025-01-15', 'ACTIVE'),
(2, 'Aarav Sharma', 'aarav.sharma@example.com', '+91-9811223344', '2025-02-01', 'ACTIVE'),
(3, 'Rohan Verma', 'rohan.verma@example.com', '+91-9877665544', '2025-02-10', 'ACTIVE'),
(4, 'Ananya Iyer', 'ananya.iyer@example.com', '+91-9988776655', '2025-02-15', 'ACTIVE'),
(5, 'Vikram Mehta', 'vikram.mehta@example.com', '+91-9765432109', '2025-03-01', 'ACTIVE'),
(6, 'Neha Kulkarni', 'neha.k@example.com', '+91-9654321987', '2025-03-05', 'SUSPENDED'),
(7, 'Kabir Patil', 'kabir.patil@example.com', '+91-9543216789', '2025-03-12', 'ACTIVE'),
(8, 'Pooja Nair', 'pooja.nair@example.com', '+91-9432187654', '2025-03-20', 'ACTIVE'),
(9, 'Rahul Deshmukh', 'rahul.d@example.com', '+91-9321876543', '2025-04-01', 'EXPIRED'),
(10, 'Tanvi Joshi', 'tanvi.j@example.com', '+91-9218765432', '2025-04-05', 'ACTIVE'),
(11, 'Siddharth Rao', 'sid.rao@example.com', '+91-9109876543', '2025-04-10', 'ACTIVE'),
(12, 'Meera Sen', 'meera.sen@example.com', '+91-9098765432', '2025-04-15', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8. MEMBER PREFERENCES (Pragati has Technology, Databases, AI, Sci-Fi)
INSERT INTO member_preferences (member_id, genre_id) VALUES
(1, 1), -- Database Systems
(1, 6), -- Artificial Intelligence
(1, 7), -- Science Fiction
(2, 4), -- Software Engineering
(2, 5), -- Algorithms
(3, 2), -- Operating Systems
(3, 3), -- Computer Networks
(4, 7), -- Science Fiction
(4, 8), -- Mystery
(5, 1), -- Database Systems
(5, 4), -- Software Engineering
(7, 6), -- AI
(7, 10),-- Programming
(8, 9), -- World History
(10, 5),-- Algorithms
(10, 6) -- AI
ON DUPLICATE KEY UPDATE genre_id=VALUES(genre_id);

-- 9. BOOK COPIES (Multiple physical copies for each book)
INSERT INTO book_copies (copy_id, book_id, status, barcode, added_date) VALUES
-- Database System Concepts (book 1)
(1, 1, 'AVAILABLE', 'BC-001-A', '2025-01-10'),
(2, 1, 'ISSUED', 'BC-001-B', '2025-01-10'),
(3, 1, 'AVAILABLE', 'BC-001-C', '2025-01-10'),

-- Operating System Concepts (book 2)
(4, 2, 'AVAILABLE', 'BC-002-A', '2025-01-10'),
(5, 2, 'ISSUED', 'BC-002-B', '2025-01-10'),

-- Computer Networks (book 3)
(6, 3, 'AVAILABLE', 'BC-003-A', '2025-01-10'),
(7, 3, 'AVAILABLE', 'BC-003-B', '2025-01-10'),

-- Clean Code (book 4)
(8, 4, 'AVAILABLE', 'BC-004-A', '2025-01-11'),
(9, 4, 'ISSUED', 'BC-004-B', '2025-01-11'),

-- Refactoring (book 5)
(10, 5, 'AVAILABLE', 'BC-005-A', '2025-01-11'),
(11, 5, 'AVAILABLE', 'BC-005-B', '2025-01-11'),

-- CLRS Algorithms (book 6)
(12, 6, 'AVAILABLE', 'BC-006-A', '2025-01-12'),
(13, 6, 'ISSUED', 'BC-006-B', '2025-01-12'),
(14, 6, 'MAINTENANCE', 'BC-006-C', '2025-01-12'),

-- AI: A Modern Approach (book 7)
(15, 7, 'AVAILABLE', 'BC-007-A', '2025-01-12'),
(16, 7, 'AVAILABLE', 'BC-007-B', '2025-01-12'),

-- Foundation (book 8)
(17, 8, 'AVAILABLE', 'BC-008-A', '2025-01-12'),
(18, 8, 'AVAILABLE', 'BC-008-B', '2025-01-12'),

-- I, Robot (book 9)
(19, 9, 'AVAILABLE', 'BC-009-A', '2025-01-13'),
(20, 9, 'ISSUED', 'BC-009-B', '2025-01-13'),

-- Sherlock Holmes (book 10)
(21, 10, 'AVAILABLE', 'BC-010-A', '2025-01-13'),
(22, 10, 'AVAILABLE', 'BC-010-B', '2025-01-13'),

-- Sapiens (book 11)
(23, 11, 'AVAILABLE', 'BC-011-A', '2025-01-14'),
(24, 11, 'AVAILABLE', 'BC-011-B', '2025-01-14'),

-- C++ Programming (book 12)
(25, 12, 'AVAILABLE', 'BC-012-A', '2025-01-14'),

-- Deep Learning (book 13)
(26, 13, 'AVAILABLE', 'BC-013-A', '2025-01-15'),
(27, 13, 'AVAILABLE', 'BC-013-B', '2025-01-15'),

-- Dune (book 14)
(28, 14, 'AVAILABLE', 'BC-014-A', '2025-01-15'),
(29, 14, 'AVAILABLE', 'BC-014-B', '2025-01-15'),

-- Modern OS (book 15)
(30, 15, 'AVAILABLE', 'BC-015-A', '2025-01-15'),

-- Designing Data-Intensive Apps (book 16)
(31, 16, 'AVAILABLE', 'BC-016-A', '2025-01-16'),
(32, 16, 'AVAILABLE', 'BC-016-B', '2025-01-16'),

-- Clean Architecture (book 17)
(33, 17, 'AVAILABLE', 'BC-017-A', '2025-01-16'),

-- SICP (book 18)
(34, 18, 'AVAILABLE', 'BC-018-A', '2025-01-16'),

-- Hound of Baskervilles (book 19)
(35, 19, 'AVAILABLE', 'BC-019-A', '2025-01-17'),

-- Homo Deus (book 20)
(36, 20, 'AVAILABLE', 'BC-020-A', '2025-01-17'),

-- Computer Org (book 21)
(37, 21, 'AVAILABLE', 'BC-021-A', '2025-01-17'),

-- TAOCP Vol 1 (book 22)
(38, 22, 'AVAILABLE', 'BC-022-A', '2025-01-18'),

-- PRML (book 23)
(39, 23, 'AVAILABLE', 'BC-023-A', '2025-01-18'),

-- Caves of Steel (book 24)
(40, 24, 'AVAILABLE', 'BC-024-A', '2025-01-18'),

-- SQL Queries for Mere Mortals (book 25)
(41, 25, 'AVAILABLE', 'BC-025-A', '2025-01-18')
ON DUPLICATE KEY UPDATE barcode=VALUES(barcode);

-- 10. BORROW TRANSACTIONS (Historic, Active, and Overdue)
-- Using dates relative to past months and current periods
INSERT INTO borrow_transactions (transaction_id, copy_id, member_id, librarian_id, issue_date, due_date, return_date, fine_amount) VALUES
-- Past returned on time
(1, 1, 1, 1, '2025-01-20', '2025-02-05', '2025-02-04', 0.00), -- Pragati borrowed DB Concepts & returned
(2, 6, 1, 1, '2025-02-10', '2025-02-25', '2025-02-22', 0.00), -- Pragati borrowed Networks & returned
(3, 17, 1, 1, '2025-03-01', '2025-03-15', '2025-03-14', 0.00), -- Pragati borrowed Foundation & returned
(4, 8, 2, 1, '2025-02-05', '2025-02-19', '2025-02-18', 0.00), -- Aarav borrowed Clean Code & returned
(5, 12, 2, 1, '2025-02-20', '2025-03-06', '2025-03-05', 0.00), -- Aarav borrowed CLRS & returned
(6, 4, 3, 1, '2025-02-15', '2025-03-01', '2025-03-08', 35.00), -- Rohan returned 7 days late (Fine: 35)
(7, 21, 4, 1, '2025-02-18', '2025-03-04', '2025-03-03', 0.00), -- Ananya returned Holmes

-- Active loans (Currently Issued)
(8, 2, 1, 1, '2026-10-01', '2026-10-15', NULL, 0.00),          -- Pragati currently has Copy 2 (DB Concepts)
(9, 9, 2, 1, '2026-10-02', '2026-10-16', NULL, 0.00),          -- Aarav has Clean Code
(10, 5, 5, 1, '2026-09-10', '2026-09-24', NULL, 0.00),         -- Vikram has OS Concepts (OVERDUE!)
(11, 13, 7, 1, '2026-09-01', '2026-09-15', NULL, 0.00),        -- Kabir has CLRS (OVERDUE!)
(12, 20, 8, 1, '2026-10-05', '2026-10-19', NULL, 0.00)         -- Pooja has I, Robot
ON DUPLICATE KEY UPDATE return_date=VALUES(return_date);

-- 11. RESERVATIONS
INSERT INTO reservations (reservation_id, book_id, member_id, reservation_date, status) VALUES
(1, 7, 1, '2026-10-01 10:30:00', 'PENDING'),    -- Pragati reserved AI: Modern Approach
(2, 16, 1, '2026-10-02 11:15:00', 'PENDING'),   -- Pragati reserved Designing Data-Intensive Apps
(3, 4, 3, '2026-10-03 14:00:00', 'PENDING'),    -- Rohan reserved Clean Code
(4, 6, 4, '2026-10-04 15:45:00', 'PENDING'),    -- Ananya reserved CLRS
(5, 1, 5, '2026-09-20 09:00:00', 'FULFILLED'),  -- Vikram previously fulfilled reservation
(6, 14, 8, '2026-10-06 16:20:00', 'PENDING')   -- Pooja reserved Dune
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 12. RATINGS (Scale 1 to 5)
INSERT INTO ratings (rating_id, member_id, book_id, rating, rating_date) VALUES
(1, 1, 1, 5, '2025-02-05 12:00:00'),  -- Pragati rated DB Concepts: 5
(2, 1, 3, 5, '2025-02-23 14:00:00'),  -- Pragati rated Networks: 5
(3, 1, 8, 5, '2025-03-15 16:30:00'),  -- Pragati rated Foundation: 5
(4, 2, 4, 5, '2025-02-19 11:00:00'),  -- Aarav rated Clean Code: 5
(5, 2, 6, 4, '2025-03-06 18:20:00'),  -- Aarav rated CLRS: 4
(6, 3, 2, 4, '2025-03-08 17:00:00'),  -- Rohan rated OS Concepts: 4
(7, 4, 10, 5, '2025-03-04 10:15:00'), -- Ananya rated Sherlock: 5
(8, 4, 8, 4, '2025-03-10 12:45:00'),  -- Ananya rated Foundation: 4
(9, 5, 1, 4, '2025-03-12 15:00:00'),  -- Vikram rated DB Concepts: 4
(10, 7, 7, 5, '2025-03-18 13:20:00'), -- Kabir rated AI Modern Approach: 5
(11, 8, 11, 5, '2025-03-22 09:40:00'),-- Pooja rated Sapiens: 5
(12, 10, 6, 5, '2025-04-02 14:10:00') -- Tanvi rated CLRS: 5
ON DUPLICATE KEY UPDATE rating=VALUES(rating);

