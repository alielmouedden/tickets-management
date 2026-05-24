import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { PlusCircle, Search, X, Ticket } from 'lucide-react';

const fmtDate = (d) => {
  const dt = new Date(d);
  const Y  = dt.getFullYear();
  const M  = String(dt.getMonth() + 1).padStart(2, '0');
  const D  = String(dt.getDate()).padStart(2, '0');
  const h  = String(dt.getHours()).padStart(2, '0');
  const m  = String(dt.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
};

const STATUS_OPTS = [
  { value:'',                      label:'Tous les statuts' },
  { value:'nouveau',               label:'Nouveau' },
  { value:'ouverte',               label:'Ouverte' },
  { value:'en cours de traitement',label:'En cours de traitement' },
  { value:'ferme',                 label:'Fermé' },
  { value:'reouverte',             label:'Réouverte' },
];

export default function TicketList() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [tickets,    setTickets]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filters, setFilters] = useState({ status:'', priority_id:'', category_id:'', search:'' });

  useEffect(() => {
    Promise.all([
      api.get('/admin/categories'),
      api.get('/admin/priorities'),
    ]).then(([c, p]) => { setCategories(c.data); setPriorities(p.data); });
    fetchTickets();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  async function fetchTickets() {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
      const res = await api.get('/tickets', { params });
      setTickets(res.data);
    } catch {}
    finally { setLoading(false); }
  }

  const setFilter = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {user.role === 'client' ? 'Mes tickets' : 'Tous les tickets'}
          </h1>
          <p className="text-muted text-sm">{tickets.length} ticket(s) trouvé(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets/new')}
          style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <PlusCircle size={15} /> Nouveau ticket
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap" style={{ minWidth: 240 }}>
          <span className="search-icon"><Search size={15} /></span>
          <input
            className="form-control"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={setFilter('search')}
          />
        </div>
        <select className="form-control" style={{ width:180 }} value={filters.status} onChange={setFilter('status')}>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="form-control" style={{ width:160 }} value={filters.priority_id} onChange={setFilter('priority_id')}>
          <option value="">Toutes priorités</option>
          {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="form-control" style={{ width:180 }} value={filters.category_id} onChange={setFilter('category_id')}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {Object.values(filters).some(Boolean) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status:'', priority_id:'', category_id:'', search:'' })}
            style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <X size={13} /> Réinitialiser
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : tickets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon"><Ticket size={48} color="var(--border)" /></div>
            <h3>Aucun ticket trouvé</h3>
            <p>Essayez de modifier vos filtres ou créez un nouveau ticket.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Catégorie</th>
                  {user.role !== 'client' && <th>Client</th>}
                  {user.role !== 'client' && <th>Agent</th>}
                  <th>Réponses</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                    <td style={{ color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap' }}>#{t.id}</td>
                    <td style={{ maxWidth:240 }}>
                      <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                      <div className="text-xs text-muted" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>
                        {t.description}
                      </div>
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {t.priority_name ? (
                        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, whiteSpace:'nowrap' }}>
                          <span style={{ width:9,height:9,borderRadius:'50%',background:t.priority_color,display:'inline-block'}} />
                          {t.priority_name}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-sm">{t.category_name || '—'}</td>
                    {user.role !== 'client' && <td className="text-sm">{t.client_name || '—'}</td>}
                    {user.role !== 'client' && (
                      <td>
                        {t.assigned_name
                          ? <span className="badge badge-agent">{t.assigned_name}</span>
                          : <span className="text-muted text-sm">Non assigné</span>}
                      </td>
                    )}
                    <td className="text-sm text-muted">{t.response_count || 0}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', fontFamily:'monospace' }}>
                      {fmtDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
