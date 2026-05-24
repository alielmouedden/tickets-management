import { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUS_LABELS = {
  'nouveau':                'Nouveau',
  'ouverte':                'Ouverte',
  'en cours de traitement': 'En cours de traitement',
  'ferme':                  'Fermé',
  'reouverte':              'Réouverte',
};
const STATUS_COLORS = {
  'nouveau':                '#3B82F6',
  'ouverte':                '#059669',
  'en cours de traitement': '#92400E',
  'ferme':                  '#6B7280',
  'reouverte':              '#7C3AED',
};
const CAT_COLORS = ['#3B82F6', '#CA8A04', '#7C2D12', '#6B7280', '#059669', '#7C3AED'];

function HBar({ label, value, max, color, right }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 110, fontSize: 13, color: 'var(--text)', textAlign: 'right',
        flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, background: '#EAECF0', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: 6, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{
        width: 36, fontSize: 13, fontWeight: 700, color: 'var(--text)',
        textAlign: 'right', flexShrink: 0,
      }}>
        {right ?? value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
      padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,.06)',
    }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function NumCard({ value, label }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: '20px 16px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 8,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function Stats() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!data)   return <div className="empty-state"><p>Erreur de chargement.</p></div>;

  /* ── Status rows ─────────────────────────────────────── */
  const statusRows = data.byStatus.map(s => ({
    label: STATUS_LABELS[s.status] || s.status,
    value: parseInt(s.count),
    color: STATUS_COLORS[s.status] || '#6B7280',
  }));
  const maxStatus = Math.max(...statusRows.map(r => r.value), 1);

  /* ── Priority rows ───────────────────────────────────── */
  const priorityRows = data.byPriority.map(p => ({
    label: p.name, value: parseInt(p.count), color: p.color,
  }));
  const maxPriority = Math.max(...priorityRows.map(r => r.value), 1);

  /* ── Category rows ───────────────────────────────────── */
  const categoryRows = data.byCategory.map((c, i) => ({
    label: c.name, value: parseInt(c.count), color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  const maxCategory = Math.max(...categoryRows.map(r => r.value), 1);

  /* ── Agent performance ───────────────────────────────── */
  const agentRows = (data.byAgent || []).map(a => ({
    label:  a.full_name,
    closed: parseInt(a.closed) || 0,
    total:  parseInt(a.total)  || 0,
  }));
  const maxAgent = Math.max(...agentRows.map(r => r.total), 1);

  /* ── Urgent count from priorities ────────────────────── */
  const urgentRow  = data.byPriority.find(p => parseInt(p.level) === Math.max(...data.byPriority.map(x => parseInt(x.level))));
  const urgentCount = urgentRow ? parseInt(urgentRow.count) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Statistiques</h1>
      </div>

      {/* ── Top summary numbers ──────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <NumCard value={data.total}               label="Total tickets" />
        <NumCard value={urgentCount}              label="Urgents" />
        <NumCard value={data.users?.clients || 0} label="Clients" />
        <NumCard value={data.users?.agents  || 0} label="Agents" />
        <NumCard value={data.users?.admins  || 0} label="Admins" />
        <NumCard value={`${data.avgResolutionHours}h`} label="Délai moyen" />
      </div>

      {/* ── Row 1: Status + Priority ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ChartCard title="Par statut">
          {statusRows.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun ticket.</p>
            : statusRows.map((r, i) => (
                <HBar key={i} label={r.label} value={r.value} max={maxStatus} color={r.color} />
              ))
          }
        </ChartCard>

        <ChartCard title="Par priorité">
          {priorityRows.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune priorité.</p>
            : priorityRows.map((r, i) => (
                <HBar key={i} label={r.label} value={r.value} max={maxPriority} color={r.color} />
              ))
          }
        </ChartCard>
      </div>

      {/* ── Row 2: Category + Agent performance ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ChartCard title="Par catégorie">
          {categoryRows.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune catégorie.</p>
            : categoryRows.map((r, i) => (
                <HBar key={i} label={r.label} value={r.value} max={maxCategory} color={r.color} />
              ))
          }
        </ChartCard>

        <ChartCard title="Performance agents">
          {agentRows.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun agent.</p>
            : agentRows.map((r, i) => (
                <HBar
                  key={i}
                  label={r.label}
                  value={r.closed}
                  max={maxAgent}
                  color="#10B981"
                  right={`${r.closed}/${r.total}`}
                />
              ))
          }
        </ChartCard>
      </div>
    </div>
  );
}
