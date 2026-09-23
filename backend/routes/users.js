const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { first_name, last_name, bio, college_name, year_of_study } = req.body;
    const result = await db.query(
      'UPDATE users SET first_name = $1, last_name = $2, bio = $3, college_name = $4, year_of_study = $5 WHERE id = $6 RETURNING *',
      [first_name, last_name, bio || '', college_name, year_of_study, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, first_name, last_name, email, college_name, year_of_study, rating FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;