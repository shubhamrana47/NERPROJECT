const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Trust reverse proxies (Railway, Cloudflare, etc.)
app.set('trust proxy', 1);

// Permissive and explicit CORS configuration
const corsOptions = {
  origin: true, // Echoes the request origin (supports https://nerproject-production-e534.up.railway.app, localhost, etc.)
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Explicit header fallback middleware for every response (guarantees headers even on errors)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check: confirms the HTTP server is responding
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ner-backend',
  });
});

// API routes
app.use('/api/documents', require('./routes/documentRoutes'));

// Error handler (ensures CORS headers remain present on error responses)
app.use((err, req, res, _next) => {
  console.error('Request error:', err);
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
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
