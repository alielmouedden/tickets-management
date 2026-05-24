import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard    from './pages/dashboard/Dashboard';
import TicketList   from './pages/tickets/TicketList';
import TicketCreate from './pages/tickets/TicketCreate';
import TicketDetail from './pages/tickets/TicketDetail';
import Users      from './pages/admin/Users';
import Categories from './pages/admin/Categories';
import Priorities from './pages/admin/Priorities';
import Stats      from './pages/admin/Stats';
import Backup     from './pages/admin/Backup';

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/tickets"     element={<TicketList />} />
        <Route path="/tickets/new" element={<TicketCreate />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />

        <Route path="/admin/users"       element={<Guard roles={['admin']}><Users /></Guard>} />
        <Route path="/admin/categories"  element={<Guard roles={['admin']}><Categories /></Guard>} />
        <Route path="/admin/priorities"  element={<Guard roles={['admin']}><Priorities /></Guard>} />
        <Route path="/admin/stats"       element={<Guard roles={['admin']}><Stats /></Guard>} />
        <Route path="/admin/backup"      element={<Guard roles={['admin']}><Backup /></Guard>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
