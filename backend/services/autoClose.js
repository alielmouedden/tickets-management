const cron = require('node-cron');
const pool = require('../config/db');
const { emailTicketAutoClose, emailTicketClosed } = require('./emailService');

function startAutoCloseJob() {
  // Vérifie toutes les heures
  cron.schedule('0 * * * *', async () => {
    console.log('[AutoClose] Vérification tickets expirés...');
    try {
      const expired = await pool.query(`
        SELECT t.id, t.title, t.status, t.client_id, t.assigned_to,
          u_agent.email  AS agent_email,
          u_client.email AS client_email
        FROM tickets t
        LEFT JOIN users u_agent  ON t.assigned_to  = u_agent.id
        LEFT JOIN users u_client ON t.client_id     = u_client.id
        WHERE t.auto_close_at <= NOW()
          AND t.status NOT IN ('ferme')
      `);

      if (expired.rows.length === 0) {
        console.log('[AutoClose] Aucun ticket expiré.');
        return;
      }

      for (const ticket of expired.rows) {
        await pool.query(`
          UPDATE tickets
          SET status = 'ferme', closed_at = NOW(),
              auto_close_at = NULL, updated_at = NOW()
          WHERE id = $1
        `, [ticket.id]);

        await pool.query(`
          INSERT INTO ticket_history (ticket_id, changed_by, action, old_value, new_value, note)
          VALUES ($1, NULL, 'auto_closed', $2, 'ferme', 'Fermé automatiquement après 48h')
        `, [ticket.id, ticket.status]);

        await pool.query(`
          INSERT INTO notifications (user_id, ticket_id, message)
          VALUES ($1, $2, $3)
        `, [ticket.client_id, ticket.id,
            `Votre ticket #${ticket.id} a été fermé automatiquement.`]);

        if (ticket.assigned_to) {
          await pool.query(`
            INSERT INTO notifications (user_id, ticket_id, message)
            VALUES ($1, $2, $3)
          `, [ticket.assigned_to, ticket.id,
              `Le ticket #${ticket.id} a été fermé automatiquement après 48h.`]);

          if (ticket.agent_email) {
            await emailTicketAutoClose(ticket.agent_email, ticket.id, ticket.title);
          }
        }

        if (ticket.client_email) {
          await emailTicketClosed(ticket.client_email, ticket.id, ticket.title);
        }

        console.log(`[AutoClose] Ticket #${ticket.id} fermé.`);
      }
    } catch (err) {
      console.error('[AutoClose] Erreur:', err.message);
    }
  });

  console.log('[AutoClose] Job démarré (toutes les heures).');
}

module.exports = { startAutoCloseJob };
