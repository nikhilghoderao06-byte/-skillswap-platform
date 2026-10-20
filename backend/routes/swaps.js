const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const MODES = ['Online', 'Offline', 'Hybrid'];

const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

router.post('/request', auth, async (req, res) => {
  try {
    const providerId = toIntOrNull(req.body.provider_id);
    const skillLearnId = toIntOrNull(req.body.skill_learn_id);
    const skillTeachId = toIntOrNull(req.body.skill_teach_id); // optional
    const mode = req.body.mode === undefined || req.body.mode === '' ? 'Online' : req.body.mode;
    const message = String(req.body.message ?? '').trim();

    if (providerId === null || Number.isNaN(providerId)) {
      return res.status(400).json({ message: 'provider_id is required' });
    }
    if (providerId === Number(req.user_id)) {
      return res.status(400).json({ message: 'You cannot send a swap request to yourself' });
    }
    if (skillLearnId === null || Number.isNaN(skillLearnId)) {
      return res.status(400).json({ message: 'Please choose the skill you want to learn' });
    }
    if (Number.isNaN(skillTeachId)) {
      return res.status(400).json({ message: 'Invalid skill to teach' });
    }
    if (!MODES.includes(mode)) {
      return res.status(400).json({ message: 'Mode must be Online, Offline or Hybrid' });
    }
    if (message.length > 500) {
      return res.status(400).json({ message: 'Message can be at most 500 characters' });
    }

    const provider = await db.query('SELECT id FROM users WHERE id = $1', [providerId]);
    if (provider.rows.length === 0) {
      return res.status(404).json({ message: 'That student was not found' });
    }

    const skillIds = [skillLearnId, skillTeachId].filter((x) => x !== null);
    const skills = await db.query('SELECT id FROM skills WHERE id = ANY($1::int[])', [skillIds]);
    if (skills.rows.length !== new Set(skillIds).size) {
      return res.status(400).json({ message: 'One of the chosen skills does not exist' });
    }

    const duplicate = await db.query(
      `SELECT id FROM swap_requests
       WHERE requester_id = $1 AND provider_id = $2 AND skill_learn_id = $3 AND status = 'pending'`,
      [req.user_id, providerId, skillLearnId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ message: 'You already have a pending request to this student for that skill' });
    }

    const result = await db.query(
      'INSERT INTO swap_requests (requester_id, provider_id, skill_teach_id, skill_learn_id, mode, message, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user_id, providerId, skillTeachId, skillLearnId, mode, message, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ message: 'Could not send the request' });
  }
});

// Only you can list your own requests (they contain private messages)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (String(req.user_id) !== String(req.params.userId)) {
      return res.status(403).json({ message: 'You can only view your own requests' });
    }
    const incoming = await db.query('SELECT * FROM swap_requests WHERE provider_id = $1 ORDER BY created_at DESC', [req.user_id]);
    const outgoing = await db.query('SELECT * FROM swap_requests WHERE requester_id = $1 ORDER BY created_at DESC', [req.user_id]);
    res.json({ incoming: incoming.rows, outgoing: outgoing.rows });
  } catch (error) {
    console.error('List swap requests error:', error);
    res.status(500).json({ message: 'Could not load requests' });
  }
});

async function respond(req, res, newStatus, verb) {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }
    const existing = await db.query('SELECT provider_id, status FROM swap_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }
    if (String(existing.rows[0].provider_id) !== String(req.user_id)) {
      return res.status(403).json({ message: `Only the provider can ${verb} this request` });
    }
    const result = await db.query('UPDATE swap_requests SET status = $1 WHERE id = $2 RETURNING *', [newStatus, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Respond to swap request error:', error);
    res.status(500).json({ message: 'Could not update the request' });
  }
}

router.put('/:id/accept', auth, (req, res) => respond(req, res, 'accepted', 'accept'));
router.put('/:id/reject', auth, (req, res) => respond(req, res, 'rejected', 'reject'));

module.exports = router;
