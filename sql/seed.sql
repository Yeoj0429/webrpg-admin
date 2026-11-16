USE webrpg;

-- Clear existing data cleanly (if re-running)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE xp_transactions;
TRUNCATE TABLE learner_lesson_progress;
TRUNCATE TABLE learner_answers;
TRUNCATE TABLE assessment_attempts;
TRUNCATE TABLE answer_options;
TRUNCATE TABLE questions;
TRUNCATE TABLE assessments;
TRUNCATE TABLE lessons;
TRUNCATE TABLE locations;
TRUNCATE TABLE learner_profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 1. SEED USERS (1 Admin + 8 Learners)
-- ==========================================================
INSERT INTO users (user_id, username, email, password_hash, role, account_status) VALUES
(1, 'admin_webrpg', 'admin@webrpg.com', '$2a$12$ExampleHashedPasswordStringHere', 'admin', 'active'),
(2, 'runner_kiro', 'kiro@webrpg.com', '$2a$12$Hash01', 'learner', 'active'),
(3, 'net_valerie', 'valerie@webrpg.com', '$2a$12$Hash02', 'learner', 'active'),
(4, 'chrome_jax', 'jax@webrpg.com', '$2a$12$Hash03', 'learner', 'active'),
(5, 'synapse_mia', 'mia@webrpg.com', '$2a$12$Hash04', 'learner', 'active'),
(6, 'zero_kenji', 'kenji@webrpg.com', '$2a$12$Hash05', 'learner', 'active'),
(7, 'pulse_tala', 'tala@webrpg.com', '$2a$12$Hash06', 'learner', 'active'),
(8, 'glitch_enzo', 'enzo@webrpg.com', '$2a$12$Hash07', 'learner', 'active'),
(9, 'vortex_luna', 'luna@webrpg.com', '$2a$12$Hash08', 'learner', 'active');

-- ==========================================================
-- 2. SEED LEARNER PROFILES (Demographics: Age Groups & XP)
-- ==========================================================
INSERT INTO learner_profiles (user_id, first_name, last_name, age, sex, total_xp, current_level) VALUES
(2, 'Kiro', 'Santos', 14, 'Male', 450, 4),
(3, 'Valerie', 'Reyes', 15, 'Female', 520, 5),
(4, 'Jax', 'Mendoza', 16, 'Male', 610, 6),
(5, 'Mia', 'Dela Cruz', 17, 'Female', 590, 5),
(6, 'Kenji', 'Bautista', 18, 'Male', 480, 4),
(7, 'Tala', 'Villanueva', 19, 'Female', 700, 7),
(8, 'Enzo', 'Ramos', 20, 'Male', 640, 6),
(9, 'Luna', 'Aquino', 23, 'Female', 530, 5);

-- ==========================================================
-- 3. SEED 5 EXPLORABLE GAME LOCATIONS
-- ==========================================================
INSERT INTO locations (location_id, location_name, description, unlock_xp_required, display_order) VALUES
(1, 'Sector 01: Neo-Intramuros', 'The walled cyber-district where new Runners calibrate their neural links.', 0, 1),
(2, 'Sector 02: Cobalt Docks', 'High-traffic data routing port guarded by automated cargo drones.', 100, 2),
(3, 'Sector 03: Violet Spire', 'Corporate megatower housing high-density memory banks and neural servers.', 250, 3),
(4, 'Sector 04: Synth Bazaar', 'Underground night market where encrypted protocols and keys are traded.', 450, 4),
(5, 'Sector 05: Blackwall Core', 'The deep-net frontier fortified by autonomous AI countermeasures.', 700, 5);

-- ==========================================================
-- 4. SEED 5 LESSON MODULES (Editable by Admin)
-- ==========================================================
INSERT INTO lessons (lesson_id, location_id, title, content, xp_reward, lesson_order, created_by, updated_by) VALUES
(1, 1, 'Lesson 1: Neural Link & Fundamentals', 'Welcome to Neo-Intramuros, Runner. Before exploring the grid, you must initialize your HUD, understand core system variables, and establish a stable neural handshake with local terminals.', 50, 1, 1, 1),
(2, 2, 'Lesson 2: Data Packet Routing & Logic', 'Every terminal in Cobalt Docks communicates through conditional routing. Master IF/ELSE logic gates and packet inspection to bypass damaged sector relays.', 75, 2, 1, 1),
(3, 3, 'Lesson 3: Memory Allocation & Loops', 'Inside the Violet Spire, repetitive decryption routines require iterative loops. Configure WHILE and FOR subroutines without triggering a buffer overflow.', 100, 3, 1, 1),
(4, 4, 'Lesson 4: Cryptographic Arrays & Functions', 'Brokers in the Synth Bazaar store cipher keys inside indexed data arrays. Build modular functions to query, sort, and validate multi-key signatures.', 125, 4, 1, 1),
(5, 5, 'Lesson 5: Autonomous AI Countermeasures', 'You have reached the Blackwall Core. Combine variables, control flow, loops, and modular functions to defeat the core guardian in the final evaluation.', 200, 5, 1, 1);

-- ==========================================================
-- 5. SEED 35 ASSESSMENTS, 225 QUESTIONS & 900 OPTIONS
--    (Per Lesson: 1 Pre-Test [10 Qs], 5 Missions [5 Qs each], 1 Post-Test [10 Qs])
-- ==========================================================
DROP PROCEDURE IF EXISTS seed_assessments_and_questions;
DELIMITER $$

