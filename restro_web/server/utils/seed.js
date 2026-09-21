require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const menuData = [
    { name: 'Smoked Burrata', category: 'starters', description: 'Heirloom tomatoes, basil oil, smoked sea salt', price: 24, badge: "Chef's Pick", featured: true, order: 1 },
    { name: 'Charred Octopus', category: 'starters', description: 'Smoked paprika, fingerling potatoes, lemon', price: 32, order: 2 },
    { name: 'Fire-Roasted Beet Salad', category: 'starters', description: 'Goat cheese, candied walnuts, balsamic reduction', price: 22, order: 3 },
    { name: 'Tuna Crudo', category: 'starters', description: 'Yuzu kosho, micro herbs, sesame oil', price: 28, order: 4 },
    { name: '45-Day Dry-Aged Ribeye', category: 'mains', description: 'Bone marrow butter, charred shallot jus', price: 85, badge: 'Signature', featured: true, order: 1 },
    { name: 'Wood-Fired Lamb', category: 'mains', description: 'Rosemary jus, roasted root vegetables', price: 72, order: 2 },
    { name: 'Pan-Seared Halibut', category: 'mains', description: 'Saffron broth, fennel, sea grapes', price: 68, order: 3 },
    { name: 'Wagyu Striploin', category: 'mains', description: 'Truffle butter, black garlic', price: 145, badge: 'Reserve', order: 4 },
    { name: 'Smoked Chocolate Tart', category: 'desserts', description: 'Hickory smoke, sea salt, vanilla cream', price: 18, order: 1 },
    { name: 'Crème Brûlée', category: 'desserts', description: 'Tonka bean, caramelized sugar', price: 16, order: 2 },
    { name: 'Burnt Basque Cheesecake', category: 'desserts', description: 'Fig compote, honey', price: 17, order: 3 },
    { name: '2018 Reserve Cabernet', category: 'wines', description: 'Napa Valley, full-bodied, blackberry notes', price: 185, badge: 'Reserve', order: 1 },
    { name: 'Château Margaux 2015', category: 'wines', description: 'Bordeaux, France', price: 650, order: 2 },
    { name: 'Domaine Leflaive Puligny-Montrachet', category: 'wines', description: 'Burgundy, France', price: 320, order: 3 },
    { name: 'Smoked Old Fashioned', category: 'cocktails', description: 'Bourbon, maple, hickory smoke', price: 22, order: 1 },
    { name: 'Ember Negroni', category: 'cocktails', description: 'Mezcal, campari, sweet vermouth', price: 20, order: 2 }
];

const seed = async () => {
    try {
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            console.error('✗ Cannot seed: MongoDB is not reachable.');
            process.exit(1);
        }

        await MenuItem.deleteMany({});
        await MenuItem.insertMany(menuData);
        console.log('✓ Menu items seeded');

        await User.deleteMany({});
        await User.create({
            name: 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@emberoak.com',
            password: 'admin123',
            role: 'admin'
        });
        console.log('✓ Admin user created: admin@emberoak.com / admin123');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seed();
