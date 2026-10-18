-- =====================================================================
-- Intelligent & Personalized Library Management System
-- Relational Database Schema (MySQL 8.0 / 3NF Normalized)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS library_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library_db;

-- 1. MEMBER TABLE
-- Stores library patrons
CREATE TABLE IF NOT EXISTS members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    join_date DATE NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_member_email CHECK (email LIKE '%@%._%')
) ENGINE=InnoDB;

-- 2. LIBRARIAN TABLE
-- Stores staff/admin accounts with credentials
CREATE TABLE IF NOT EXISTS librarians (
    librarian_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. PUBLISHER TABLE
CREATE TABLE IF NOT EXISTS publishers (
    publisher_id INT AUTO_INCREMENT PRIMARY KEY,
    publisher_name VARCHAR(150) NOT NULL UNIQUE,
    city VARCHAR(100)
) ENGINE=InnoDB;

-- 4. AUTHOR TABLE
CREATE TABLE IF NOT EXISTS authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 5. GENRE TABLE
CREATE TABLE IF NOT EXISTS genres (
    genre_id INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 6. BOOK TABLE
CREATE TABLE IF NOT EXISTS books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    publisher_id INT NOT NULL,
    publication_year INT NOT NULL,
    genre_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_pub_year CHECK (publication_year >= 1500 AND publication_year <= 2100)
) ENGINE=InnoDB;

-- 7. BOOK_AUTHOR TABLE (Many-to-Many between Books and Authors)
CREATE TABLE IF NOT EXISTS book_authors (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. BOOK_COPY TABLE
-- Tracks physical copies of a book
CREATE TABLE IF NOT EXISTS book_copies (
    copy_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    status ENUM('AVAILABLE', 'ISSUED', 'MAINTENANCE', 'LOST') NOT NULL DEFAULT 'AVAILABLE',
    barcode VARCHAR(50) UNIQUE,
    added_date DATE NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9. BORROW_TRANSACTION TABLE
-- Tracks lending operations
CREATE TABLE IF NOT EXISTS borrow_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    copy_id INT NOT NULL,
    member_id INT NOT NULL,
    librarian_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (copy_id) REFERENCES book_copies(copy_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (librarian_id) REFERENCES librarians(librarian_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_due_date CHECK (due_date >= issue_date),
    CONSTRAINT chk_fine_amount CHECK (fine_amount >= 0)
) ENGINE=InnoDB;

-- 10. RESERVATION TABLE
-- Handles queue for books
CREATE TABLE IF NOT EXISTS reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    member_id INT NOT NULL,
    reservation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 11. RATING TABLE
-- Stores ratings (1-5) submitted for books
CREATE TABLE IF NOT EXISTS ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    book_id INT NOT NULL,
    rating INT NOT NULL,
    rating_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_member_book_rating UNIQUE (member_id, book_id),
    CONSTRAINT chk_rating_range CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB;

-- 12. MEMBER_PREFERENCE TABLE
-- Tracks member's favored genres for personalized recommendations
CREATE TABLE IF NOT EXISTS member_preferences (
    member_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (member_id, genre_id),
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_genre ON books(genre_id);
CREATE INDEX idx_transactions_member ON borrow_transactions(member_id);
CREATE INDEX idx_transactions_copy ON borrow_transactions(copy_id);
CREATE INDEX idx_transactions_return ON borrow_transactions(return_date);
CREATE INDEX idx_reservations_status ON reservations(status);

