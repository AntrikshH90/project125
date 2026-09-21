require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const { authLimiter } = require('./middleware/rateLimit');

const app = express();

// Connect to database (falls back to in-memory demo data if MongoDB is down)
connectDB().then(ok => {
    if (!ok) {
        const { installMemoryFallback } = require('./config/memory');
        installMemoryFallback();
        console.log('⚠ MongoDB unavailable — DEMO MODE active with in-memory data.');
        console.log('  Admin login: admin@emberoak.com / admin123 (data resets on restart)');
    }
});

// Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
});
app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

// Static files (website)
app.use(express.static(path.join(__dirname, '../public')));

// Admin panel
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// 3D immersive experience (built React app)
app.use('/3d', express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 404
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found' });
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🔥 EMBER & OAK server running on port ${PORT}`);
    console.log(`   Website: http://localhost:${PORT}`);
    console.log(`   Admin:   http://localhost:${PORT}/admin`);
});
