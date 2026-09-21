const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    guests: { type: Number, required: true, min: 1, max: 20 },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    requests: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        default: 'pending'
    },
    confirmationCode: { type: String, unique: true },
    depositPaid: { type: Boolean, default: false },
    depositAmount: { type: Number, default: 0 },
    stripePaymentId: String,
    tablePreference: String,
    occasion: String,
    source: { type: String, default: 'website' },
    notes: { type: String, default: '' }
}, { timestamps: true });

reservationSchema.pre('save', function(next) {
    if (!this.confirmationCode) {
        this.confirmationCode = 'EO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
    next();
});

reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ email: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
