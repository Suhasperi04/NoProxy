const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
});

// User schema
const userSchema = new mongoose.Schema({
    id: String,
    name: String,
    age: Number,
    email: String
});

const User = mongoose.model('User', userSchema);

// UserLog schema
const userLogSchema = new mongoose.Schema({
    date: String, // Store date as a string in 'YYYY-MM-DD' format
    logs: [
        {
            id: String,
            name: String,
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

const UserLog = mongoose.model('UserLog', userLogSchema);

// Root route
router.get('/', async (req, res) => {
    res.send("It's Working Da");
});

// Register a new user
router.post('/register', async (req, res) => {
    const { id, name, age, email } = req.body;
    const newUser = new User({ id, name, age, email });
    try {
        await newUser.save();
        res.status(201).send('User registered successfully');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(400).send('Error registering user');
    }
});

// Check user and log the entry by date
router.post('/check', async (req, res) => {
    const { id } = req.body;

    try {
        // Find the user in MongoDB by ID
        const user = await User.findOne({ id });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Get the current date in 'YYYY-MM-DD' format
        const currentDate = new Date().toISOString().split('T')[0];

        // Find or create a log for the current date
        let userLog = await UserLog.findOne({ date: currentDate });
        if (!userLog) {
            userLog = new UserLog({ date: currentDate, logs: [] });
        }

        // Create a log entry
        const logEntry = { id: user.id, name: user.name };

        // Add the log entry to the logs array
        userLog.logs.push(logEntry);

        // Save the log
        await userLog.save();

        // Send the log entry back to the client
        res.status(200).json(logEntry);
    } catch (error) {
        console.error('Error checking user:', error);
        res.status(400).send('Error checking user');
    }
});

// Fetch logs for a specific date
router.get('/:date', async (req, res) => {
    const { date } = req.params;    
    try {
        const userLog = await UserLog.findOne({ date });
        if (userLog) {
            res.json(userLog.logs);
        } else {
            res.status(404).send('No logs found for this date');
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(400).send('Error fetching logs');
    }
});

module.exports = router;
