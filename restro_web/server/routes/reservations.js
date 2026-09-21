const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');
const auth = require('../middleware/auth');
const { reservationLimiter } = require('../middleware/rateLimit');

const MAX_GUESTS_PER_SLOT = 60;

// @route   POST /api/reservations
// @desc    Create a new reservation
// @access  Public
router.post('/', reservationLimiter, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('guests').isInt({ min: 1, max: 20 }).withMessage('Guests must be 1-20'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('time').notEmpty().withMessage('Time is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }

    try {
        const { name, email, phone, guests, date, time, requests } = req.body;

        // Capacity check for the requested slot
        const slotStart = new Date(date);
        slotStart.setHours(0, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setDate(slotEnd.getDate() + 1);

        const slotReservations = await Reservation.find({
            date: { $gte: slotStart, $lt: slotEnd },
            time,
            status: { $in: ['pending', 'confirmed'] }
        });
        const slotGuests = slotReservations.reduce((sum, r) => sum + r.guests, 0);
        if (slotGuests + Number(guests) > MAX_GUESTS_PER_SLOT) {
            return res.status(409).json({ success: false, message: 'That time slot is fully booked. Please choose another time.' });
        }

        const reservation = await Reservation.create({
            name, email, phone, guests: Number(guests),
            date: new Date(date), time, requests: requests || ''
        });

        // Send confirmation email (non-blocking failure)
        try {
            await sendEmail({
                to: email,
                subject: 'Reservation Confirmed — EMBER & OAK',
                html: emailTemplates.reservation({
                    name,
                    date: new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    time,
                    guests,
                    code: reservation.confirmationCode
                })
            });
        } catch (e) { console.log('Email failed:', e.message); }

        res.status(201).json({
            success: true,
            data: { confirmationCode: reservation.confirmationCode, id: reservation._id }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/reservations/availability
// @desc    Check time slot availability
// @access  Public
router.get('/availability', async (req, res) => {
    try {
        const { date, time } = req.query;
        if (!date || !time) return res.status(400).json({ success: false, message: 'date and time required' });
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const slots = await Reservation.find({
            date: { $gte: dayStart, $lt: dayEnd },
            time,
            status: { $in: ['pending', 'confirmed'] }
        });
        const booked = slots.reduce((sum, r) => sum + r.guests, 0);
        res.json({ success: true, available: booked < MAX_GUESTS_PER_SLOT, remaining: Math.max(0, MAX_GUESTS_PER_SLOT - booked) });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// @route   GET /api/reservations
// @desc    Get all reservations (admin)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, date, page = 1, limit = 50 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            query.date = { $gte: start, $lt: end };
        }
        const reservations = await Reservation.find(query)
            .sort({ date: -1, time: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        const count = await Reservation.countDocuments(query);
        res.json({ success: true, count, data: reservations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PATCH /api/reservations/:id
// @desc    Update reservation status
// @access  Private
router.patch('/:id', auth, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            { ...(status && { status }), ...(notes !== undefined && { notes }) },
            { new: true }
        );
        if (!reservation) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: reservation });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/reservations/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        await Reservation.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