CREATE PROCEDURE seed_assessments_and_questions()
BEGIN
    DECLARE v_lesson INT DEFAULT 1;
    DECLARE v_assess_idx INT;
    DECLARE v_assess_type VARCHAR(20);
    DECLARE v_assess_title VARCHAR(150);
    DECLARE v_q_count INT;
    DECLARE v_q_idx INT;
    DECLARE v_assess_id INT;
    DECLARE v_question_id INT;

    WHILE v_lesson <= 5 DO
        SET v_assess_idx = 1;

        WHILE v_assess_idx <= 7 DO
            IF v_assess_idx = 1 THEN
                SET v_assess_type = 'pre_test';
                SET v_assess_title = CONCAT('Lesson ', v_lesson, ' Pre-Test Diagnostic');
                SET v_q_count = 10;
            ELSEIF v_assess_idx = 7 THEN
                SET v_assess_type = 'post_test';
                SET v_assess_title = CONCAT('Lesson ', v_lesson, ' Post-Test Boss Evaluation');
                SET v_q_count = 10;
            ELSE
                SET v_assess_type = CONCAT('mission_', v_assess_idx - 1);
                SET v_assess_title = CONCAT('Lesson ', v_lesson, ' - Mission 0', v_assess_idx - 1, ' Task');
                SET v_q_count = 5;
            END IF;

            -- Insert the Assessment
            INSERT INTO assessments (lesson_id, assessment_type, title, passing_score, xp_reward)
            VALUES (v_lesson, v_assess_type, v_assess_title, 70.00, IF(v_q_count = 10, 50, 20));

            SET v_assess_id = LAST_INSERT_ID();
            SET v_q_idx = 1;

            -- Insert Questions (10 for pre/post, 5 for missions)
            WHILE v_q_idx <= v_q_count DO
                INSERT INTO questions (assessment_id, question_text, points, question_order, updated_by)
                VALUES (
                    v_assess_id,
                    CONCAT('[L', v_lesson, ' // ', UPPER(v_assess_type), ' // Q', v_q_idx, '] Verify system protocol response for node #', v_q_idx, '?'),
                    1,
                    v_q_idx,
                    1
                );

                SET v_question_id = LAST_INSERT_ID();

                -- Insert 4 Multiple-Choice Options per Question (Option A is default correct)
                INSERT INTO answer_options (question_id, option_text, is_correct) VALUES
                (v_question_id, CONCAT('Option A: Execute primary neural protocol #', v_q_idx, ' (Correct)'), 1),
                (v_question_id, CONCAT('Option B: Bypass sector firewall node #', v_q_idx), 0),
                (v_question_id, CONCAT('Option C: Terminate packet stream #', v_q_idx), 0),
                (v_question_id, CONCAT('Option D: Flush local memory buffer #', v_q_idx), 0);

                SET v_q_idx = v_q_idx + 1;
            END WHILE;

            SET v_assess_idx = v_assess_idx + 1;
        END WHILE;

        SET v_lesson = v_lesson + 1;
    END WHILE;
END$$

DELIMITER ;

CALL seed_assessments_and_questions();
DROP PROCEDURE IF EXISTS seed_assessments_and_questions;

-- ==========================================================
-- 6. SEED ASSESSMENT ATTEMPTS & LESSON PROGRESS
--    (Matches doc example: Lesson 1 ~90% success rate, Lesson 5 ~78% success rate)
-- ==========================================================
INSERT INTO assessment_attempts (user_id, assessment_id, score, is_passed) VALUES
-- Lesson 1 Attempts (Assessments 1-7): High pass rate (~90% success, ~88% avg score)
(2, 1, 80.00, 1), (3, 1, 90.00, 1), (4, 2, 100.00, 1), (5, 3, 80.00, 1), (6, 4, 100.00, 1),
(7, 5, 90.00, 1), (8, 6, 80.00, 1), (9, 7, 90.00, 1), (2, 7, 90.00, 1), (3, 7, 60.00, 0),

-- Lesson 2 Attempts (Assessments 8-14): ~86% success rate
(2, 8, 70.00, 1), (3, 9, 80.00, 1), (4, 10, 100.00, 1), (5, 11, 80.00, 1),
(6, 12, 60.00, 0), (7, 14, 90.00, 1), (8, 14, 90.00, 1),

-- Lesson 3 Attempts (Assessments 15-21): ~83% success rate
(2, 15, 70.00, 1), (4, 16, 80.00, 1), (5, 18, 80.00, 1),
(7, 20, 100.00, 1), (8, 21, 90.00, 1), (9, 21, 60.00, 0),

-- Lesson 4 Attempts (Assessments 22-28): ~80% success rate
(3, 22, 70.00, 1), (4, 24, 80.00, 1), (6, 25, 60.00, 0),
(7, 27, 80.00, 1), (8, 28, 90.00, 1),

-- Lesson 5 Attempts (Assessments 29-35): ~78% success rate (7 of 9 passed)
(2, 29, 70.00, 1), (3, 30, 80.00, 1), (4, 31, 80.00, 1), (5, 32, 60.00, 0),
(6, 33, 80.00, 1), (7, 34, 80.00, 1), (8, 35, 90.00, 1), (9, 35, 60.00, 0), (7, 35, 90.00, 1);

INSERT INTO learner_lesson_progress (user_id, lesson_id, status, completed_at) VALUES
(2, 1, 'completed', NOW()), (3, 1, 'completed', NOW()), (4, 1, 'completed', NOW()),
(5, 1, 'completed', NOW()), (7, 2, 'completed', NOW()), (8, 3, 'completed', NOW()),
(7, 5, 'completed', NOW()), (8, 5, 'in_progress', NULL);