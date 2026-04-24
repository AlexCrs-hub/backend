const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config();

const migrate = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Set everyone to 'operator' by default
    const result = await User.updateMany(
        { role: { $exists: false } },
        { $set: { role: 'operator' } }
    );

    console.log(`Updated ${result.modifiedCount} users`);

    // Then manually promote specific users to admin
    await User.updateOne(
        { email: 'foamco@predictech.com' },
        { $set: { role: 'admin' } }
    );

    console.log('Admin role assigned');
    await mongoose.disconnect();
};

migrate().catch(console.error);