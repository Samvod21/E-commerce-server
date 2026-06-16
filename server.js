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

// Static folder for uploaded product images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

const authRoutes = require('./Routes/authRoutes');
const productRoutes = require('./Routes/productRoutes');
const cartRoutes = require('./Routes/cartRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});