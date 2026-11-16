CREATE DATABASE IF NOT EXISTS webrpg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE webrpg;

-- 1. Learner and administrator accounts
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('learner', 'admin') NOT NULL DEFAULT 'learner',
    account_status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Additional learner information (age, sex, XP, level)
CREATE TABLE learner_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    age INT NULL CHECK (age >= 0),
    sex VARCHAR(20) NULL,
    total_xp INT NOT NULL DEFAULT 0,
    current_level INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_learner_profiles_users FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Five explorable game locations
CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    unlock_xp_required INT NOT NULL DEFAULT 0,
    display_order INT NOT NULL
);

-- 4. Educational content (5 Total Lessons, editable by admin)
CREATE TABLE lessons (
    lesson_id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content LONGTEXT NOT NULL,
    xp_reward INT NOT NULL DEFAULT 10,
    lesson_order INT NOT NULL,
    created_by INT NULL,
    updated_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lessons_locations FOREIGN KEY (location_id) REFERENCES locations(location_id),
    CONSTRAINT fk_lessons_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_lessons_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- 5. Lesson quizzes (7 per lesson: 1 pre_test, 5 mission, 1 post_test)
CREATE TABLE assessments (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    assessment_type ENUM('pre_test', 'mission_1', 'mission_2', 'mission_3', 'mission_4', 'mission_5', 'post_test') NOT NULL,
    title VARCHAR(150) NOT NULL,
    passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    xp_reward INT NOT NULL DEFAULT 20,
    CONSTRAINT fk_assessments_lessons FOREIGN KEY (lesson_id) 
        REFERENCES lessons(lesson_id) ON DELETE CASCADE
);

-- 6. Assessment questions (Individually editable by admin)
CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    question_text TEXT NOT NULL,
    points INT NOT NULL DEFAULT 1,
    question_order INT NOT NULL,
    updated_by INT NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_assessments FOREIGN KEY (assessment_id) 
        REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_updated_by FOREIGN KEY (updated_by) 
        REFERENCES users(user_id)
);

-- 7. Multiple-choice options (4 options per question)
CREATE TABLE answer_options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_answer_options_questions FOREIGN KEY (question_id) 
        REFERENCES questions(question_id) ON DELETE CASCADE
);

-- 8. Learner assessment attempts and scores
CREATE TABLE assessment_attempts (
    attempt_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    is_passed TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempts_users FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_attempts_assessments FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id)
);

-- 9. Individual answers submitted by learners
CREATE TABLE learner_answers (
    learner_answer_id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT NOT NULL,
    is_correct TINYINT(1) NOT NULL,
    CONSTRAINT fk_learner_answers_attempts FOREIGN KEY (attempt_id) 
        REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
    CONSTRAINT fk_learner_answers_questions FOREIGN KEY (question_id) REFERENCES questions(question_id),
    CONSTRAINT fk_learner_answers_options FOREIGN KEY (selected_option_id) REFERENCES answer_options(option_id)
);

-- 10. Lesson completion and progress
CREATE TABLE learner_lesson_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
    completed_at DATETIME NULL,
    UNIQUE KEY uq_user_lesson (user_id, lesson_id),
    CONSTRAINT fk_progress_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_lessons FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
);

-- 11. XP Ledger
CREATE TABLE xp_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    xp_amount INT NOT NULL,
    source_type ENUM('lesson', 'assessment', 'bonus') NOT NULL,
    source_id INT NULL,
    earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_xp_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);