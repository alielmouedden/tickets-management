-- ============================================================
-- GESTION DE TICKETS - Schéma PostgreSQL
-- Base de données : gesrion_tickets
-- ============================================================

-- Nettoyage dans l'ordre des FK
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_history CASCADE;
DROP TABLE IF EXISTS ticket_responses CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS priorities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- TABLE : roles
-- ============================================================
CREATE TABLE roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- ============================================================
-- TABLE : users
-- ============================================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE : categories
-- ============================================================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE : priorities
-- ============================================================
CREATE TABLE priorities (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL,
  level INTEGER NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280'
);

-- ============================================================
-- TABLE : tickets
-- ============================================================
CREATE TABLE tickets (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  status        VARCHAR(50) DEFAULT 'nouveau'
                  CHECK (status IN ('nouveau','ouverte','en cours de traitement','ferme','reouverte')),
  priority_id   INTEGER REFERENCES priorities(id) ON DELETE SET NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  client_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_to   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  closed_at     TIMESTAMP,
  auto_close_at TIMESTAMP
);

-- ============================================================
-- TABLE : ticket_attachments
-- ============================================================
CREATE TABLE ticket_attachments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  file_path   VARCHAR(500) NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE : ticket_responses
-- ============================================================
CREATE TABLE ticket_responses (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE : ticket_history  (journal d'audit)
-- ============================================================
CREATE TABLE ticket_history (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  old_value  VARCHAR(255),
  new_value  VARCHAR(255),
  note       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE : notifications  (in-app)
-- ============================================================
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ticket_id  INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- DONNÉES PAR DÉFAUT
-- ============================================================
INSERT INTO roles (name) VALUES ('client'), ('agent'), ('admin');

INSERT INTO priorities (name, level, color) VALUES
  ('Faible',  1, '#6B7280'),
  ('Moyenne', 2, '#3B82F6'),
  ('Haute',   3, '#F59E0B'),
  ('Urgente', 4, '#EF4444');

INSERT INTO categories (name, description) VALUES
  ('Technique',       'Problèmes techniques, bugs, pannes'),
  ('Facturation',     'Questions liées aux factures et paiements'),
  ('Commercial',      'Demandes commerciales et informations'),
  ('Support général', 'Questions et assistance générale'),
  ('Sécurité',        'Problèmes de sécurité et accès');

-- Administrateur par défaut  (mot de passe : Admin@2026)
INSERT INTO users (full_name, email, password_hash, role_id)
VALUES (
  'Administrateur',
  'admin@tickets.com',
  '$2b$10$9lZkJOueU9FHjnbK8qvR6eHy7ZcQY9loCcHu5XkNATungyPsFJdv2',
  (SELECT id FROM roles WHERE name = 'admin')
);

-- Agent de démonstration  (mot de passe : Agent@2026)
INSERT INTO users (full_name, email, password_hash, role_id)
VALUES (
  'Agent Support',
  'agent@tickets.com',
  '$2b$10$wHrqn6se2FKVFjgJiMVJqeU1FcRpr6PiQWXlAl8Dp/P9576c1j8Pu',
  (SELECT id FROM roles WHERE name = 'agent')
);

-- Client de démonstration  (mot de passe : Client@2026)
INSERT INTO users (full_name, email, password_hash, role_id)
VALUES (
  'Client Demo',
  'client@tickets.com',
  '$2b$10$OkcX1/UUViiM1c33obReOOaDCDzuuuCA3I74hKXIMmsdacS7ThTuS',
  (SELECT id FROM roles WHERE name = 'client')
);
