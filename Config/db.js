const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Some MongoDB deployments (e.g. older Atlas tiers) do not accept
        // certain mongoose options. Append retryWrites=false to the URI
        // instead of passing legacy options.
        let uri = process.env.MONGO_URI || '';
        if (uri && !/retryWrites=/i.test(uri)) {
            uri += uri.includes('?') ? '&retryWrites=false' : '?retryWrites=false';
        }
        await mongoose.connect(uri);
        console.log('Database connected successfully');
    } catch (error) {
        console.log('Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;