const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv'); // Load dotenv package

dotenv.config(); // Load environment variables from .env file

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(bodyParser.json());
app.use(express.static('public'));

// Create tables if they do not exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        matric_number TEXT PRIMARY KEY,
        name TEXT,
        department TEXT,
        college TEXT,
        level TEXT,
        hostel TEXT,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matric_number TEXT,
        foods TEXT,
        FOREIGN KEY(matric_number) REFERENCES users(matric_number)
    )`);
});

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email from environment variables
        pass: process.env.EMAIL_PASS // Your email password from environment variables
    }
});

// Sign-up route
app.post('/signup', (req, res) => {
    const { matric_number, name, department, college, level, hostel, password } = req.body;
    const query = `INSERT INTO users (matric_number, name, department, college, level, hostel, password) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [matric_number, name, department, college, level, hostel, password], (err) => {
        if (err) {
            res.json({ success: false, message: 'Sign-up failed. Matric number might already exist.' });
        } else {
            res.json({ success: true });
        }
    });
});

// Sign-in route
app.post('/signin', (req, res) => {
    const { matric_number, password } = req.body;
    const query = `SELECT * FROM users WHERE matric_number = ? AND password = ?`;

    db.get(query, [matric_number, password], (err, row) => {
        if (err || !row) {
            res.json({ success: false, message: 'Invalid login credentials' });
        } else {
            res.json({ success: true });
        }
    });
});

// Order route
app.post('/order', (req, res) => {
    const { matric_number, foods } = req.body;
    const query = `INSERT INTO orders (matric_number, foods) VALUES (?, ?)`;

    db.run(query, [matric_number, JSON.stringify(foods)], (err) => {
        if (err) {
            res.json({ success: false, message: 'Order placement failed' });
        } else {
            // Prepare email content
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER, // Send to your own email for testing
                subject: 'New Order Received',
                text: `Order Details:\n\nMatric Number: ${matric_number}\nFoods: ${foods.join(', ')}`
            };

            // Send email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });

            res.json({ success: true });
        }
    });
});

// Profile update route
app.post('/update-profile', (req, res) => {
    const { matric_number, name, department, college, level, hostel } = req.body;
    const query = `
        UPDATE users 
        SET name = ?, department = ?, college = ?, level = ?, hostel = ?
        WHERE matric_number = ?`;

    db.run(query, [name, department, college, level, hostel, matric_number], function(err) {
        if (err) {
            console.error('Error updating profile:', err.message);
            res.status(500).json({ success: false, error: 'Failed to update profile' });
        } else {
            console.log(`Profile updated successfully: ${this.changes} row(s) affected`);
            res.json({ success: true });
        }
    });
});

// Serve index.html for the order page
app.get('/order', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
