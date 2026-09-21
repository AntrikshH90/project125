const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['starters', 'mains', 'desserts', 'wines', 'cocktails']
    },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: String,
    badge: String,
    ingredients: [String],
    allergens: [String],
    dietary: [{ type: String, enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'] }],
    pairing: String,
    available: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
