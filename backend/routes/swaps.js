const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/request', auth, async (req, res) => {
  try {
    const { provider_id, skill_teach_id, skill_learn_id, mode, message } = req.body;
    const result = await db.query(
      'INSERT INTO swap_requests (requester_id, provider_id, skill_teach_id, skill_learn_id, mode, message, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user_id, provider_id, skill_teach_id, skill_learn_id, mode || 'Online', message || '', 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const incoming = await db.query('SELECT * FROM swap_requests WHERE provider_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    const outgoing = await db.query('SELECT * FROM swap_requests WHERE requester_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    res.json({ incoming: incoming.rows, outgoing: outgoing.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/accept', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT provider_id FROM swap_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }
    if (String(existing.rows[0].provider_id) !== String(req.user_id)) {
      return res.status(403).json({ message: 'Only the provider can accept this request' });
    }
    const result = await db.query('UPDATE swap_requests SET status = $1 WHERE id = $2 RETURNING *', ['accepted', req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/reject', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT provider_id FROM swap_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }
    if (String(existing.rows[0].provider_id) !== String(req.user_id)) {
      return res.status(403).json({ message: 'Only the provider can reject this request' });
    }
    const result = await db.query('UPDATE swap_requests SET status = $1 WHERE id = $2 RETURNING *', ['rejected', req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;