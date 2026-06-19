require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./Config/db');

// Connect to MongoDB
connectDB();
const app = express();

// Parse JSON request bodies
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from this origin
}));

// Images are stored directly in MongoDB as data URLs (no local /uploads static serving needed).
// (Leaving this commented prevents breaking existing clients.)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const authRoutes = require('./Routes/authRoutes');
const productRoutes = require('./Routes/productRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const orderRoutes = require('./Routes/orderRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});