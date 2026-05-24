import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function CatModal({ cat, onSave, onCancel }) {
  const [form, setForm] = useState({ name: cat?.name||'', description: cat?.description||'' });
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:440 }}>
        <div className="modal-header">{cat ? 'Modifier' : 'Nouvelle'} catégorie</div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input className="form-control" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            {cat ? 'Sauvegarder' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchCats(); }, []);

  async function fetchCats() {
    try { const r = await api.get('/admin/categories'); setCats(r.data); }
    catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }

  async function handleSave(form) {
    try {
      if (modal.cat) await api.put(`/admin/categories/${modal.cat.id}`, form);
      else           await api.post('/admin/categories', form);
      toast.success('Catégorie sauvegardée');
      setModal(null);
      fetchCats();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Catégorie supprimée');
      setConfirm(null);
      fetchCats();
    } catch { toast.error('Erreur'); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Catégories</h1>
          <p className="text-muted text-sm">{cats.length} catégorie(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ cat: null })}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading ? <div className="page-loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nom</th><th>Description</th><th>Créée le</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:600 }}>{c.name}</td>
                    <td className="text-sm text-muted">{c.description || '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:2 }}>
                        <button className="tbl-action edit" onClick={() => setModal({ cat: c })} title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button className="tbl-action delete" onClick={() => setConfirm(c.id)} title="Supprimer">
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

      {modal && <CatModal cat={modal.cat} onSave={handleSave} onCancel={() => setModal(null)} />}

      {confirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:360 }}>
            <div className="modal-header">Supprimer la catégorie</div>
            <div className="modal-body"><p>Supprimer cette catégorie ?</p></div>
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
