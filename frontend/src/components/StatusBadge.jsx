const labels = {
  'nouveau':               'Nouveau',
  'ouverte':               'Ouverte',
  'en cours de traitement':'En cours de traitement',
  'ferme':                 'Fermé',
  'reouverte':             'Réouverte',
};

const dots = {
  'nouveau':               '#3B82F6',
  'ouverte':               '#059669',
  'en cours de traitement':'#D97706',
  'ferme':                 '#6B7280',
  'reouverte':             '#7C3AED',
};

export default function StatusBadge({ status }) {
  const cssKey = (status || '').replace(/\s+/g, '_');
  return (
    <span className={`badge badge-${cssKey}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dots[status] || '#6B7280', display: 'inline-block', flexShrink: 0 }} />
      {labels[status] || status}
    </span>
  );
}
