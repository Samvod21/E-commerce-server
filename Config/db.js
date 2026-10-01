const mongoose = require('mongoose');

let connecting = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return;
    if (!connecting) {
        connecting = mongoose.connect(process.env.MONGO_URI).catch((err) => {
            connecting = null;
            throw err;
        });
    }
    await connecting;
};

module.exports = connectDB;