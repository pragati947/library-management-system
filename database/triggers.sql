-- =====================================================================
-- Intelligent & Personalized Library Management System
-- Database Triggers (MySQL 8.0)
-- =====================================================================

USE library_db;

DELIMITER $$

-- 1. TRIGGER: Before Issue - Verify that the book copy is AVAILABLE
DROP TRIGGER IF EXISTS trg_before_borrow_check_availability$$
CREATE TRIGGER trg_before_borrow_check_availability
BEFORE INSERT ON borrow_transactions
FOR EACH ROW
BEGIN
    DECLARE copy_curr_status VARCHAR(20);
    DECLARE member_curr_status VARCHAR(20);

    -- Check copy status
    SELECT status INTO copy_curr_status
    FROM book_copies
    WHERE copy_id = NEW.copy_id;

    IF copy_curr_status != 'AVAILABLE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: The selected book copy is currently not available for checkout.';
    END IF;

    -- Check member status
    SELECT status INTO member_curr_status
    FROM members
    WHERE member_id = NEW.member_id;

    IF member_curr_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Only ACTIVE members can borrow books.';
    END IF;
END$$

-- 2. TRIGGER: After Issue - Automatically change copy status to 'ISSUED'
DROP TRIGGER IF EXISTS trg_after_borrow_issue$$
CREATE TRIGGER trg_after_borrow_issue
AFTER INSERT ON borrow_transactions
FOR EACH ROW
BEGIN
    UPDATE book_copies
    SET status = 'ISSUED'
    WHERE copy_id = NEW.copy_id;
END$$

-- 3. TRIGGER: After Return - Automatically mark copy back to 'AVAILABLE'
DROP TRIGGER IF EXISTS trg_after_borrow_return$$
CREATE TRIGGER trg_after_borrow_return
AFTER UPDATE ON borrow_transactions
FOR EACH ROW
BEGIN
    -- If the book was not returned previously, but now return_date is set
    IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
        UPDATE book_copies
        SET status = 'AVAILABLE'
        WHERE copy_id = NEW.copy_id;
    END IF;
END$$

DELIMITER ;

