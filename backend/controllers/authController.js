// controllers/authController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ============================================
// INSCRIPTION
// ============================================
async function register(req, res) {
  try {
    const { full_name, email, password, role } = req.body;

    // 1. Vérifier que les champs obligatoires sont là
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    // 2. Vérifier que l'email n'existe pas déjà
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    // 3. Récupérer l'id du rôle (par défaut 'client' à l'inscription)
    const roleName = role || 'client';
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    const roleId = roleResult.rows[0].id;

    // 4. Hacher le mot de passe (jamais stocké en clair !)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Insérer l'utilisateur dans la base
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role_id`,
      [full_name, email, passwordHash, roleId]
    );

    res.status(201).json({
      message: 'Inscription réussie',
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error('Erreur register:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ============================================
// CONNEXION
// ============================================
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // 1. Chercher l'utilisateur + son rôle (jointure)
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // 2. Vérifier que le compte est actif
    if (!user.is_active) {
      return res.status(403).json({ message: 'Compte désactivé, contactez l\'admin' });
    }

    // 3. Comparer le mot de passe fourni avec le hash stocké
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // 4. Générer le token JWT (valable 8h)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Erreur login:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ============================================
// PROFIL (utilisateur connecté)
// ============================================
async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, r.name AS role, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur getProfile:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

module.exports = { register, login, getProfile };