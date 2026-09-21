const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 8000
        });
        console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.warn(`✗ Database Error: ${error.message}`);
        console.warn('  Running in LIMITED MODE: site + menu work, but the admin panel and data persistence require MongoDB.');
        return false;
    }
};

const isDBConnected = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
