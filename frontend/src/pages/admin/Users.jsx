import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ROLES = ['client', 'agent', 'admin'];

function UserModal({ user, onSave, onCancel }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email:     user?.email    || '',
    role:      user?.role     || 'client',
    is_active: user?.is_active ?? true,
    password:  '',
  });

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">{isEdit ? 'Modifier' : 'Ajouter'} un utilisateur</div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom complet</label>
            <input className="form-control" value={form.full_name} onChange={set('full_name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Rôle</label>
              <select className="form-control" value={form.role} onChange={set('role')}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-control"
                value={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              {isEdit ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe'}
            </label>
            <input className="form-control" type="password" value={form.password}
              onChange={set('password')}
              placeholder={isEdit ? 'Laisser vide pour ne pas changer' : ''} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            {isEdit ? 'Sauvegarder' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try { const res = await api.get('/admin/users'); setUsers(res.data); }
    catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }

  async function handleSave(form) {
    try {
      if (modal.mode === 'edit') {
        await api.put(`/admin/users/${modal.user.id}`, form);
        toast.success('Utilisateur mis à jour');
      } else {
        await api.post('/admin/users', form);
        toast.success('Utilisateur créé');
      }
      setModal(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Utilisateur supprimé');
      setConfirm(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestion des utilisateurs</h1>
          <p className="text-muted text-sm">{users.length} utilisateur(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode:'create' })}>
          + Ajouter
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <input className="form-control" style={{ maxWidth:300 }}
            placeholder="Rechercher un utilisateur..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div className="page-loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th><th>Email</th><th>Rôle</th>
                  <th>Statut</th><th>Créé le</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight:600 }}>{u.full_name}</td>
                    <td className="text-sm">{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className="badge" style={{
                        background: u.is_active ? '#D1FAE5' : '#FEE2E2',
                        color:      u.is_active ? '#065F46' : '#991B1B',
                      }}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:2 }}>
                        <button className="tbl-action edit"
                          onClick={() => setModal({ mode:'edit', user: u })} title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button className="tbl-action delete"
                          onClick={() => setConfirm(u.id)} title="Supprimer">
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

      {modal && (
        <UserModal user={modal.user} onSave={handleSave} onCancel={() => setModal(null)} />
      )}

      {confirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:380 }}>
            <div className="modal-header">Supprimer l'utilisateur</div>
            <div className="modal-body"><p>Cette action est irréversible.</p></div>
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
