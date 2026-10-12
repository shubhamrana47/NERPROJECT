require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Confidence threshold: 0.75
const connectDB = require('./config/db');

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Health check for Railway monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ner-backend' });
});

// API routes
app.use('/api/documents', require('./routes/documentRoutes'));

// Serve frontend build if available (production monorepo mode)
const clientBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`)))
  .catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });

