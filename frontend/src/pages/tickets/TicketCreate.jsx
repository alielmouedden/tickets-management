import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Paperclip, File, CheckCircle, Loader2 } from 'lucide-react';

export default function TicketCreate() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', priority_id: '', category_id: '', client_id: '',
  });
  const [files,      setFiles]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [clients,    setClients]    = useState([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    api.get('/admin/categories').then(r => setCategories(r.data));
    api.get('/admin/priorities').then(r => setPriorities(r.data));
    if (user.role !== 'client') {
      api.get('/admin/clients').then(r => setClients(r.data));
    }
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Titre et description sont requis');
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title',       form.title);
      data.append('description', form.description);
      if (form.priority_id) data.append('priority_id', form.priority_id);
      if (form.category_id) data.append('category_id', form.category_id);
      if (form.client_id && user.role !== 'client') data.append('client_id', form.client_id);
      files.forEach(f => data.append('attachments', f));

      await api.post('/tickets', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Ticket créé avec succès !');
      navigate('/tickets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1>Nouveau ticket</h1>
          <p className="text-muted text-sm">Décrivez votre problème en détail</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}
          style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <ArrowLeft size={15} /> Retour
        </button>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="card-body">

            {user.role !== 'client' && (
              <div className="form-group">
                <label className="form-label">Client</label>
                <select className="form-control" value={form.client_id} onChange={set('client_id')}>
                  <option value="">Moi-même</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Titre <span style={{ color:'var(--error)' }}>*</span></label>
              <input
                className="form-control"
                placeholder="Résumez votre problème en une phrase"
                value={form.title}
                onChange={set('title')}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description <span style={{ color:'var(--error)' }}>*</span></label>
              <textarea
                className="form-control"
                placeholder="Décrivez votre problème en détail : contexte, étapes pour reproduire, message d'erreur..."
                rows={6}
                value={form.description}
                onChange={set('description')}
                required
              />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="form-group">
                <label className="form-label">Priorité</label>
                <select className="form-control" value={form.priority_id} onChange={set('priority_id')}>
                  <option value="">Sélectionner</option>
                  {priorities.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-control" value={form.category_id} onChange={set('category_id')}>
                  <option value="">Sélectionner</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pièces jointes</label>
              <label className="file-drop">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
                  onChange={e => setFiles(Array.from(e.target.files))}
                />
                <Paperclip size={32} strokeWidth={1.5} style={{ marginBottom: 8, color: 'var(--text-muted)' }} />
                <div style={{ fontWeight:600 }}>Cliquez ou glissez des fichiers ici</div>
                <div className="text-sm text-muted" style={{ marginTop:4 }}>
                  JPG, PNG, PDF, DOC, TXT, ZIP — max 10 Mo par fichier
                </div>
                {files.length > 0 && (
                  <div style={{ marginTop: 12, display:'flex', flexWrap:'wrap', gap:6 }}>
                    {files.map((f, i) => (
                      <span key={i} style={{
                        background:'var(--primary-bg)', color:'var(--primary)',
                        padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:500,
                        display:'inline-flex', alignItems:'center', gap:5,
                      }}>
                        <File size={12} /> {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </label>
            </div>
          </div>

          <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              {loading
                ? <><Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} /> Création...</>
                : <><CheckCircle size={15} /> Créer le ticket</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
