const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

// @route   GET /api/menu
// @desc    Get all menu items
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, includeUnavailable } = req.query;
        const query = {};
        if (!includeUnavailable) query.available = true;
        if (category && category !== 'all') query.category = category;
        const items = await MenuItem.find(query).sort({ order: 1, category: 1 });
        res.json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// @route   POST /api/menu
// @access  Private (admin)
router.post('/', auth, async (req, res) => {
    try {
        const item = await MenuItem.create(req.body);
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/menu/:id
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ success: false });
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// @route   DELETE /api/menu/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
