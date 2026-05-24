import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Ticket, PlusCircle, Users,
  FolderOpen, Zap, BarChart2, HardDrive, LogOut,
} from 'lucide-react';

const clientLinks = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/tickets',     icon: Ticket,           label: 'Mes tickets' },
  { to: '/tickets/new', icon: PlusCircle,       label: 'Nouveau ticket' },
];

const agentLinks = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/tickets',     icon: Ticket,           label: 'Tickets' },
  { to: '/tickets/new', icon: PlusCircle,       label: 'Créer un ticket' },
];

const adminLinks = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Tableau de bord',  section: 'PRINCIPAL' },
  { to: '/tickets',          icon: Ticket,           label: 'Tous les tickets' },
  { to: '/tickets/new',      icon: PlusCircle,       label: 'Créer un ticket' },
  { to: '/admin/users',      icon: Users,            label: 'Utilisateurs',    section: 'ADMINISTRATION' },
  { to: '/admin/categories', icon: FolderOpen,       label: 'Catégories' },
  { to: '/admin/priorities', icon: Zap,              label: 'Priorités' },
  { to: '/admin/stats',      icon: BarChart2,        label: 'Statistiques' },
  { to: '/admin/backup',     icon: HardDrive,        label: 'Sauvegarde' },
];

const roleLabels = { client: 'Client', agent: 'Agent Support', admin: 'Administrateur' };

export default function Sidebar({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'admin' ? adminLinks
              : user?.role === 'agent' ? agentLinks
              : clientLinks;

  function handleLogout() {
    logout();
    navigate('/login');
    toast.success('Déconnexion réussie');
  }

  let prevSection = null;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* Logo */}
      <div className="sidebar-logo-wrap">
        <div className="sidebar-logo-box">
          <img src="/logo.png" alt="SRML Logo" />
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {links.map((link) => {
          const showSection = !collapsed && link.section && link.section !== prevSection;
          if (link.section) prevSection = link.section;
          const Icon = link.icon;
          return (
            <div key={link.to}>
              {showSection && <div className="sidebar-section">{link.section}</div>}
              <NavLink
                to={link.to}
                end={link.to === '/dashboard'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon-wrap"><Icon size={16} strokeWidth={2} /></span>
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* User + Logout at bottom */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-s">
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="user-info-s" style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="uname-s" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user.full_name}
                  </div>
                  <div className="urole-s">{roleLabels[user.role] || user.role}</div>
                </div>
                <button
                  className="sidebar-logout-btn"
                  onClick={handleLogout}
                  title="Se déconnecter"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
