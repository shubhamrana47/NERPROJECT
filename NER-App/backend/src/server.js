
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Health check: confirms the HTTP server is responding
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ner-backend',
  });
});

// API routes
app.use('/api/documents', require('./routes/documentRoutes'));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Request error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Listen on Railway's assigned port
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on primary port ${PORT}`);

  // Dual-listen on port 5000 if Railway assigned a different port (e.g. 8080)
  if (PORT !== 5000) {
    try {
      const altServer = app.listen(5000, '0.0.0.0', () => {
        console.log('API also running on fallback port 5000');
      });
      altServer.on('error', () => {});
    } catch (_) {}
  }

  // Connect to MongoDB after the HTTP server starts
  connectDB()
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
      console.error('MongoDB connection failed:', err.message);
    });
});

// Log unexpected server errors
server.on('error', (err) => {
  console.error('HTTP server error:', err);
  process.exit(1);
});
