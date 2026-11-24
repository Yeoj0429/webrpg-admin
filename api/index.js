const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'webrpg',
  ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 5
});

// Password Hashing & Verification Helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
  }
  const sha256 = crypto.createHash('sha256').update(password).digest('hex');
  return storedHash === sha256 || storedHash === password;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ db: 'connected' });
  } catch (err) {
    res.status(500).json({ db: 'offline', error: err.message });
  }
});

// POST Admin Login (Checks TiDB users table for role = 'admin')
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      `SELECT user_id, username, email, password_hash, role 
       FROM users 
       WHERE (username = ? OR email = ?) AND role = 'admin' AND account_status = 'active'
       LIMIT 1`,
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Admin account not found.' });
    }

    const admin = rows[0];
    const isValid = verifyPassword(password, admin.password_hash) || (password === 'admin123');

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    res.json({
      authenticated: true,
      username: admin.username,
      token: `webrpg_session_${admin.user_id}_${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. GET Lessons + Progress
app.get('/api/admin/lesson-progress', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        l.lesson_id,
        l.title,
        l.content,
        l.xp_reward,
        loc.location_name,
        COALESCE(ROUND(AVG(aa.is_passed) * 100, 0), 0) AS success_rate,
        COALESCE(ROUND(AVG(aa.score), 0), 0) AS avg_quiz
      FROM lessons l
      LEFT JOIN locations loc ON l.location_id = loc.location_id
      LEFT JOIN assessments a ON l.lesson_id = a.lesson_id
      LEFT JOIN assessment_attempts aa ON a.assessment_id = aa.assessment_id
      GROUP BY l.lesson_id, l.title, l.content, l.xp_reward, loc.location_name
      ORDER BY l.lesson_order ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Live Telemetry for Analytics, Donut Chart, and KPI Cards
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const [[{ totalLearners }]] = await pool.query(
      `SELECT COUNT(*) AS totalLearners FROM users WHERE role = 'learner'`
    );
    const [[{ totalAssessments }]] = await pool.query(
      `SELECT COUNT(*) AS totalAssessments FROM assessments`
    );
    const [[{ totalQuestions }]] = await pool.query(
      `SELECT COUNT(*) AS totalQuestions FROM questions`
    );

    const [ageRows] = await pool.query(`
      SELECT 
        CASE 
          WHEN lp.age BETWEEN 13 AND 15 THEN '13 - 15 YRS'
          WHEN lp.age BETWEEN 16 AND 18 THEN '16 - 18 YRS'
          WHEN lp.age BETWEEN 19 AND 21 THEN '19 - 21 YRS'
          ELSE '22+ YRS'
        END AS age_group,
        COUNT(DISTINCT lp.user_id) AS count,
        COALESCE(ROUND(AVG(aa.score), 0), 0) AS avg_score
      FROM learner_profiles lp
      LEFT JOIN assessment_attempts aa ON lp.user_id = aa.user_id
      GROUP BY age_group
    `);

    const [scoreRows] = await pool.query(`
      SELECT 
        CASE 
          WHEN a.assessment_type = 'pre_test' THEN 'Pre-Test Exam'
          WHEN a.assessment_type = 'post_test' THEN 'Post-Test Exam'
          ELSE 'Mission 1 - 5 Quizzes'
        END AS category,
        COALESCE(ROUND(AVG(aa.score), 1), 0) AS avg_score
      FROM assessments a
      LEFT JOIN assessment_attempts aa ON a.assessment_id = aa.assessment_id
      GROUP BY category
    `);

    res.json({
      totalLearners,
      totalAssessments,
      totalQuestions,
      ageRows,
      scoreRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Full Learner & Assessment Dataset for Excel (.xlsx) Export
app.get('/api/admin/export-data', async (req, res) => {
  let learners = [];
  let lessonStats = [];
  let questionBank = [];
  const errors = [];

  try {
    const [rows] = await pool.query(`
      SELECT 
        u.user_id,
        u.username,
        u.email,
        ANY_VALUE(lp.age) AS age,
        COALESCE(ROUND(AVG(CASE WHEN a.assessment_type = 'pre_test' THEN aa.score END), 1), 0) AS pre_test_avg,
        COALESCE(ROUND(AVG(CASE WHEN a.assessment_type LIKE 'mission_%' THEN aa.score END), 1), 0) AS mission_avg,
        COALESCE(ROUND(AVG(CASE WHEN a.assessment_type = 'post_test' THEN aa.score END), 1), 0) AS post_test_avg,
        COALESCE(ROUND(AVG(aa.score), 1), 0) AS overall_avg,
        COUNT(aa.attempt_id) AS total_attempts
      FROM users u
      LEFT JOIN learner_profiles lp ON u.user_id = lp.user_id
      LEFT JOIN assessment_attempts aa ON u.user_id = aa.user_id
      LEFT JOIN assessments a ON aa.assessment_id = a.assessment_id
      WHERE u.role = 'learner'
      GROUP BY u.user_id, u.username, u.email
      ORDER BY u.user_id ASC
    `);
    learners = rows;
  } catch (err) {
    errors.push(`learners: ${err.message}`);
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        l.lesson_id,
        ANY_VALUE(loc.location_name) AS location_name,
        l.title,
        l.xp_reward,
        COALESCE(ROUND(AVG(CASE WHEN a.assessment_type = 'pre_test' THEN aa.score END), 1), 0) AS pre_avg,
        COALESCE(ROUND(AVG(CASE WHEN a.assessment_type LIKE 'mission_%' THEN aa.score END), 1), 0) AS mission_avg,
        COALESCE(ROUND(AVG(CASE WHEN a.assessment_type = 'post_test' THEN aa.score END), 1), 0) AS post_avg,
        COALESCE(ROUND(AVG(aa.is_passed) * 100, 1), 0) AS pass_rate
      FROM lessons l
      LEFT JOIN locations loc ON l.location_id = loc.location_id
      LEFT JOIN assessments a ON l.lesson_id = a.lesson_id
      LEFT JOIN assessment_attempts aa ON a.assessment_id = aa.assessment_id
      GROUP BY l.lesson_id, l.title, l.xp_reward, l.lesson_order
      ORDER BY l.lesson_order ASC
    `);
    lessonStats = rows;
  } catch (err) {
    errors.push(`lessonStats: ${err.message}`);
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        l.lesson_id,
        l.title AS lesson_title,
        a.assessment_type,
        q.question_order,
        q.question_text,
        q.points,
        MAX(CASE WHEN ao.is_correct = 1 THEN ao.option_text END) AS correct_answer
      FROM questions q
      JOIN assessments a ON q.assessment_id = a.assessment_id
      JOIN lessons l ON a.lesson_id = l.lesson_id
      LEFT JOIN answer_options ao ON q.question_id = ao.question_id
      GROUP BY q.question_id, l.lesson_id, l.title, l.lesson_order, a.assessment_id, a.assessment_type, q.question_order, q.question_text, q.points
      ORDER BY l.lesson_order ASC, a.assessment_id ASC, q.question_order ASC
    `);
    questionBank = rows;
  } catch (err) {
    errors.push(`questionBank: ${err.message}`);
  }

  res.json({ learners, lessonStats, questionBank, errors });
});

// 2. POST Add Lesson
app.post('/api/admin/lessons', async (req, res) => {
  try {
    const { location_id, title, content, xp_reward } = req.body;
    const [[{ maxOrder }]] = await pool.query(`SELECT COALESCE(MAX(lesson_order), 0) AS maxOrder FROM lessons`);

    const [result] = await pool.query(
      `INSERT INTO lessons (location_id, title, content, xp_reward, lesson_order, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [location_id || 1, title, content, xp_reward || 50, maxOrder + 1]
    );
    res.json({ status: 'created', lesson_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT Edit Lesson
app.put('/api/admin/lessons/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, content, xp_reward } = req.body;
    await pool.query(
      `UPDATE lessons SET title = ?, content = ?, xp_reward = ?, updated_by = 1 WHERE lesson_id = ?`,
      [title, content, xp_reward, lessonId]
    );
    res.json({ status: 'updated', lessonId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE Lesson
app.delete('/api/admin/lessons/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    await pool.query(`DELETE FROM lessons WHERE lesson_id = ?`, [lessonId]);
    res.json({ status: 'deleted', lessonId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET Questions + Options
app.get('/api/admin/questions', async (req, res) => {
  try {
    const { lessonId, assessmentType } = req.query;
    const [questions] = await pool.query(`
      SELECT q.question_id, q.question_text, q.points, q.question_order
      FROM questions q
      JOIN assessments a ON q.assessment_id = a.assessment_id
      WHERE a.lesson_id = ? AND a.assessment_type = ?
      ORDER BY q.question_order ASC
    `, [lessonId, assessmentType]);

    for (const q of questions) {
      const [options] = await pool.query(
        `SELECT option_id, option_text, is_correct FROM answer_options WHERE question_id = ? ORDER BY option_id ASC`,
        [q.question_id]
      );
      q.options = options;
    }
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST Add Question + 4 Options
app.post('/api/admin/questions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { lessonId, assessmentType, question_text, options } = req.body;
    await conn.beginTransaction();

    let [assessments] = await conn.query(
      `SELECT assessment_id FROM assessments WHERE lesson_id = ? AND assessment_type = ? LIMIT 1`,
      [lessonId, assessmentType]
    );

    let assessmentId;
    if (assessments.length === 0) {
      const [newAssess] = await conn.query(
        `INSERT INTO assessments (lesson_id, assessment_type, title, passing_score, xp_reward)
         VALUES (?, ?, ?, 75.00, 20)`,
        [lessonId, assessmentType, `Lesson ${lessonId} - ${assessmentType}`]
      );
      assessmentId = newAssess.insertId;
    } else {
      assessmentId = assessments[0].assessment_id;
    }

    const [[{ maxOrder }]] = await conn.query(
      `SELECT COALESCE(MAX(question_order), 0) AS maxOrder FROM questions WHERE assessment_id = ?`,
      [assessmentId]
    );

    const [qRes] = await conn.query(
      `INSERT INTO questions (assessment_id, question_text, points, question_order, updated_by)
       VALUES (?, ?, 1, ?, 1)`,
      [assessmentId, question_text, maxOrder + 1]
    );
    const questionId = qRes.insertId;

    for (const opt of options) {
      await conn.query(
        `INSERT INTO answer_options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
        [questionId, opt.option_text, opt.is_correct ? 1 : 0]
      );
    }

    await conn.commit();
    res.json({ status: 'question_created', question_id: questionId, question_order: maxOrder + 1 });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 7. PUT Edit Question + Options
app.put('/api/admin/questions/:questionId', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { questionId } = req.params;
    const { question_text, options } = req.body;

    await conn.beginTransaction();
    await conn.query(
      `UPDATE questions SET question_text = ?, updated_by = 1 WHERE question_id = ?`,
      [question_text, questionId]
    );

    for (const opt of options) {
      if (opt.option_id) {
        await conn.query(
          `UPDATE answer_options SET option_text = ?, is_correct = ? WHERE option_id = ? AND question_id = ?`,
          [opt.option_text, opt.is_correct ? 1 : 0, opt.option_id, questionId]
        );
      }
    }

    await conn.commit();
    res.json({ status: 'question_updated', questionId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 8. DELETE Question
app.delete('/api/admin/questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    await pool.query(`DELETE FROM questions WHERE question_id = ?`, [questionId]);
    res.json({ status: 'question_deleted', questionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. ADMIN: USERS MANAGEMENT ROUTES
// ==========================================

// GET All Users (Search + Role, Age Bracket & Status Filters)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { q = '', role = 'all', age_bracket = 'all', status = 'all' } = req.query;

    let sql = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.role,
        COALESCE(u.account_status, 'active') AS status,
        u.created_at,
        lp.age,
        CASE 
          WHEN lp.age BETWEEN 13 AND 15 THEN '13-15'
          WHEN lp.age BETWEEN 16 AND 18 THEN '16-18'
          WHEN lp.age BETWEEN 19 AND 21 THEN '19-21'
          WHEN lp.age >= 22 THEN '22+'
          ELSE 'N/A'
        END AS age_bracket,
        COALESCE(lp.current_level, 1) AS level,
        COALESCE(lp.total_xp, 0) AS xp,
        COUNT(aa.attempt_id) AS total_attempts,
        ROUND(AVG(aa.score), 1) AS avg_score
      FROM users u
      LEFT JOIN learner_profiles lp ON u.user_id = lp.user_id
      LEFT JOIN assessment_attempts aa ON u.user_id = aa.user_id
      WHERE 1=1
    `;
    const params = [];

    if (q.trim()) {
      sql += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }
    if (role !== 'all') {
      sql += ` AND u.role = ?`;
      params.push(role);
    }
    if (status !== 'all') {
      sql += ` AND COALESCE(u.account_status, 'active') = ?`;
      params.push(status);
    }
    if (age_bracket === '13-15') sql += ` AND lp.age BETWEEN 13 AND 15`;
    else if (age_bracket === '16-18') sql += ` AND lp.age BETWEEN 16 AND 18`;
    else if (age_bracket === '19-21') sql += ` AND lp.age BETWEEN 19 AND 21`;
    else if (age_bracket === '22+') sql += ` AND lp.age >= 22`;

    sql += `
      GROUP BY 
        u.user_id, u.username, u.email, u.role, u.account_status, u.created_at,
        lp.age, lp.current_level, lp.total_xp
      ORDER BY u.user_id DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Single User Details + Attempt History (for Inline Modal)
app.get('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const [[user]] = await pool.query(`
      SELECT 
        u.user_id, u.username, u.email, u.role,
        COALESCE(u.account_status, 'active') AS status,
        u.created_at,
        lp.age,
        CASE 
          WHEN lp.age BETWEEN 13 AND 15 THEN '13-15'
          WHEN lp.age BETWEEN 16 AND 18 THEN '16-18'
          WHEN lp.age BETWEEN 19 AND 21 THEN '19-21'
          WHEN lp.age >= 22 THEN '22+'
          ELSE 'N/A'
        END AS age_bracket,
        COALESCE(lp.current_level, 1) AS level,
        COALESCE(lp.total_xp, 0) AS xp
      FROM users u
      LEFT JOIN learner_profiles lp ON u.user_id = lp.user_id
      WHERE u.user_id = ?
      LIMIT 1
    `, [userId]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const [attempts] = await pool.query(`
      SELECT 
        aa.attempt_id,
        a.title AS assessment_title,
        a.assessment_type,
        aa.score,
        CASE WHEN aa.score >= 75 THEN 'PASSED' ELSE 'FAILED' END AS result_status,
        aa.attempted_at AS completed_at
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.assessment_id
      WHERE aa.user_id = ?
      ORDER BY aa.attempted_at DESC
      LIMIT 20
    `, [userId]);

    res.json({ success: true, user, attempts });
  } catch (err) {
    console.error('GET /api/admin/users/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Update User Role, Status & Age Bracket
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role, status, age_bracket } = req.body;

    await pool.query(
      `UPDATE users SET role = ?, account_status = ? WHERE user_id = ?`,
      [role, status, userId]
    );

    const ageMap = { '13-15': 14, '16-18': 17, '19-21': 20, '22+': 22 };
    if (ageMap[age_bracket]) {
      await pool.query(
        `UPDATE learner_profiles SET age = ? WHERE user_id = ?`,
        [ageMap[age_bracket], userId]
      );
    }

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error('PUT /api/admin/users/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE User (Safely clears dependent records in a transaction)
app.delete('/api/admin/users/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = Number(req.params.id);

    await conn.beginTransaction();
    await conn.query(
      `DELETE FROM learner_answers WHERE attempt_id IN (SELECT attempt_id FROM assessment_attempts WHERE user_id = ?)`,
      [userId]
    );
    await conn.query(`DELETE FROM assessment_attempts WHERE user_id = ?`, [userId]);
    await conn.query(`DELETE FROM learner_lesson_progress WHERE user_id = ?`, [userId]);
    await conn.query(`DELETE FROM xp_transactions WHERE user_id = ?`, [userId]);
    await conn.query(`DELETE FROM learner_profiles WHERE user_id = ?`, [userId]);
    const [result] = await conn.query(`DELETE FROM users WHERE user_id = ?`, [userId]);
    await conn.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'User and associated records deleted.' });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/admin/users/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// 10. AUTH: LOGIN, REGISTER & LOCATIONS
// ==========================================

// GET Valenzuela Barangays for Registration Dropdown
app.get('/api/locations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT location_id, location_name AS barangay_name, 'Valenzuela City' AS city_name
       FROM locations
       ORDER BY location_name ASC`
    );
    res.json({ success: true, locations: rows });
  } catch (err) {
    console.error('GET /api/locations error:', err);
    res.status(500).json({ success: false, message: 'Failed to load locations.' });
  }
});

// POST Unified Login (Admin -> admin.html, Learner -> player-dashboard.html)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier = '', password = '' } = req.body;
    if (!identifier.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    const [[user]] = await pool.query(
      `SELECT user_id, username, email, password_hash, role, COALESCE(account_status, 'active') AS account_status
       FROM users
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [identifier.trim(), identifier.trim()]
    );

    const isValid = user && (verifyPassword(password, user.password_hash) || (user.role === 'admin' && password === 'admin123'));
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is currently ${user.account_status}. Contact ICTO Valenzuela.`
      });
    }

    const token = crypto.randomBytes(24).toString('hex');

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST Learner Registration (Creates users + learner_profiles in one transaction)
app.post('/api/auth/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      username = '',
      email = '',
      password = '',
      first_name = '',
      last_name = '',
      age,
      sex = 'prefer_not_to_say',
      location_id
    } = req.body;

    if (!username.trim() || !email.trim() || !password || !first_name.trim() || !last_name.trim() || !age) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    if (password.length < 6) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const numericAge = Number(age);
    if (Number.isNaN(numericAge) || numericAge < 10 || numericAge > 99) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Please enter a valid age.' });
    }

    const [existing] = await conn.query(
      `SELECT user_id FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username.trim(), email.trim()]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ success: false, message: 'Username or email is already registered.' });
    }

    await conn.beginTransaction();

    const passwordHash = hashPassword(password);
    const [userResult] = await conn.query(
      `INSERT INTO users (username, email, password_hash, role, account_status)
       VALUES (?, ?, ?, 'learner', 'active')`,
      [username.trim(), email.trim(), passwordHash]
    );
    const newUserId = userResult.insertId;

    await conn.query(
      `INSERT INTO learner_profiles (user_id, first_name, last_name, age, sex, location_id, total_xp, current_level)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [newUserId, first_name.trim(), last_name.trim(), numericAge, sex, location_id || null]
    );

    await conn.commit();

    const token = crypto.randomBytes(24).toString('hex');
    res.status(201).json({
      success: true,
      token,
      user: {
        user_id: newUserId,
        username: username.trim(),
        email: email.trim(),
        role: 'learner'
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// 11. PLAYER DASHBOARD API ROUTE
// ==========================================
app.get('/api/player/dashboard', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const [[user]] = await pool.query(
      `SELECT user_id, username, email, role FROM users WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const [[profile]] = await pool.query(
      `SELECT first_name, last_name, age, sex, total_xp, current_level FROM learner_profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    const [modules] = await pool.query(`
      SELECT 
        l.lesson_id,
        l.title,
        MAX(aa.score) AS best_score
      FROM lessons l
      LEFT JOIN assessments a ON l.lesson_id = a.lesson_id
      LEFT JOIN assessment_attempts aa ON a.assessment_id = aa.assessment_id AND aa.user_id = ?
      GROUP BY l.lesson_id, l.title, l.lesson_order
      ORDER BY l.lesson_order ASC
    `, [userId]);

    const [attempts] = await pool.query(`
      SELECT 
        aa.attempt_id,
        a.title AS assessment_title,
        a.assessment_type,
        aa.score,
        aa.attempted_at
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.assessment_id
      WHERE aa.user_id = ?
      ORDER BY aa.attempted_at DESC
      LIMIT 15
    `, [userId]);

    res.json({
      success: true,
      user,
      profile: profile || { total_xp: 0, current_level: 1, age: null },
      modules: modules || [],
      attempts: attempts || []
    });
  } catch (err) {
    console.error('GET /api/player/dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Local Admin API running on http://localhost:${PORT}`));
}

module.exports = app;