const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM skills ORDER BY skill_name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT us.id, s.skill_name, s.category, us.proficiency_level, us.can_teach, us.wants_to_learn, us.experience_years, s.id as skill_id FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = $1',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { skill_id, proficiency_level, can_teach, wants_to_learn, experience_years } = req.body;
    const result = await db.query(
      'INSERT INTO user_skills (user_id, skill_id, proficiency_level, can_teach, wants_to_learn, experience_years) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user_id, skill_id, proficiency_level, can_teach, wants_to_learn, experience_years || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:skillId', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM user_skills WHERE id = $1 AND user_id = $2', [req.params.skillId, req.user_id]);
    res.json({ message: 'Skill removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;