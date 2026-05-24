import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
      });
      toast.success('Compte créé avec succès ! Connectez-vous.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Société Régionale Multiservices Laâyoune" />
        </div>

        <h2>Créer un compte</h2>
        <p className="auth-subtitle">Rejoignez l'espace de gestion de tickets</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom complet</label>
            <input
              className="form-control"
              type="text"
              placeholder="Prénom Nom"
              value={form.full_name}
              onChange={set('full_name')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input
              className="form-control"
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input
                className="form-control"
                type="password"
                placeholder="Min. 6 caractères"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer</label>
              <input
                className="form-control"
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          >
            {loading ? 'Création du compte...' : 'Créer mon compte →'}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ?{' '}
          <Link to="/login" className="auth-link">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
