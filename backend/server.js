const express = require('express');
const cors    = require('cors');
require('dotenv').config();

require('./config/db');
const { startAutoCloseJob } = require('./services/autoClose');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => res.json({ message: 'API Gestion de Tickets — en ligne' }));

app.use('/api/auth',   require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/admin',   require('./routes/adminRoutes'));

startAutoCloseJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
