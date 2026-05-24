const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const tc = require('../controllers/ticketController');

// ─── Multer ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpe?g|png|gif|pdf|docx?|txt|zip|xlsx?)$/i.test(file.originalname);
    cb(ok ? null : new Error('Type non autorisé'), ok);
  },
});

// ─── Notifications ────────────────────────────────────────────
router.get('/notifications',          verifyToken, tc.getNotifications);
router.patch('/notifications/read-all', verifyToken, tc.markAllRead);

// ─── Tickets CRUD ─────────────────────────────────────────────
router.get('/',    verifyToken, tc.getTickets);
router.post('/',   verifyToken, upload.array('attachments', 5), tc.createTicket);
router.get('/:id', verifyToken, tc.getTicket);
router.put('/:id', verifyToken, tc.updateTicket);
router.delete('/:id', verifyToken, tc.deleteTicket);

// ─── Actions ─────────────────────────────────────────────────
router.patch('/:id/take-charge', verifyToken, authorizeRoles('agent','admin'), tc.takeCharge);
router.patch('/:id/close',       verifyToken, authorizeRoles('agent','admin'), tc.closeTicket);
router.patch('/:id/reopen',      verifyToken, tc.reopenTicket);
router.patch('/:id/transfer',    verifyToken, authorizeRoles('agent','admin'), tc.transferTicket);
router.patch('/:id/status',      verifyToken, authorizeRoles('agent','admin'), tc.updateStatus);

// ─── Responses ────────────────────────────────────────────────
router.post('/:id/responses', verifyToken, tc.addResponse);

module.exports = router;
