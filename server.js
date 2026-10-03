require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./Config/db');
const { connectCache } = require('./Config/cache');

connectCache();
const app = express();

// ---------- CORS ----------
const clean = (u) => (u || '').trim().replace(/\/+$/, '');

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(clean)
  .filter(Boolean)
  .concat('http://localhost:5173');

// Your own Vercel deployment URLs for this frontend project
const vercelPattern = /^https:\/\/e-commerce-frontend-[a-z0-9-]+-samvod21s-projects\.vercel\.app$/;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const o = clean(origin);
    if (allowedOrigins.includes(o) || vercelPattern.test(o)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions));
// ---------------------------

app.use(express.json());

app.use(async (req, res, next) => {
  try { await connectDB(); next(); } catch (err) { next(err); }
});

app.get('/', (req, res) => res.json({ status: 'API running' }));

app.use('/api/auth', require('./Routes/authRoutes'));
app.use('/api/products', require('./Routes/productRoutes'));
app.use('/api/cart', require('./Routes/cartRoutes'));
app.use('/api/orders', require('./Routes/orderRoutes'));

module.exports = app;

// Only listen when running locally (node server.js / nodemon)
if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}