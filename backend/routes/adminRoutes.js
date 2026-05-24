const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const ac = require('../controllers/adminController');

const admin      = [verifyToken, authorizeRoles('admin')];
const agentAdmin = [verifyToken, authorizeRoles('agent', 'admin')];

// Users
router.get('/users',       ...admin,      ac.getUsers);
router.post('/users',      ...admin,      ac.createUser);
router.put('/users/:id',   ...admin,      ac.updateUser);
router.delete('/users/:id',...admin,      ac.deleteUser);

// Categories  (lecture = tout le monde connecté)
router.get('/categories',         verifyToken,  ac.getCategories);
router.post('/categories',        ...admin,      ac.createCategory);
router.put('/categories/:id',     ...admin,      ac.updateCategory);
router.delete('/categories/:id',  ...admin,      ac.deleteCategory);

// Priorities  (lecture = tout le monde connecté)
router.get('/priorities',         verifyToken,  ac.getPriorities);
router.post('/priorities',        ...admin,      ac.createPriority);
router.put('/priorities/:id',     ...admin,      ac.updatePriority);
router.delete('/priorities/:id',  ...admin,      ac.deletePriority);

// Stats & Backup
router.get('/stats',  ...admin, ac.getStats);
router.get('/backup', ...admin, ac.backup);

// Helpers
router.get('/roles',   ...admin,      ac.getRoles);
router.get('/agents',  ...agentAdmin, ac.getAgents);
router.get('/clients', ...agentAdmin, ac.getClients);

module.exports = router;
