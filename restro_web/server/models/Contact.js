const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    type: { type: String, enum: ['newsletter', 'inquiry', 'private-event', 'press'], required: true },
    name: String,
    email: { type: String, required: true },
    phone: String,
    subject: String,
    message: String,
    metadata: mongoose.Schema.Types.Mixed,
    read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
