import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  HardDrive, Download, Loader2,
  Ticket, MessageSquare, Users, FolderOpen, Zap, ScrollText,
} from 'lucide-react';

const sections = [
  { icon: Ticket,        title: 'Tickets',       desc: 'Tous les tickets, statuts, descriptions et métadonnées.' },
  { icon: MessageSquare, title: 'Réponses',       desc: 'Toutes les réponses et conversations liées aux tickets.' },
  { icon: Users,         title: 'Utilisateurs',  desc: 'Profils (sans mots de passe) de tous les utilisateurs.' },
  { icon: FolderOpen,    title: 'Catégories',    desc: 'Liste des catégories configurées.' },
  { icon: Zap,           title: 'Priorités',     desc: 'Niveaux de priorité configurés.' },
  { icon: ScrollText,    title: 'Historique',    desc: "Journal d'audit de toutes les actions sur les tickets." },
];

export default function Backup() {
  const [loading, setLoading] = useState(false);

  async function downloadBackup() {
    setLoading(true);
    try {
      const res = await api.get('/admin/backup', { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `backup-tickets-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Sauvegarde téléchargée !');
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sauvegarde des données</h1>
          <p className="text-muted text-sm">Exportez toutes les données en format Excel</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:800 }}>
        <div className="card" style={{ gridColumn:'1/-1' }}>
          <div className="card-body" style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ marginBottom:16, display:'flex', justifyContent:'center' }}>
              <HardDrive size={56} strokeWidth={1.5} color="var(--primary)" />
            </div>
            <h2 style={{ marginBottom:8 }}>Sauvegarde complète</h2>
            <p style={{ color:'var(--text-muted)', marginBottom:24, maxWidth:480, margin:'0 auto 24px' }}>
              Téléchargez une sauvegarde complète de toutes les données de l'application au format Excel.
              Le fichier inclut tous les éléments listés ci-dessous.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={downloadBackup}
              disabled={loading}
              style={{ minWidth:220, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Préparation...</>
                : <><Download size={16} /> Télécharger la sauvegarde</>}
            </button>
            <div style={{ marginTop:16, fontSize:12, color:'var(--text-muted)' }}>
              Format Excel (.xlsx) — Inclut : tickets, réponses, utilisateurs, catégories, priorités, historique
            </div>
          </div>
        </div>

        {sections.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card">
            <div className="card-body">
              <div style={{ marginBottom:10 }}>
                <Icon size={28} strokeWidth={1.5} color="var(--primary)" />
              </div>
              <h3 style={{ fontWeight:600, marginBottom:6 }}>{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
