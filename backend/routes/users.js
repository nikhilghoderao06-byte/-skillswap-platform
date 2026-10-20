const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const result = await db.query(
      'SELECT id, first_name, last_name, email, bio, college_name, year_of_study, rating, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Could not load the profile' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (String(req.user_id) !== String(req.params.id)) {
      return res.status(403).json({ message: 'You can only edit your own profile' });
    }

    const first_name = String(req.body.first_name ?? '').trim();
    const last_name = String(req.body.last_name ?? '').trim();
    const bio = String(req.body.bio ?? '').trim();
    const college_name = String(req.body.college_name ?? '').trim();
    const yearRaw = req.body.year_of_study;

    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }
    if (first_name.length > 100 || last_name.length > 100) {
      return res.status(400).json({ message: 'Names can be at most 100 characters' });
    }
    if (college_name.length > 255) {
      return res.status(400).json({ message: 'College name is too long' });
    }
    if (bio.length > 500) {
      return res.status(400).json({ message: 'Bio can be at most 500 characters' });
    }

    let year = null; // null keeps the current value
    if (yearRaw !== undefined && yearRaw !== null && String(yearRaw).trim() !== '') {
      year = Number(yearRaw);
      if (!Number.isInteger(year) || year < 1 || year > 8) {
        return res.status(400).json({ message: 'Year of study must be a number from 1 to 8' });
      }
    }

    const result = await db.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, bio = $3, college_name = $4, year_of_study = COALESCE($5::int, year_of_study)
       WHERE id = $6
       RETURNING id, first_name, last_name, email, bio, college_name, year_of_study, rating, created_at`,
      [first_name, last_name, bio, college_name, year, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Could not update the profile' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, first_name, last_name, email, college_name, year_of_study, rating FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Could not load students' });
  }
});

module.exports = router;
