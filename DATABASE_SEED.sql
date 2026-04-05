-- SplitMint Database Seed Data
-- Run this after creating tables to populate with sample data

-- Sample Users
INSERT INTO users (id, email, name, hashed_password, is_active, created_at) VALUES
(1, 'john@example.com', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', true, NOW()),
(2, 'jane@example.com', 'Jane Smith', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', true, NOW()),
(3, 'bob@example.com', 'Bob Johnson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', true, NOW()),
(4, 'alice@example.com', 'Alice Brown', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', true, NOW());

-- Sample Groups
INSERT INTO groups (id, name, created_by, created_at) VALUES
(1, 'Roommates', 1, NOW()),
(2, 'Trip to Vegas', 2, NOW()),
(3, 'Dinner Club', 3, NOW());

-- Group Members
INSERT INTO group_members (group_id, user_id, joined_at) VALUES
(1, 1, NOW()),
(1, 2, NOW()),
(1, 3, NOW()),
(2, 2, NOW()),
(2, 3, NOW()),
(2, 4, NOW()),
(3, 1, NOW()),
(3, 3, NOW()),
(3, 4, NOW());

-- Sample Expenses
INSERT INTO expenses (id, group_id, payer_id, amount, description, split_mode, date, created_at) VALUES
(1, 1, 1, 120.00, 'Groceries', 'equal', NOW() - INTERVAL '2 days', NOW()),
(2, 1, 2, 60.00, 'Pizza Night', 'equal', NOW() - INTERVAL '1 day', NOW()),
(3, 2, 2, 300.00, 'Hotel Room', 'equal', NOW() - INTERVAL '3 days', NOW()),
(4, 2, 3, 150.00, 'Show Tickets', 'equal', NOW() - INTERVAL '2 days', NOW()),
(5, 3, 3, 200.00, 'Restaurant Dinner', 'equal', NOW() - INTERVAL '1 day', NOW()),
(6, 3, 1, 80.00, 'Drinks', 'equal', NOW(), NOW());

-- Expense Splits (Equal splits)
-- Expense 1: $120 split 3 ways = $40 each
INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
(1, 1, 40.00, 33.33),
(1, 2, 40.00, 33.33),
(1, 3, 40.00, 33.33);

-- Expense 2: $60 split 3 ways = $20 each
INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
(2, 1, 20.00, 33.33),
(2, 2, 20.00, 33.33),
(2, 3, 20.00, 33.33);

-- Expense 3: $300 split 3 ways = $100 each
INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
(3, 2, 100.00, 33.33),
(3, 3, 100.00, 33.33),
(3, 4, 100.00, 33.33);

-- Expense 4: $150 split 3 ways = $50 each
INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
(4, 2, 50.00, 33.33),
(4, 3, 50.00, 33.33),
(4, 4, 50.00, 33.33);

-- Expense 5: $200 split 3 ways = $66.67 each
INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
(5, 1, 66.67, 33.33),
(5, 3, 66.67, 33.33),
(5, 4, 66.67, 33.33);

-- Expense 6: $80 split 3 ways = $26.67 each
INSERT INTO expense_splits (expense_id, user_id, amount, percentage) VALUES
(6, 1, 26.67, 33.33),
(6, 3, 26.67, 33.33),
(6, 4, 26.67, 33.33);

-- Note: Balances will be calculated automatically by the balance calculation service
-- Run the balance calculation after inserting this data to populate the balances table
