import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import {
  ArrowLeft, Pencil, Save, ArrowLeftRight, CheckCircle,
  RotateCcw, Trash2, UserCheck, FileText, Paperclip, File,
  MessageSquare, Send, Info, Clock, ScrollText, FolderOpen, Loader2,
} from 'lucide-react';

function timeStr(d) {
  return new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function SectionTitle({ icon: Icon, children, count }) {
  return (
    <h2 style={{ display:'flex', alignItems:'center', gap:8 }}>
      <Icon size={16} strokeWidth={2} />
      {children}{count !== undefined ? ` (${count})` : ''}
    </h2>
  );
}

function ConfirmModal({ title, text, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">{title}</div>
        <div className="modal-body"><p>{text}</p></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ agents, onTransfer, onCancel }) {
  const [agentId, setAgentId] = useState('');
  const [note,    setNote]    = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">Transférer le ticket</div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Choisir un agent</label>
            <select className="form-control" value={agentId} onChange={e => setAgentId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optionnel)</label>
            <textarea className="form-control" rows={3} value={note}
              onChange={e => setNote(e.target.value)} placeholder="Raison du transfert..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" disabled={!agentId}
            onClick={() => onTransfer(agentId, note)}
            style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <ArrowLeftRight size={15} /> Transférer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetail() {
  const { id }    = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [ticket,  setTicket]   = useState(null);
  const [agents,  setAgents]   = useState([]);
  const [msg,     setMsg]      = useState('');
  const [loading, setLoading]  = useState(true);
  const [sending, setSending]  = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchTicket();
    if (user.role !== 'client') {
      api.get('/admin/agents').then(r => setAgents(r.data));
      api.get('/admin/categories').then(r => setCategories(r.data));
      api.get('/admin/priorities').then(r => setPriorities(r.data));
    } else {
      api.get('/admin/categories').then(r => setCategories(r.data));
      api.get('/admin/priorities').then(r => setPriorities(r.data));
    }
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.responses]);

  async function fetchTicket() {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
      setEditForm({
        title: res.data.title,
        description: res.data.description,
        priority_id: res.data.priority_id || '',
        category_id: res.data.category_id || '',
      });
    } catch { navigate('/tickets'); }
    finally { setLoading(false); }
  }

  async function doAction(path, body = {}) {
    try {
      await api.patch(`/tickets/${id}/${path}`, body);
      toast.success('Action effectuée');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
    setConfirmAction(null);
  }

  async function deleteTicket() {
    try {
      await api.delete(`/tickets/${id}`);
      toast.success('Ticket supprimé');
      navigate('/tickets');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    setConfirmAction(null);
  }

  async function sendResponse(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/responses`, { message: msg });
      setTicket(t => ({ ...t, responses: [...(t.responses || []), res.data] }));
      setMsg('');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSending(false); }
  }

  async function saveEdit() {
    try {
      await api.put(`/tickets/${id}`, editForm);
      toast.success('Ticket mis à jour');
      setEditMode(false);
      fetchTicket();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  }

  async function handleTransfer(agentId, note) {
    await doAction('transfer', { agent_id: parseInt(agentId), note });
    setShowTransfer(false);
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!ticket) return null;

  const isClient      = user.role === 'client';
  const isAgent       = user.role === 'agent';
  const isAdmin       = user.role === 'admin';
  const isAgentOrAdmin = isAgent || isAdmin;
  const isClosed      = ticket.status === 'ferme';
  const canEdit       = !isClosed && (isAdmin || isAgentOrAdmin || (isClient && ticket.client_id === user.id));
  const canClose      = isAgentOrAdmin && !isClosed;
  const canReopen     = isClosed;
  const canTake       = isAgentOrAdmin && !ticket.assigned_to && !isClosed;
  const canTransfer   = isAgentOrAdmin && !isClosed;
  const canDelete     = isAdmin || (isClient && ticket.client_id === user.id);

  const btnStyle = { display:'inline-flex', alignItems:'center', gap:6 };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}
            style={{ ...btnStyle, marginBottom:8 }}>
            <ArrowLeft size={15} /> Retour
          </button>
          {editMode ? (
            <input
              className="form-control"
              style={{ fontSize:20, fontWeight:700, marginBottom:6 }}
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            />
          ) : (
            <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>
              #{ticket.id} — {ticket.title}
            </h1>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <StatusBadge status={ticket.status} />
            {ticket.priority_name && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13 }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:ticket.priority_color, display:'inline-block' }} />
                {ticket.priority_name}
              </span>
            )}
            {ticket.category_name && (
              <span className="badge" style={{ background:'var(--bg)', color:'var(--text-muted)', display:'inline-flex', alignItems:'center', gap:4 }}>
                <FolderOpen size={12} /> {ticket.category_name}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {canTake && (
            <button className="btn btn-primary" style={btnStyle} onClick={() => setConfirmAction('take')}>
              <UserCheck size={15} /> Prendre en charge
            </button>
          )}
          {canEdit && !editMode && (
            <button className="btn btn-ghost" style={btnStyle} onClick={() => setEditMode(true)}>
              <Pencil size={15} /> Modifier
            </button>
          )}
          {editMode && (
            <>
              <button className="btn btn-success" style={btnStyle} onClick={saveEdit}>
                <Save size={15} /> Sauvegarder
              </button>
              <button className="btn btn-ghost" onClick={() => setEditMode(false)}>Annuler</button>
            </>
          )}
          {canTransfer && (
            <button className="btn btn-ghost" style={btnStyle} onClick={() => setShowTransfer(true)}>
              <ArrowLeftRight size={15} /> Transférer
            </button>
          )}
          {canClose && (
            <button className="btn btn-secondary" style={btnStyle} onClick={() => setConfirmAction('close')}>
              <CheckCircle size={15} /> Fermer
            </button>
          )}
          {canReopen && (
            <button className="btn btn-outline" style={btnStyle} onClick={() => setConfirmAction('reopen')}>
              <RotateCcw size={15} /> Rouvrir
            </button>
          )}
          {canDelete && (
            <button className="btn btn-danger btn-sm" style={btnStyle} onClick={() => setConfirmAction('delete')}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="ticket-detail-grid">
        {/* Left: description + responses */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Description */}
          <div className="card">
            <div className="card-header">
              <SectionTitle icon={FileText}>Description</SectionTitle>
            </div>
            <div className="card-body">
              {editMode ? (
                <textarea
                  className="form-control"
                  rows={6}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              ) : (
                <p style={{ whiteSpace:'pre-wrap', lineHeight:1.7 }}>{ticket.description}</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <SectionTitle icon={Paperclip}>Pièces jointes</SectionTitle>
              </div>
              <div className="card-body">
                <div className="attachments-list">
                  {ticket.attachments.map(a => (
                    <a key={a.id} href={`/uploads/${a.file_path.replace(/.*uploads[\\/]/, '')}`}
                      target="_blank" rel="noopener noreferrer" className="attachment-chip">
                      <File size={13} style={{ flexShrink:0 }} /> {a.file_name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Responses */}
          <div className="card">
            <div className="card-header">
              <SectionTitle icon={MessageSquare} count={ticket.responses?.length || 0}>Réponses</SectionTitle>
            </div>
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div className="responses-thread">
                {ticket.responses?.length === 0 && (
                  <p className="text-muted text-sm">Aucune réponse pour le moment.</p>
                )}
                {ticket.responses?.map(r => {
                  const isMe = r.user_id === user.id;
                  return (
                    <div key={r.id} className={`response-bubble${isMe ? ' me' : ''}`}>
                      <div className="response-bubble-inner">{r.message}</div>
                      <div className="response-meta">
                        <span>{r.full_name}</span>
                        <span>·</span>
                        <span className={`badge badge-${r.role}`} style={{ padding:'1px 6px', fontSize:10 }}>{r.role}</span>
                        <span>·</span>
                        <span>{timeStr(r.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Reply box */}
            {!isClosed && (
              <form onSubmit={sendResponse} style={{ padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'flex', gap:8 }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Écrire une réponse..."
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendResponse(e); }}}
                    style={{ resize:'none' }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !msg.trim()}
                    style={{ ...btnStyle, alignSelf:'flex-end', whiteSpace:'nowrap' }}>
                    {sending
                      ? <><Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} /> Envoi...</>
                      : <><Send size={15} /> Envoyer</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right: info panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Ticket info */}
          <div className="card">
            <div className="card-header">
              <SectionTitle icon={Info}>Informations</SectionTitle>
            </div>
            <div className="card-body">
              <div className="ticket-info-panel">
                <div className="info-row">
                  <span className="info-label">Statut</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="info-row">
                  <span className="info-label">Client</span>
                  <span className="text-sm">{ticket.client_name || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Agent</span>
                  <span className="text-sm">{ticket.assigned_name || <span className="text-muted">Non assigné</span>}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Priorité</span>
                  {editMode ? (
                    <select className="form-control" style={{ width:120 }}
                      value={editForm.priority_id}
                      onChange={e => setEditForm(f => ({ ...f, priority_id: e.target.value }))}>
                      <option value="">—</option>
                      {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
                      {ticket.priority_name
                        ? <><span style={{ width:9,height:9,borderRadius:'50%',background:ticket.priority_color,display:'inline-block'}} />{ticket.priority_name}</>
                        : <span className="text-muted">—</span>}
                    </span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Catégorie</span>
                  {editMode ? (
                    <select className="form-control" style={{ width:140 }}
                      value={editForm.category_id}
                      onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">—</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-sm">{ticket.category_name || '—'}</span>
                  )}
                </div>
                <div className="info-row">
                  <span className="info-label">Créé le</span>
                  <span className="text-sm">{timeStr(ticket.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Mis à jour</span>
                  <span className="text-sm">{timeStr(ticket.updated_at)}</span>
                </div>
                {ticket.closed_at && (
                  <div className="info-row">
                    <span className="info-label">Fermé le</span>
                    <span className="text-sm">{timeStr(ticket.closed_at)}</span>
                  </div>
                )}
                {ticket.auto_close_at && (
                  <div className="info-row">
                    <span className="info-label">Fermeture auto</span>
                    <span className="text-sm" style={{ color:'var(--warning)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                      <Clock size={13} /> {timeStr(ticket.auto_close_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="card-header">
              <SectionTitle icon={ScrollText}>Historique</SectionTitle>
            </div>
            <div className="card-body" style={{ maxHeight:280, overflowY:'auto' }}>
              {ticket.history?.length === 0 ? (
                <p className="text-muted text-sm">Aucun historique</p>
              ) : ticket.history?.map(h => (
                <div key={h.id} className="history-item">
                  <div className="history-dot" />
                  <div style={{ flex:1 }}>
                    <div className="history-text">
                      <strong>{h.changed_by_name || 'Système'}</strong> — {h.note || h.action}
                      {h.old_value && h.new_value && ` (${h.old_value} → ${h.new_value})`}
                    </div>
                    <div className="history-time">{timeStr(h.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {confirmAction === 'take' && (
        <ConfirmModal
          title="Prendre en charge"
          text="Vous allez prendre en charge ce ticket. Le délai de 48h démarre. Confirmer ?"
          onConfirm={() => doAction('take-charge')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'close' && (
        <ConfirmModal
          title="Fermer le ticket"
          text="Êtes-vous sûr de vouloir fermer ce ticket ? Le client recevra une notification."
          onConfirm={() => doAction('close')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'reopen' && (
        <ConfirmModal
          title="Rouvrir le ticket"
          text="Voulez-vous rouvrir ce ticket ?"
          onConfirm={() => doAction('reopen')}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'delete' && (
        <ConfirmModal
          title="Supprimer le ticket"
          text="Cette action est irréversible. Confirmer la suppression ?"
          onConfirm={deleteTicket}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {showTransfer && (
        <TransferModal
          agents={agents.filter(a => a.id !== user.id)}
          onTransfer={handleTransfer}
          onCancel={() => setShowTransfer(false)}
        />
      )}
    </div>
  );
}
