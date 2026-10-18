-- =====================================================================
-- Intelligent & Personalized Library Management System
-- Stored Procedures (MySQL 8.0)
-- =====================================================================

USE library_db;

DELIMITER $$

-- 1. PROCEDURE: Issue Book
DROP PROCEDURE IF EXISTS sp_issue_book$$
CREATE PROCEDURE sp_issue_book(
    IN p_copy_id INT,
    IN p_member_id INT,
    IN p_librarian_id INT,
    IN p_due_days INT,
    OUT p_transaction_id INT,
    OUT p_status_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_copy_status VARCHAR(20);
    DECLARE v_member_status VARCHAR(20);
    DECLARE v_issue_date DATE;
    DECLARE v_due_date DATE;

    -- Default issue date today
    SET v_issue_date = CURDATE();
    SET v_due_date = DATE_ADD(v_issue_date, INTERVAL p_due_days DAY);

    -- Check copy status
    SELECT status INTO v_copy_status FROM book_copies WHERE copy_id = p_copy_id;
    IF v_copy_status IS NULL THEN
        SET p_status_message = 'Copy ID does not exist';
        LEAVE proc_label;
    END IF;

    IF v_copy_status != 'AVAILABLE' THEN
        SET p_status_message = CONCAT('Book copy is currently ', v_copy_status);
        LEAVE proc_label;
    END IF;

    -- Check member status
    SELECT status INTO v_member_status FROM members WHERE member_id = p_member_id;
    IF v_member_status IS NULL THEN
        SET p_status_message = 'Member ID does not exist';
        LEAVE proc_label;
    END IF;

    IF v_member_status != 'ACTIVE' THEN
        SET p_status_message = CONCAT('Member is ', v_member_status, ' and cannot borrow books');
        LEAVE proc_label;
    END IF;

    -- Insert into transactions (Triggers will handle updating copy status to ISSUED)
    INSERT INTO borrow_transactions (copy_id, member_id, librarian_id, issue_date, due_date, fine_amount)
    VALUES (p_copy_id, p_member_id, p_librarian_id, v_issue_date, v_due_date, 0.00);

    SET p_transaction_id = LAST_INSERT_ID();
    SET p_status_message = 'SUCCESS';
END$$


-- 2. PROCEDURE: Return Book with Dynamic Fine Calculation
DROP PROCEDURE IF EXISTS sp_return_book$$
CREATE PROCEDURE sp_return_book(
    IN p_transaction_id INT,
    IN p_fine_rate DECIMAL(6,2),
    OUT p_fine_amount DECIMAL(10,2),
    OUT p_status_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_due_date DATE;
    DECLARE v_return_date DATE;
    DECLARE v_days_overdue INT DEFAULT 0;
    DECLARE v_copy_id INT;

    SET v_return_date = CURDATE();

    -- Fetch transaction details
    SELECT due_date, copy_id, return_date INTO v_due_date, v_copy_id, v_return_date
    FROM borrow_transactions
    WHERE transaction_id = p_transaction_id;

    IF v_due_date IS NULL THEN
        SET p_status_message = 'Transaction ID not found';
        SET p_fine_amount = 0.00;
        LEAVE proc_label;
    END IF;

    IF v_return_date IS NOT NULL THEN
        SET p_status_message = 'Book has already been returned previously';
        SET p_fine_amount = 0.00;
        LEAVE proc_label;
    END IF;

    -- Calculate days overdue
    IF CURDATE() > v_due_date THEN
        SET v_days_overdue = DATEDIFF(CURDATE(), v_due_date);
        SET p_fine_amount = v_days_overdue * p_fine_rate;
    ELSE
        SET v_days_overdue = 0;
        SET p_fine_amount = 0.00;
    END IF;

    -- Update transaction (Trigger will set copy status back to AVAILABLE)
    UPDATE borrow_transactions
    SET return_date = CURDATE(),
        fine_amount = p_fine_amount
    WHERE transaction_id = p_transaction_id;

    SET p_status_message = CONCAT('SUCCESS: Returned with ', v_days_overdue, ' days overdue.');
END$$


-- 3. PROCEDURE: Member Profile Aggregates
DROP PROCEDURE IF EXISTS sp_get_member_profile_stats$$
CREATE PROCEDURE sp_get_member_profile_stats(
    IN p_member_id INT
)
BEGIN
    SELECT 
        m.member_id,
        m.name,
        m.email,
        m.phone,
        m.status,
        m.join_date,
        COUNT(DISTINCT bt.transaction_id) AS total_borrows,
        COUNT(DISTINCT CASE WHEN bt.return_date IS NULL THEN bt.transaction_id END) AS currently_issued,
        COUNT(DISTINCT CASE WHEN bt.return_date IS NULL AND bt.due_date < CURDATE() THEN bt.transaction_id END) AS active_overdue,
        COALESCE(SUM(bt.fine_amount), 0.00) AS total_fines_incurred,
        COUNT(DISTINCT res.reservation_id) AS total_reservations,
        COUNT(DISTINCT r.rating_id) AS total_ratings_given
    FROM members m
    LEFT JOIN borrow_transactions bt ON m.member_id = bt.member_id
    LEFT JOIN reservations res ON m.member_id = res.member_id
    LEFT JOIN ratings r ON m.member_id = r.member_id
    WHERE m.member_id = p_member_id
    GROUP BY m.member_id, m.name, m.email, m.phone, m.status, m.join_date;
END$$

DELIMITER ;

