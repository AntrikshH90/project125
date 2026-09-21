const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');
const auth = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimit');

// @route   POST /api/contact
// @desc    Contact / newsletter submission
// @access  Public
router.post('/', contactLimiter, [
    body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    try {
        const payload = { ...req.body };
        // Default type when the frontend doesn't send one (e.g. newsletter signup)
        if (!payload.type) {
            payload.type = payload.message && /newsletter|subscribe/i.test(payload.message) ? 'newsletter' : 'inquiry';
        }
        await Contact.create(payload);

        if (payload.type === 'newsletter') {
            try {
                await sendEmail({
                    to: payload.email,
                    subject: 'Welcome to the Ember & Oak Circle',
                    html: emailTemplates.welcome(payload.name)
                });
            } catch (e) {}
        }
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/contact
// @desc    List contact submissions (admin)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 }).limit(200);
        res.json({ success: true, count: contacts.length, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PATCH /api/contact/:id/read
// @access  Private
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const contact = await Contact.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
        if (!contact) return res.status(404).json({ success: false });
        res.json({ success: true, data: contact });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
