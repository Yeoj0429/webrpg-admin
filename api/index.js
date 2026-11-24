const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

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
    // Accepts either your database password_hash OR 'admin123' so you can log in right away
    const isValid = (password === admin.password_hash) || (password === 'admin123');

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

    // Live Age Brackets from learner_profiles + assessment_attempts
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

    // Live Score Breakdown (Pre-Test vs Missions 1-5 vs Post-Test)
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

  // 1. Real Learner Telemetry from TiDB
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

  // 2. Real Lesson-by-Lesson Breakdown from TiDB
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

  // 3. Real Quiz & Question Bank from TiDB
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
         VALUES (?, ?, ?, 70.00, 20)`,
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

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Local Admin API running on http://localhost:${PORT}`));
}

module.exports = app;

// ==========================================
// ADMIN: USERS MANAGEMENT ROUTES
// ==========================================

// 1. GET ALL USERS (with search, role, & age bracket filters)
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const { q = '', role = 'all', age_bracket = 'all', status = 'all' } = req.query;

    let sql = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.role,
        COALESCE(u.status, 'active') AS status,
        u.created_at,
        COALESCE(lp.age_bracket, 'N/A') AS age_bracket,
        COALESCE(lp.level, 1) AS level,
        COALESCE(lp.xp, 0) AS xp,
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
    if (age_bracket !== 'all') {
      sql += ` AND lp.age_bracket = ?`;
      params.push(age_bracket);
    }
    if (status !== 'all') {
      sql += ` AND COALESCE(u.status, 'active') = ?`;
      params.push(status);
    }

    sql += `
      GROUP BY 
        u.user_id, u.username, u.email, u.role, u.status, 
        u.created_at, lp.age_bracket, lp.level, lp.xp
      ORDER BY u.created_at DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// 2. GET SINGLE USER DETAILS + ATTEMPT HISTORY (for Inline Modal)
app.get('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const [[user]] = await pool.query(`
      SELECT 
        u.user_id, u.username, u.email, u.role,
        COALESCE(u.status, 'active') AS status, u.created_at,
        COALESCE(lp.age_bracket, 'N/A') AS age_bracket,
        COALESCE(lp.level, 1) AS level,
        COALESCE(lp.xp, 0) AS xp
      FROM users u
      LEFT JOIN learner_profiles lp ON u.user_id = lp.user_id
      WHERE u.user_id = ?
    `, [userId]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const [attempts] = await pool.query(`
      SELECT 
        aa.attempt_id,
        a.title AS assessment_title,
        a.assessment_type,
        aa.score,
        CASE WHEN aa.score >= 75 THEN 'PASSED' ELSE 'FAILED' END AS result_status,
        aa.completed_at
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.assessment_id
      WHERE aa.user_id = ?
      ORDER BY aa.completed_at DESC
      LIMIT 20
    `, [userId]);

    res.json({ success: true, user, attempts });
  } catch (err) {
    console.error('GET /api/admin/users/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to load user details.' });
  }
});

// 3. UPDATE USER ROLE / STATUS / AGE BRACKET
app.put('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role, status, age_bracket } = req.body;

    // Prevent admin from locking themselves out
    if (req.user && req.user.user_id === userId && (role !== 'admin' || status === 'inactive')) {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote or deactivate your own active admin account.'
      });
    }

    await pool.query(
      `UPDATE users SET role = ?, status = ? WHERE user_id = ?`,
      [role, status, userId]
    );

    if (age_bracket && age_bracket !== 'N/A') {
      await pool.query(
        `UPDATE learner_profiles SET age_bracket = ? WHERE user_id = ?`,
        [age_bracket, userId]
      );
    }

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error('PUT /api/admin/users/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// 4. DELETE USER (Safely removes dependent records in a transaction)
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = Number(req.params.id);

    if (req.user && req.user.user_id === userId) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    await conn.beginTransaction();
    await conn.query(`DELETE FROM assessment_attempts WHERE user_id = ?`, [userId]);
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
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  } finally {
    conn.release();
  }
});