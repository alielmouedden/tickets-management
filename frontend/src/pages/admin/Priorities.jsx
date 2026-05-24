import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function PrioModal({ prio, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:  prio?.name  || '',
    level: prio?.level || 1,
    color: prio?.color || '#6B7280',
  });
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:420 }}>
        <div className="modal-header">{prio ? 'Modifier' : 'Nouvelle'} priorité</div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input className="form-control" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Niveau</label>
              <input className="form-control" type="number" min={1} max={10}
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="color" value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width:40, height:36, border:'1px solid var(--border)', borderRadius:6, padding:2, cursor:'pointer' }} />
                <input className="form-control" value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            {prio ? 'Sauvegarder' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Priorities() {
  const [prios,   setPrios]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchPrios(); }, []);

  async function fetchPrios() {
    try { const r = await api.get('/admin/priorities'); setPrios(r.data); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }

  async function handleSave(form) {
    try {
      if (modal.prio) await api.put(`/admin/priorities/${modal.prio.id}`, form);
      else            await api.post('/admin/priorities', form);
      toast.success('Priorité sauvegardée');
      setModal(null);
      fetchPrios();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/priorities/${id}`);
      toast.success('Priorité supprimée');
      setConfirm(null);
      fetchPrios();
    } catch { toast.error('Erreur'); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Priorités</h1>
          <p className="text-muted text-sm">{prios.length} priorité(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ prio: null })}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading ? <div className="page-loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Couleur</th><th>Nom</th><th>Niveau</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {prios.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span style={{
                        display: 'inline-block', width: 18, height: 18,
                        borderRadius: 4, background: p.color,
                        border: '1px solid rgba(0,0,0,.1)',
                        verticalAlign: 'middle',
                      }} />
                    </td>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td>
                      <span className="badge" style={{ background: p.color + '22', color: p.color }}>
                        Niveau {p.level}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:2 }}>
                        <button className="tbl-action edit" onClick={() => setModal({ prio: p })} title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button className="tbl-action delete" onClick={() => setConfirm(p.id)} title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <PrioModal prio={modal.prio} onSave={handleSave} onCancel={() => setModal(null)} />}

      {confirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:360 }}>
            <div className="modal-header">Supprimer la priorité</div>
            <div className="modal-body"><p>Supprimer cette priorité ?</p></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirm)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
