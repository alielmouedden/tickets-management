const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
async function getUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
             r.name AS role, r.id AS role_id
      FROM users u JOIN roles r ON u.role_id=r.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getUsers:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function createUser(req, res) {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password || !role)
      return res.status(400).json({ message: 'Tous les champs sont requis' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email déjà utilisé' });

    const roleRow = await pool.query('SELECT id FROM roles WHERE name=$1', [role]);
    if (!roleRow.rows.length) return res.status(400).json({ message: 'Rôle invalide' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role_id)
      VALUES ($1,$2,$3,$4) RETURNING id, full_name, email, is_active, created_at
    `, [full_name, email, hash, roleRow.rows[0].id]);

    res.status(201).json({ message: 'Utilisateur créé', user: result.rows[0] });
  } catch (err) {
    console.error('createUser:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active, password } = req.body;

    const cur = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Utilisateur introuvable' });

    let roleId = cur.rows[0].role_id;
    if (role) {
      const r = await pool.query('SELECT id FROM roles WHERE name=$1', [role]);
      if (r.rows.length) roleId = r.rows[0].id;
    }

    let passwordHash = cur.rows[0].password_hash;
    if (password && password.trim()) passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      UPDATE users
      SET full_name=COALESCE($1, full_name),
          email=COALESCE($2, email),
          role_id=$3,
          is_active=COALESCE($4, is_active),
          password_hash=$5
      WHERE id=$6
      RETURNING id, full_name, email, role_id, is_active, created_at
    `, [full_name, email, roleId, is_active, passwordHash, id]);

    res.json({ message: 'Utilisateur mis à jour', user: result.rows[0] });
  } catch (err) {
    console.error('updateUser:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id)
      return res.status(400).json({ message: 'Impossible de supprimer votre propre compte' });

    const cur = await pool.query('SELECT id FROM users WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Utilisateur introuvable' });

    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('deleteUser:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════
async function getCategories(req, res) {
  try {
    const r = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

async function createCategory(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Nom requis' });
    const r = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1,$2) RETURNING *',
      [name, description]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Catégorie déjà existante' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const r = await pool.query(
      `UPDATE categories SET name=COALESCE($1,name), description=COALESCE($2,description)
       WHERE id=$3 RETURNING *`,
      [name, description, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Catégorie introuvable' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

async function deleteCategory(req, res) {
  try {
    await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ message: 'Catégorie supprimée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

// ═══════════════════════════════════════════════════════════════
// PRIORITIES
// ═══════════════════════════════════════════════════════════════
async function getPriorities(req, res) {
  try {
    const r = await pool.query('SELECT * FROM priorities ORDER BY level');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

async function createPriority(req, res) {
  try {
    const { name, level, color } = req.body;
    if (!name || !level) return res.status(400).json({ message: 'Nom et niveau requis' });
    const r = await pool.query(
      'INSERT INTO priorities (name, level, color) VALUES ($1,$2,$3) RETURNING *',
      [name, level, color || '#6B7280']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Priorité déjà existante' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function updatePriority(req, res) {
  try {
    const { id } = req.params;
    const { name, level, color } = req.body;
    const r = await pool.query(
      `UPDATE priorities SET name=COALESCE($1,name), level=COALESCE($2,level),
       color=COALESCE($3,color) WHERE id=$4 RETURNING *`,
      [name, level, color, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Priorité introuvable' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

async function deletePriority(req, res) {
  try {
    await pool.query('DELETE FROM priorities WHERE id=$1', [req.params.id]);
    res.json({ message: 'Priorité supprimée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════
async function getStats(req, res) {
  try {
    const [
      total, byStatus, byPriority, byCategory,
      byAgent, monthly, avgTime, userStats,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM tickets'),
      pool.query(`SELECT status, COUNT(*) AS count FROM tickets GROUP BY status ORDER BY count DESC`),
      pool.query(`
        SELECT p.name, p.color, COUNT(t.id) AS count
        FROM priorities p LEFT JOIN tickets t ON t.priority_id=p.id
        GROUP BY p.id ORDER BY p.level
      `),
      pool.query(`
        SELECT c.name, COUNT(t.id) AS count
        FROM categories c LEFT JOIN tickets t ON t.category_id=c.id
        GROUP BY c.id ORDER BY count DESC
      `),
      pool.query(`
        SELECT u.full_name, u.email,
          COUNT(t.id)                                          AS total,
          COUNT(CASE WHEN t.status='ferme'                THEN 1 END)  AS closed,
          COUNT(CASE WHEN t.status='en cours de traitement' THEN 1 END)  AS active
        FROM users u JOIN roles r ON u.role_id=r.id
        LEFT JOIN tickets t ON t.assigned_to=u.id
        WHERE r.name IN ('agent','admin')
        GROUP BY u.id ORDER BY total DESC
      `),
      pool.query(`
        SELECT TO_CHAR(created_at,'YYYY-MM') AS month, COUNT(*) AS count
        FROM tickets WHERE created_at >= NOW()-INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
      pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (closed_at-created_at))/3600) AS avg_hours
        FROM tickets WHERE closed_at IS NOT NULL
      `),
      pool.query(`
        SELECT
          COUNT(CASE WHEN r.name='client' THEN 1 END) AS clients,
          COUNT(CASE WHEN r.name='agent'  THEN 1 END) AS agents,
          COUNT(CASE WHEN r.name='admin'  THEN 1 END) AS admins,
          COUNT(*) AS total
        FROM users u JOIN roles r ON u.role_id=r.id WHERE u.is_active=TRUE
      `),
    ]);

    res.json({
      total:             parseInt(total.rows[0].total),
      byStatus:          byStatus.rows,
      byPriority:        byPriority.rows,
      byCategory:        byCategory.rows,
      byAgent:           byAgent.rows,
      monthly:           monthly.rows,
      avgResolutionHours: parseFloat(avgTime.rows[0]?.avg_hours || 0).toFixed(1),
      users:             userStats.rows[0],
    });
  } catch (err) {
    console.error('getStats:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ═══════════════════════════════════════════════════════════════
// BACKUP
// ═══════════════════════════════════════════════════════════════
async function backup(req, res) {
  try {
    const [users, tickets, categories, priorities, responses, history] = await Promise.all([
      pool.query('SELECT id,full_name,email,is_active,created_at FROM users'),
      pool.query('SELECT * FROM tickets'),
      pool.query('SELECT * FROM categories'),
      pool.query('SELECT * FROM priorities'),
      pool.query('SELECT * FROM ticket_responses'),
      pool.query('SELECT * FROM ticket_history'),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Gestion Tickets';
    wb.created = new Date();

    function addSheet(name, rows) {
      if (!rows.length) return;
      const ws = wb.addWorksheet(name);
      ws.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 20 }));
      ws.getRow(1).font = { bold: true };
      rows.forEach(r => ws.addRow(r));
    }

    addSheet('Utilisateurs',  users.rows);
    addSheet('Tickets',       tickets.rows);
    addSheet('Catégories',    categories.rows);
    addSheet('Priorités',     priorities.rows);
    addSheet('Réponses',      responses.rows);
    addSheet('Historique',    history.rows);

    const filename = `backup-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('backup:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
async function getRoles(req, res) {
  try {
    const r = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

async function getAgents(req, res) {
  try {
    const r = await pool.query(`
      SELECT u.id, u.full_name, u.email
      FROM users u JOIN roles r ON u.role_id=r.id
      WHERE r.name IN ('agent','admin') AND u.is_active=TRUE
      ORDER BY u.full_name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

async function getClients(req, res) {
  try {
    const r = await pool.query(`
      SELECT u.id, u.full_name, u.email
      FROM users u JOIN roles r ON u.role_id=r.id
      WHERE r.name = 'client' AND u.is_active=TRUE
      ORDER BY u.full_name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
}

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  getCategories, createCategory, updateCategory, deleteCategory,
  getPriorities, createPriority, updatePriority, deletePriority,
  getStats, backup, getRoles, getAgents, getClients,
};
