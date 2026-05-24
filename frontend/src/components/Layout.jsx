import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const pageTitles = {
  '/dashboard':         'Tableau de bord',
  '/tickets':           'Tickets',
  '/tickets/new':       'Nouveau ticket',
  '/admin/users':       'Gestion des utilisateurs',
  '/admin/categories':  'Catégories',
  '/admin/priorities':  'Priorités',
  '/admin/stats':       'Statistiques',
  '/admin/backup':      'Sauvegarde',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const title = Object.entries(pageTitles).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || 'TicketPro';

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} />
      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Navbar onToggle={() => setCollapsed(v => !v)} pageTitle={title} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
