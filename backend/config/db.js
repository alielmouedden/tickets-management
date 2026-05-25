// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Le "Pool" gère plusieurs connexions à PostgreSQL automatiquement
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Test de connexion au démarrage
pool.connect()
  .then(() => console.log('✅ Connecté à PostgreSQL'))
  .catch((err) => console.error('❌ Erreur connexion PostgreSQL:', err.message));

module.exports = pool;