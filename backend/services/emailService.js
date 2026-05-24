const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[Email] Config manquante — ignoré:', subject);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `"TicketPro Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[Email] Envoyé à:', to);
  } catch (err) {
    console.error('[Email] Erreur:', err.message);
  }
}

const base = (color, content) => `
  <div style="font-family:Arial,sans-serif;background:#F8FAFC;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;
         padding:28px;border-top:4px solid ${color};">
      ${content}
      <p style="margin-top:24px;color:#64748B;font-size:13px;border-top:1px solid #E2E8F0;padding-top:16px;">
        © TicketPro — système de gestion de tickets
      </p>
    </div>
  </div>`;

const btn = (href, label, color = '#1D4ED8') =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#fff;
   padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:16px;">
   ${label}</a>`;

function emailTicketAssigned(agentEmail, ticketId, ticketTitle) {
  return sendEmail({
    to: agentEmail,
    subject: `[Ticket #${ticketId}] Vous êtes en charge`,
    html: base('#1D4ED8', `
      <h2 style="color:#1D4ED8;margin-top:0;">Nouveau ticket assigné</h2>
      <p>Le ticket <strong>#${ticketId}</strong> vous a été assigné.</p>
      <div style="background:#F1F5F9;padding:16px;border-radius:6px;margin:16px 0;">
        <strong>${ticketTitle}</strong>
      </div>
      <p style="color:#EF4444;font-weight:600;">
        ⚠️ Ce ticket sera fermé automatiquement après <strong>48 heures</strong>
        si vous ne le fermez pas.
      </p>
      ${btn('http://localhost:3000/tickets', 'Voir le ticket')}
    `),
  });
}

function emailTicketTransferred(agentEmail, ticketId, ticketTitle, fromName) {
  return sendEmail({
    to: agentEmail,
    subject: `[Ticket #${ticketId}] Ticket transféré`,
    html: base('#8B5CF6', `
      <h2 style="color:#8B5CF6;margin-top:0;">Ticket transféré</h2>
      <p><strong>${fromName}</strong> vous a transféré le ticket <strong>#${ticketId}</strong>.</p>
      <div style="background:#F1F5F9;padding:16px;border-radius:6px;margin:16px 0;">
        <strong>${ticketTitle}</strong>
      </div>
      <p style="color:#EF4444;font-weight:600;">
        ⚠️ Le délai de 48 heures redémarre à partir de maintenant.
      </p>
      ${btn('http://localhost:3000/tickets', 'Voir le ticket')}
    `),
  });
}

function emailTicketAutoClose(agentEmail, ticketId, ticketTitle) {
  return sendEmail({
    to: agentEmail,
    subject: `[Ticket #${ticketId}] Fermé automatiquement`,
    html: base('#EF4444', `
      <h2 style="color:#EF4444;margin-top:0;">Ticket fermé automatiquement</h2>
      <p>Le ticket <strong>#${ticketId}</strong> a été fermé après 48 heures sans clôture.</p>
      <div style="background:#F1F5F9;padding:16px;border-radius:6px;margin:16px 0;">
        <strong>${ticketTitle}</strong>
      </div>
    `),
  });
}

function emailTicketClosed(clientEmail, ticketId, ticketTitle) {
  return sendEmail({
    to: clientEmail,
    subject: `[Ticket #${ticketId}] Votre ticket a été résolu`,
    html: base('#10B981', `
      <h2 style="color:#10B981;margin-top:0;">Ticket résolu</h2>
      <p>Votre ticket <strong>#${ticketId}</strong> a été fermé.</p>
      <div style="background:#F1F5F9;padding:16px;border-radius:6px;margin:16px 0;">
        <strong>${ticketTitle}</strong>
      </div>
      <p>Si votre problème n'est pas résolu, vous pouvez rouvrir ce ticket.</p>
      ${btn('http://localhost:3000/tickets', 'Mes tickets')}
    `),
  });
}

function emailNewResponse(recipientEmail, ticketId, ticketTitle, senderName) {
  return sendEmail({
    to: recipientEmail,
    subject: `[Ticket #${ticketId}] Nouvelle réponse de ${senderName}`,
    html: base('#F59E0B', `
      <h2 style="color:#1D4ED8;margin-top:0;">Nouvelle réponse</h2>
      <p><strong>${senderName}</strong> a répondu sur votre ticket <strong>#${ticketId}</strong>.</p>
      <div style="background:#F1F5F9;padding:16px;border-radius:6px;margin:16px 0;">
        <strong>${ticketTitle}</strong>
      </div>
      ${btn(`http://localhost:3000/tickets/${ticketId}`, 'Voir la réponse')}
    `),
  });
}

function emailNewTicketCreated(adminEmail, ticketId, ticketTitle, clientName, agentName) {
  return sendEmail({
    to: adminEmail,
    subject: `[Ticket #${ticketId}] Nouveau ticket créé`,
    html: base('#0EA5E9', `
      <h2 style="color:#0EA5E9;margin-top:0;">Nouveau ticket créé</h2>
      <p>Un nouveau ticket a été soumis et assigné automatiquement.</p>
      <div style="background:#F1F5F9;padding:16px;border-radius:6px;margin:16px 0;">
        <p style="margin:0 0 8px;"><strong>#${ticketId}</strong> — ${ticketTitle}</p>
        <p style="margin:0 0 4px;color:#64748B;">Client : <strong>${clientName}</strong></p>
        <p style="margin:0;color:#64748B;">Agent assigné : <strong>${agentName}</strong></p>
      </div>
      ${btn(`http://localhost:3000/tickets/${ticketId}`, 'Voir le ticket')}
    `),
  });
}

module.exports = {
  sendEmail,
  emailTicketAssigned,
  emailTicketTransferred,
  emailTicketAutoClose,
  emailTicketClosed,
  emailNewResponse,
  emailNewTicketCreated,
};
