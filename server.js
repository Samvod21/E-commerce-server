require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./Config/db');
const { connectCache } = require('./Config/cache');

connectCache();
const app = express();

const clean = (u) => (u || '').trim().replace(/\/+$/, '');
const allowedOrigins = [clean(process.env.FRONTEND_URL), 'http://localhost:5173'].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));

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