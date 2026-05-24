import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)    return 'à l\'instant';
  if (secs < 3600)  return `il y a ${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `il y a ${Math.floor(secs / 3600)} h`;
  return `il y a ${Math.floor(secs / 86400)} j`;
}

export default function Navbar({ onToggle, pageTitle }) {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [notifs,     setNotifs]     = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchNotifs() {
    try { const r = await api.get('/tickets/notifications'); setNotifs(r.data); } catch {}
  }

  async function markAll() {
    try {
      await api.patch('/tickets/notifications/read-all');
      setNotifs(n => n.map(x => ({ ...x, is_read: true })));
    } catch {}
  }

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="toggle-btn" onClick={onToggle} title="Réduire le menu">
          <Menu size={18} />
        </button>
        <span className="page-title">{pageTitle}</span>
      </div>

      <div className="navbar-right" ref={notifRef} style={{ position: 'relative' }}>
        <button
          className="notif-btn"
          onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markAll(); }}
          title="Notifications"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        {showNotifs && (
          <div className="notif-dropdown">
            <div className="notif-header">
              <span>Notifications</span>
              <button className="btn btn-ghost btn-sm" onClick={markAll}>Tout lire</button>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifs.length === 0 ? (
                <div className="notif-empty">Aucune notification</div>
              ) : notifs.map(n => (
                <div
                  key={n.id}
                  className={`notif-item${!n.is_read ? ' unread' : ''}`}
                  onClick={() => { setShowNotifs(false); if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`); }}
                >
                  <div className="notif-dot" />
                  <div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
