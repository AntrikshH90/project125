const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// @route   POST /api/auth/login
router.post('/login', authLimiter, [
    body('email').isEmail(),
    body('password').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// @route   GET /api/auth/me
router.get('/me', auth, async (req, res) => {
    res.json({ success: true, user: req.user });
});

// @route   POST /api/auth/register (admin only)
router.post('/register', auth, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const user = await User.create({ name, email, password, role });
        res.status(201).json({ success: true, data: { id: user._id, email: user.email } });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
