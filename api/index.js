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