USE webrpg;

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

-- 1. USERS
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

-- 2. LEARNER PROFILES
INSERT INTO learner_profiles (user_id, first_name, last_name, age, sex, total_xp, current_level) VALUES
(2, 'Kiro', 'Santos', 14, 'Male', 450, 4),
(3, 'Valerie', 'Reyes', 15, 'Female', 520, 5),
(4, 'Jax', 'Mendoza', 16, 'Male', 610, 6),
(5, 'Mia', 'Dela Cruz', 17, 'Female', 590, 5),
(6, 'Kenji', 'Bautista', 18, 'Male', 480, 4),
(7, 'Tala', 'Villanueva', 19, 'Female', 700, 7),
(8, 'Enzo', 'Ramos', 20, 'Male', 640, 6),
(9, 'Luna', 'Aquino', 23, 'Female', 530, 5);

-- 3. LOCATIONS
INSERT INTO locations (location_id, location_name, description, unlock_xp_required, display_order) VALUES
(1, 'Sector 01: Neo-Intramuros', 'The walled cyber-district where new Runners calibrate their neural links.', 0, 1),
(2, 'Sector 02: Cobalt Docks', 'High-traffic data routing port guarded by automated cargo drones.', 100, 2),
(3, 'Sector 03: Violet Spire', 'Corporate megatower housing high-density memory banks and neural servers.', 250, 3),
(4, 'Sector 04: Synth Bazaar', 'Underground night market where encrypted protocols and keys are traded.', 450, 4),
(5, 'Sector 05: Blackwall Core', 'The deep-net frontier fortified by autonomous AI countermeasures.', 700, 5);

-- 4. LESSONS (5 Editable Modules)
INSERT INTO lessons (lesson_id, location_id, title, content, xp_reward, lesson_order, created_by, updated_by) VALUES
(1, 1, 'Lesson 1: Neural Link & Fundamentals', 'Welcome to Neo-Intramuros, Runner. Before exploring the grid, you must initialize your HUD, understand core system variables, and establish a stable neural handshake with local terminals.', 50, 1, 1, 1),
(2, 2, 'Lesson 2: Data Packet Routing & Logic', 'Every terminal in Cobalt Docks communicates through conditional routing. Master IF/ELSE logic gates and packet inspection to bypass damaged sector relays.', 75, 2, 1, 1),
(3, 3, 'Lesson 3: Memory Allocation & Loops', 'Inside the Violet Spire, repetitive decryption routines require iterative loops. Configure WHILE and FOR subroutines without triggering a buffer overflow.', 100, 3, 1, 1),
(4, 4, 'Lesson 4: Cryptographic Arrays & Functions', 'Brokers in the Synth Bazaar store cipher keys inside indexed data arrays. Build modular functions to query, sort, and validate multi-key signatures.', 125, 4, 1, 1),
(5, 5, 'Lesson 5: Autonomous AI Countermeasures', 'You have reached the Blackwall Core. Combine variables, control flow, loops, and modular functions to defeat the core guardian in the final evaluation.', 200, 5, 1, 1);

-- 5. SEED 35 ASSESSMENTS (No Stored Procedure needed)
INSERT INTO assessments (assessment_id, lesson_id, assessment_type, title, passing_score, xp_reward)
SELECT 
  (l.lesson_id - 1) * 7 + t.idx AS assessment_id,
  l.lesson_id,
  t.a_type,
  CONCAT('Lesson ', l.lesson_id, ' - ', t.label) AS title,
  70.00,
  t.xp
FROM lessons l
CROSS JOIN (
  SELECT 1 AS idx, 'pre_test' AS a_type, 'Pre-Test Diagnostic' AS label, 50 AS xp UNION ALL
  SELECT 2, 'mission_1', 'Mission 01 Task', 20 UNION ALL
  SELECT 3, 'mission_2', 'Mission 02 Task', 20 UNION ALL
  SELECT 4, 'mission_3', 'Mission 03 Task', 20 UNION ALL
  SELECT 5, 'mission_4', 'Mission 04 Task', 20 UNION ALL
  SELECT 6, 'mission_5', 'Mission 05 Task', 20 UNION ALL
  SELECT 7, 'post_test', 'Post-Test Boss Evaluation', 50
) t
ORDER BY assessment_id;

-- 6. SEED 225 QUESTIONS (10 for pre/post, 5 for missions)
INSERT INTO questions (assessment_id, question_text, points, question_order, updated_by)
SELECT 
  a.assessment_id,
  CONCAT('[L', a.lesson_id, ' // ', UPPER(a.assessment_type), ' // Q', n.q_num, '] Verify system protocol response for node #', n.q_num, '?'),
  1,
  n.q_num,
  1
FROM assessments a
JOIN (
  SELECT 1 AS q_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) n ON (a.assessment_type IN ('pre_test', 'post_test') AND n.q_num <= 10)
    OR (a.assessment_type NOT IN ('pre_test', 'post_test') AND n.q_num <= 5)
ORDER BY a.assessment_id, n.q_num;

-- 7. SEED 900 ANSWER OPTIONS (4 per Question)
INSERT INTO answer_options (question_id, option_text, is_correct)
SELECT 
  q.question_id,
  CONCAT(o.prefix, q.question_order, o.suffix),
  o.is_corr
FROM questions q
CROSS JOIN (
  SELECT 'Option A: Execute primary neural protocol #' AS prefix, ' (Correct)' AS suffix, 1 AS is_corr UNION ALL
  SELECT 'Option B: Bypass sector firewall node #', '', 0 UNION ALL
  SELECT 'Option C: Terminate packet stream #', '', 0 UNION ALL
  SELECT 'Option D: Flush local memory buffer #', '', 0
) o
ORDER BY q.question_id, o.is_corr DESC;

-- 8. SEED ATTEMPTS & PROGRESS
INSERT INTO assessment_attempts (user_id, assessment_id, score, is_passed) VALUES
(2, 1, 80.00, 1), (3, 1, 90.00, 1), (4, 2, 100.00, 1), (5, 3, 80.00, 1), (6, 4, 100.00, 1),
(7, 5, 90.00, 1), (8, 6, 80.00, 1), (9, 7, 90.00, 1), (2, 7, 90.00, 1), (3, 7, 60.00, 0),
(2, 8, 70.00, 1), (3, 9, 80.00, 1), (4, 10, 100.00, 1), (5, 11, 80.00, 1),
(6, 12, 60.00, 0), (7, 14, 90.00, 1), (8, 14, 90.00, 1),
(2, 15, 70.00, 1), (4, 16, 80.00, 1), (5, 18, 80.00,