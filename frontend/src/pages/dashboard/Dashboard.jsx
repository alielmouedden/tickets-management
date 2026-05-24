import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Clock, CheckCircle, XCircle, Users, PlusCircle } from 'lucide-react';

const fmtDate = (d) => {
  const dt = new Date(d);
  const Y  = dt.getFullYear();
  const M  = String(dt.getMonth() + 1).padStart(2, '0');
  const D  = String(dt.getDate()).padStart(2, '0');
  const h  = String(dt.getHours()).padStart(2, '0');
  const m  = String(dt.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
};
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

function StatCard({ icon: Icon, label, value, bg, iconColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={22} color={iconColor} strokeWidth={2} />
      </div>
      <div className="stat-info">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [tickets,    setTickets]    = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [ticketRes] = await Promise.all([
        api.get('/tickets'),
        user.role === 'admin'
          ? api.get('/admin/stats').then(r => setAdminStats(r.data))
          : Promise.resolve(),
      ]);
      setTickets(ticketRes.data);
    } catch {}
    finally { setLoading(false); }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const counts = {
    total:      tickets.length,
    nouveau:    tickets.filter(t => t.status === 'nouveau').length,
    ouverte:    tickets.filter(t => t.status === 'ouverte').length,
    en_cours:   tickets.filter(t => t.status === 'en cours de traitement').length,
    ferme:      tickets.filter(t => t.status === 'ferme').length,
    reouverte:  tickets.filter(t => t.status === 'reouverte').length,
  };

  const recent = tickets.slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p className="text-muted text-sm">
            Bonjour, <strong>{user?.full_name}</strong> — {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/tickets/new')}>
          <PlusCircle size={15} /> Nouveau ticket
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={Ticket}      label="Total tickets"          value={counts.total}                            bg="#EBF0F8" iconColor="var(--primary)" />
        <StatCard icon={Ticket}      label="Nouveaux"               value={counts.nouveau + counts.reouverte}       bg="#DBEAFE" iconColor="#1E40AF" />
        <StatCard icon={Clock}       label="En cours de traitement" value={counts.en_cours}                         bg="#FEF3C7" iconColor="#92400E" />
        <StatCard icon={CheckCircle} label="Ouvertes"               value={counts.ouverte}                          bg="#D1FAE5" iconColor="#065F46" />
        <StatCard icon={XCircle}     label="Fermés"                 value={counts.ferme}                            bg="#F1F5F9" iconColor="#475569" />
        {user.role === 'admin' && adminStats && (
          <StatCard icon={Users}     label="Utilisateurs actifs" value={adminStats.users?.total || 0}    bg="#EDE9FE"       iconColor="#5B21B6" />
        )}
      </div>

      {/* Recent tickets */}
      <div className="card card-accent">
        <div className="card-header">
          <h2>Tickets récents</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')}>
            Voir tous les tickets →
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><Ticket size={48} color="var(--border)" /></div>
            <h3>Aucun ticket pour le moment</h3>
            <p>Créez votre premier ticket de support.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Catégorie</th>
                  {user.role !== 'client' && <th>Client</th>}
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>#{t.id}</td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {t.priority_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.priority_color, display: 'inline-block' }} />
                          {t.priority_name}
                        </span>
                      ) : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td className="text-sm">{t.category_name || '—'}</td>
                    {user.role !== 'client' && <td className="text-sm">{t.client_name || '—'}</td>}
                    <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', fontFamily:'monospace' }}>
                      {fmtDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
