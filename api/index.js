const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serves index.html, style.css, admin.js locally

// Connects to Cloud MySQL on Vercel (or localhost when testing locally)
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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ db: 'connected' });
  } catch (err) {
    res.status(500).json({ db: 'offline', error: err.message });
  }
});

// 1. GET Learner Progress & Lesson Success Rates
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
      JOIN locations loc ON l.location_id = loc.location_id
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

// 2. GET Learning Analytics
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const [ageGroups] = await pool.query(`
      SELECT 
        CASE 
          WHEN lp.age BETWEEN 13 AND 15 THEN '13 - 15 YRS'
          WHEN lp.age BETWEEN 16 AND 18 THEN '16 - 18 YRS'
          WHEN lp.age BETWEEN 19 AND 21 THEN '19 - 21 YRS'
          ELSE '22+ YRS'
        END AS group_label,
        COUNT(DISTINCT lp.user_id) AS learner_count,
        COALESCE(ROUND(AVG(aa.score), 0), 0) AS avgScore
      FROM learner_profiles lp
      LEFT JOIN assessment_attempts aa ON lp.user_id = aa.user_id
      GROUP BY group_label
    `);

    const [examVsQuiz] = await pool.query(`
      SELECT 
        CASE 
          WHEN a.assessment_type = 'pre_test' THEN 'PRE-TEST EXAM AVG (10 Qs)'
          WHEN a.assessment_type = 'post_test' THEN 'POST-TEST EXAM AVG (10 Qs)'
          ELSE 'MISSIONS 1-5 QUIZ AVG (5 Qs each)'
        END AS label,
        COALESCE(ROUND(AVG(aa.score), 0), 0) AS score
      FROM assessments a
      JOIN assessment_attempts aa ON a.assessment_id = aa.assessment_id
      GROUP BY label
    `);

    res.json({ ageGroups, examVsQuiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT Edit a Lesson Module (5 Total Lessons)
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

// 4. GET Questions + 4 Options for a Lesson & Assessment Type
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

// 5. PUT Edit an Individual Question & its 4 Options
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
      await conn.query(
        `UPDATE answer_options SET option_text = ?, is_correct = ? WHERE option_id = ? AND question_id = ?`,
        [opt.option_text, opt.is_correct ? 1 : 0, opt.option_id, questionId]
      );
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

// Local dev fallback
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Local Admin API running on http://localhost:${PORT}`));
}

// Required for Vercel Serverless Functions
module.exports = app;