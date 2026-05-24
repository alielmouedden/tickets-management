const pool = require('../config/db');
const {
  emailTicketAssigned,
  emailTicketTransferred,
  emailTicketClosed,
  emailNewResponse,
  emailNewTicketCreated,
} = require('../services/emailService');

async function logHistory(client, ticketId, userId, action, oldVal, newVal, note) {
  await client.query(
    `INSERT INTO ticket_history (ticket_id, changed_by, action, old_value, new_value, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ticketId, userId, action, oldVal, newVal, note]
  );
}

// Retourne l'agent actif avec le moins de tickets non-fermés (round-robin par charge)
async function getNextAgent(dbClient) {
  const result = await dbClient.query(`
    SELECT u.id, u.email, u.full_name,
           COUNT(t.id) AS ticket_count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN tickets t ON t.assigned_to = u.id
      AND t.status NOT IN ('ferme')
    WHERE r.name = 'agent' AND u.is_active = TRUE
    GROUP BY u.id, u.email, u.full_name
    ORDER BY COUNT(t.id) ASC, u.id ASC
    LIMIT 1
  `);
  return result.rows[0] || null;
}

async function notify(client, userId, ticketId, message) {
  if (!userId) return;
  await client.query(
    `INSERT INTO notifications (user_id, ticket_id, message) VALUES ($1, $2, $3)`,
    [userId, ticketId, message]
  );
}

// ─── GET ALL TICKETS (role-based) ────────────────────────────────────────────
async function getTickets(req, res) {
  try {
    const { role, id: userId } = req.user;
    const { status, priority_id, category_id, search } = req.query;

    const conditions = [];
    const params = [];
    let i = 1;

    if (role === 'client') {
      conditions.push(`t.client_id = $${i++}`);
      params.push(userId);
    }
    if (role === 'agent') {
      conditions.push(`(t.assigned_to = $${i++} OR t.status = 'nouveau' OR t.status = 'reouverte')`);
      params.push(userId);
    }
    if (status)      { conditions.push(`t.status = $${i++}`);       params.push(status); }
    if (priority_id) { conditions.push(`t.priority_id = $${i++}`);  params.push(priority_id); }
    if (category_id) { conditions.push(`t.category_id = $${i++}`);  params.push(category_id); }
    if (search)      {
      conditions.push(`(t.title ILIKE $${i} OR t.description ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(`
      SELECT
        t.id, t.title, t.description, t.status,
        t.created_at, t.updated_at, t.closed_at, t.auto_close_at,
        p.id AS priority_id, p.name AS priority_name, p.color AS priority_color,
        c.id AS category_id, c.name AS category_name,
        u.id AS client_id, u.full_name AS client_name,
        a.id AS assigned_id, a.full_name AS assigned_name,
        COUNT(DISTINCT tr.id) AS response_count,
        COUNT(DISTINCT ta.id) AS attachment_count
      FROM tickets t
      LEFT JOIN priorities p       ON t.priority_id = p.id
      LEFT JOIN categories c       ON t.category_id = c.id
      LEFT JOIN users u            ON t.client_id   = u.id
      LEFT JOIN users a            ON t.assigned_to = a.id
      LEFT JOIN ticket_responses tr ON t.id = tr.ticket_id
      LEFT JOIN ticket_attachments ta ON t.id = ta.ticket_id
      ${where}
      GROUP BY t.id, p.id, c.id, u.id, a.id
      ORDER BY t.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('getTickets:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ─── GET ONE TICKET ───────────────────────────────────────────────────────────
async function getTicket(req, res) {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const tr = await pool.query(`
      SELECT t.*,
        p.name AS priority_name, p.color AS priority_color, p.level AS priority_level,
        c.name AS category_name,
        u.full_name AS client_name, u.email AS client_email,
        a.full_name AS assigned_name, a.email AS assigned_email
      FROM tickets t
      LEFT JOIN priorities p ON t.priority_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u      ON t.client_id   = u.id
      LEFT JOIN users a      ON t.assigned_to = a.id
      WHERE t.id = $1
    `, [id]);

    if (!tr.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = tr.rows[0];
    if (role === 'client' && ticket.client_id !== userId)
      return res.status(403).json({ message: 'Accès refusé' });

    const [attachments, responses, history] = await Promise.all([
      pool.query('SELECT * FROM ticket_attachments WHERE ticket_id=$1 ORDER BY uploaded_at', [id]),
      pool.query(`
        SELECT tr.*, u.full_name, u.email, r.name AS role
        FROM ticket_responses tr
        JOIN users u ON tr.user_id = u.id
        JOIN roles r ON u.role_id  = r.id
        WHERE tr.ticket_id = $1 ORDER BY tr.created_at
      `, [id]),
      pool.query(`
        SELECT th.*, u.full_name AS changed_by_name
        FROM ticket_history th
        LEFT JOIN users u ON th.changed_by = u.id
        WHERE th.ticket_id = $1 ORDER BY th.created_at
      `, [id]),
    ]);

    res.json({
      ...ticket,
      attachments: attachments.rows,
      responses:   responses.rows,
      history:     history.rows,
    });
  } catch (err) {
    console.error('getTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ─── CREATE TICKET ────────────────────────────────────────────────────────────
async function createTicket(req, res) {
  const client = await pool.connect();
  try {
    const { title, description, priority_id, category_id, client_id: bodyClientId } = req.body;
    const { id: userId, role } = req.user;

    if (!title || !description)
      return res.status(400).json({ message: 'Titre et description requis' });

    const clientId = (role !== 'client' && bodyClientId) ? bodyClientId : userId;

    await client.query('BEGIN');

    // Assignation automatique round-robin
    const agent = await getNextAgent(client);
    const result = await client.query(`
      INSERT INTO tickets (title, description, priority_id, category_id, client_id, status, assigned_to, auto_close_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [title, description, priority_id || null, category_id || null, clientId,
        'nouveau', agent ? agent.id : null, agent ? new Date(Date.now() + 48 * 3600 * 1000) : null]);

    const ticket = result.rows[0];

    if (req.files?.length) {
      for (const file of req.files) {
        await client.query(
          `INSERT INTO ticket_attachments (ticket_id, file_path, file_name)
           VALUES ($1, $2, $3)`,
          [ticket.id, file.path, file.originalname]
        );
      }
    }

    await logHistory(client, ticket.id, userId, 'created', null, 'nouveau', 'Ticket créé');

    if (agent) {
      await logHistory(client, ticket.id, userId, 'assigned', null, String(agent.id),
        `Assigné automatiquement à ${agent.full_name}`);
      await notify(client, agent.id, ticket.id,
        `Un nouveau ticket #${ticket.id} vous a été assigné.`);
    }

    // Notifier tous les admins actifs (in-app)
    const admins = await client.query(`
      SELECT u.id, u.email FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'admin' AND u.is_active = TRUE
    `);
    for (const admin of admins.rows) {
      await notify(client, admin.id, ticket.id,
        `Nouveau ticket #${ticket.id} créé${agent ? ` — assigné à ${agent.full_name}` : ''}.`);
    }

    // Récupérer le nom du client pour l'email
    const clientRow = await client.query('SELECT full_name FROM users WHERE id=$1', [clientId]);
    const clientName = clientRow.rows[0]?.full_name || 'Client';

    await client.query('COMMIT');

    if (agent) emailTicketAssigned(agent.email, ticket.id, ticket.title);

    // Email à tous les admins
    for (const admin of admins.rows) {
      emailNewTicketCreated(admin.email, ticket.id, ticket.title, clientName,
        agent ? agent.full_name : 'Non assigné');
    }

    res.status(201).json({ message: 'Ticket créé', ticket });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── UPDATE TICKET ────────────────────────────────────────────────────────────
async function updateTicket(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, description, priority_id, category_id } = req.body;
    const { id: userId, role } = req.user;

    const cur = await client.query('SELECT * FROM tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = cur.rows[0];
    if (role === 'client' && ticket.client_id !== userId)
      return res.status(403).json({ message: 'Accès refusé' });
    if (role === 'client' && ticket.status === 'ferme')
      return res.status(400).json({ message: 'Impossible de modifier un ticket fermé' });

    await client.query('BEGIN');
    const updated = await client.query(`
      UPDATE tickets
      SET title       = COALESCE($1, title),
          description = COALESCE($2, description),
          priority_id = COALESCE($3::int, priority_id),
          category_id = COALESCE($4::int, category_id),
          updated_at  = NOW()
      WHERE id = $5 RETURNING *
    `, [title, description, priority_id, category_id, id]);

    await logHistory(client, id, userId, 'updated', null, null, 'Ticket modifié');
    await client.query('COMMIT');

    res.json({ message: 'Ticket mis à jour', ticket: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── DELETE TICKET ────────────────────────────────────────────────────────────
async function deleteTicket(req, res) {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const cur = await pool.query('SELECT * FROM tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    if (role === 'client' && cur.rows[0].client_id !== userId)
      return res.status(403).json({ message: 'Accès refusé' });

    await pool.query('DELETE FROM tickets WHERE id=$1', [id]);
    res.json({ message: 'Ticket supprimé' });
  } catch (err) {
    console.error('deleteTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ─── TAKE CHARGE (agent) ──────────────────────────────────────────────────────
async function takeCharge(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { id: agentId } = req.user;

    const cur = await client.query('SELECT * FROM tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = cur.rows[0];
    if (ticket.status === 'ferme')
      return res.status(400).json({ message: 'Ce ticket est déjà fermé' });

    const autoCloseAt = new Date(Date.now() + 48 * 3600 * 1000);

    await client.query('BEGIN');
    await client.query(`
      UPDATE tickets
      SET assigned_to = $1, status = 'ouverte',
          auto_close_at = $2, updated_at = NOW()
      WHERE id = $3
    `, [agentId, autoCloseAt, id]);

    await logHistory(client, id, agentId, 'taken_charge', ticket.status, 'ouverte', 'Pris en charge');
    await notify(client, ticket.client_id, id, `Votre ticket #${id} est pris en charge.`);
    await client.query('COMMIT');

    // Email to agent
    const agentData = await pool.query('SELECT email FROM users WHERE id=$1', [agentId]);
    if (agentData.rows[0]) {
      emailTicketAssigned(agentData.rows[0].email, id, ticket.title);
    }

    res.json({ message: 'Ticket pris en charge' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('takeCharge:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── CLOSE TICKET ─────────────────────────────────────────────────────────────
async function closeTicket(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const cur = await client.query(`
      SELECT t.*, u.email AS client_email
      FROM tickets t LEFT JOIN users u ON t.client_id=u.id
      WHERE t.id=$1
    `, [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = cur.rows[0];
    if (ticket.status === 'ferme')
      return res.status(400).json({ message: 'Déjà fermé' });
    if (role === 'agent' && ticket.assigned_to !== userId)
      return res.status(403).json({ message: "Seul l'agent en charge peut fermer" });

    await client.query('BEGIN');
    await client.query(`
      UPDATE tickets
      SET status='ferme', closed_at=NOW(), auto_close_at=NULL, updated_at=NOW()
      WHERE id=$1
    `, [id]);

    await logHistory(client, id, userId, 'closed', ticket.status, 'ferme', 'Fermé');
    await notify(client, ticket.client_id, id, `Votre ticket #${id} a été fermé.`);
    await client.query('COMMIT');

    if (ticket.client_email) emailTicketClosed(ticket.client_email, id, ticket.title);

    res.json({ message: 'Ticket fermé' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('closeTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── REOPEN TICKET (client can reopen) ───────────────────────────────────────
async function reopenTicket(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const cur = await client.query('SELECT * FROM tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = cur.rows[0];
    if (role === 'client' && ticket.client_id !== userId)
      return res.status(403).json({ message: 'Accès refusé' });

    await client.query('BEGIN');

    // Réassignation automatique round-robin + reset timer 48h
    await client.query(`
      UPDATE tickets
      SET status='reouverte', closed_at=NULL, assigned_to=NULL,
          auto_close_at=NULL, updated_at=NOW()
      WHERE id=$1
    `, [id]);

    await logHistory(client, id, userId, 'reopened', ticket.status, 'reouverte', 'Rouvert');

    await client.query('COMMIT');

    res.json({ message: 'Ticket rouvert' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reopenTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── TRANSFER TICKET ─────────────────────────────────────────────────────────
async function transferTicket(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { agent_id, note } = req.body;
    const { id: userId } = req.user;

    if (!agent_id) return res.status(400).json({ message: 'agent_id requis' });

    const cur = await client.query('SELECT * FROM tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = cur.rows[0];

    const agentCheck = await client.query(`
      SELECT u.id, u.email, u.full_name FROM users u JOIN roles r ON u.role_id=r.id
      WHERE u.id=$1 AND r.name IN ('agent','admin')
    `, [agent_id]);
    if (!agentCheck.rows.length)
      return res.status(400).json({ message: 'Agent introuvable' });

    const fromUser = await client.query('SELECT full_name FROM users WHERE id=$1', [userId]);

    const autoCloseAt = new Date(Date.now() + 48 * 3600 * 1000);

    await client.query('BEGIN');
    await client.query(`
      UPDATE tickets
      SET assigned_to=$1, status='ouverte',
          auto_close_at=$2, updated_at=NOW()
      WHERE id=$3
    `, [agent_id, autoCloseAt, id]);

    await logHistory(client, id, userId, 'transferred',
      String(ticket.assigned_to), String(agent_id), note || 'Transféré');
    await notify(client, agent_id, id, `Le ticket #${id} vous a été transféré.`);
    await client.query('COMMIT');

    const fromName = fromUser.rows[0]?.full_name || 'Un agent';
    emailTicketTransferred(agentCheck.rows[0].email, id, ticket.title, fromName);

    res.json({ message: 'Ticket transféré' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('transferTicket:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
async function updateStatus(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId } = req.user;

    const valid = ['nouveau', 'ouverte', 'en cours de traitement', 'ferme', 'reouverte'];
    if (!valid.includes(status))
      return res.status(400).json({ message: 'Statut invalide' });

    const cur = await client.query('SELECT * FROM tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = cur.rows[0];

    await client.query('BEGIN');
    await client.query(`
      UPDATE tickets
      SET status=$1, updated_at=NOW(),
          closed_at   = CASE WHEN $1='ferme'  THEN NOW() ELSE closed_at   END,
          auto_close_at = CASE WHEN $1='ferme' THEN NULL  ELSE auto_close_at END
      WHERE id=$2
    `, [status, id]);

    await logHistory(client, id, userId, 'status_changed', ticket.status, status, null);
    await notify(client, ticket.client_id, id,
      `Statut du ticket #${id} : ${status}`);
    await client.query('COMMIT');

    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateStatus:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// ─── ADD RESPONSE ─────────────────────────────────────────────────────────────
async function addResponse(req, res) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const { id: userId } = req.user;

    if (!message) return res.status(400).json({ message: 'Message requis' });

    const ticketRes = await pool.query(`
      SELECT t.*, u.email AS client_email, a.email AS agent_email
      FROM tickets t
      LEFT JOIN users u ON t.client_id   = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.id=$1
    `, [id]);
    if (!ticketRes.rows.length) return res.status(404).json({ message: 'Ticket introuvable' });

    const ticket = ticketRes.rows[0];

    const resp = await pool.query(`
      INSERT INTO ticket_responses (ticket_id, user_id, message)
      VALUES ($1, $2, $3) RETURNING *
    `, [id, userId, message]);

    await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=$1', [id]);

    const userInfo = await pool.query(`
      SELECT u.full_name, r.name AS role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=$1
    `, [userId]);

    const senderName = userInfo.rows[0]?.full_name || 'Quelqu\'un';
    const isClient = userId === ticket.client_id;

    // In-app notification
    const notifyId = isClient ? ticket.assigned_to : ticket.client_id;
    if (notifyId) {
      await pool.query(
        `INSERT INTO notifications (user_id, ticket_id, message) VALUES ($1, $2, $3)`,
        [notifyId, id, `Nouvelle réponse sur le ticket #${id}`]
      );
    }

    // Email notification
    const recipientEmail = isClient ? ticket.agent_email : ticket.client_email;
    if (recipientEmail) emailNewResponse(recipientEmail, id, ticket.title, senderName);

    res.status(201).json({
      ...resp.rows[0],
      full_name: senderName,
      role: userInfo.rows[0]?.role,
    });
  } catch (err) {
    console.error('addResponse:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
async function getNotifications(req, res) {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(`
      SELECT n.*, t.title AS ticket_title
      FROM notifications n LEFT JOIN tickets t ON n.ticket_id=t.id
      WHERE n.user_id=$1
      ORDER BY n.created_at DESC LIMIT 50
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('getNotifications:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function markAllRead(req, res) {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Toutes les notifications lues' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

module.exports = {
  getTickets, getTicket, createTicket, updateTicket, deleteTicket,
  takeCharge, closeTicket, reopenTicket, transferTicket, updateStatus,
  addResponse, getNotifications, markAllRead,
};
