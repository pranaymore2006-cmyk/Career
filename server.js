// ============================================================
// server.js — Express server for Career Explorer Portal
// ============================================================
// This server provides:
// 1. Static file serving (HTML pages)
// 2. API endpoints for careers, users, reviews, scholarships
// 3. Login authentication (simple, no JWT for simplicity)
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ---------- Middleware ----------
app.use(express.static(__dirname));      // Serve static files
app.use(express.json());                 // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form data

// ---------- Helper: Read data.json ----------
function readData() {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
}

// ---------- Helper: Write data.json ----------
function writeData(data) {
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
}

// ============================================================
// PAGE ROUTES
// ============================================================

// Home page (Career Explorer)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Admin Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Reviews page
app.get('/reviews', (req, res) => {
    res.sendFile(path.join(__dirname, 'reviews.html'));
});

// Streams page (11th & 12th stream guide)
app.get('/streams', (req, res) => {
    res.sendFile(path.join(__dirname, 'streams.html'));
});

// Scholarships page
app.get('/scholarships', (req, res) => {
    res.sendFile(path.join(__dirname, 'scholarships.html'));
});

// ============================================================
// API ROUTES
// ============================================================

// ---------- Get all careers ----------
app.get('/api/careers', (req, res) => {
    const data = readData();
    res.json({ careers: data.careers });
});

// ---------- Login ----------
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const data = readData();
    
    // Find user by email and password (simple comparison for demo)
    const user = data.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Don't send password back to client
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

// ---------- Register new student ----------
app.post('/api/register', (req, res) => {
    const { name, email, password, school } = req.body;
    const data = readData();
    
    // Check if email already exists
    if (data.users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    // Create new user
    const newUser = {
        id: data.users.length + 1,
        name,
        email,
        password,  // In real app, this would be hashed!
        role: 'student',
        joined: new Date().toISOString().split('T')[0],
        school: school || 'Not specified',
        careersViewed: [],
        status: 'Active',
        helpfulnessScore: 0
    };
    
    data.users.push(newUser);
    writeData(data);
    
    const { password: _, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser });
});

// ---------- Get all students (for admin) ----------
app.get('/api/students', (req, res) => {
    const data = readData();
    const students = data.users
        .filter(u => u.role === 'student')
        .map(({ password, ...safeUser }) => safeUser);
    res.json({ students });
});

// ---------- Get admin stats ----------
app.get('/api/admin/stats', (req, res) => {
    const data = readData();
    const students = data.users.filter(u => u.role === 'student');
    const activeStudents = students.filter(s => s.status === 'Active');
    
    // Calculate average helpfulness score
    const scoresWithValues = students.filter(s => s.helpfulnessScore > 0);
    const avgHelpfulness = scoresWithValues.length > 0
        ? (scoresWithValues.reduce((sum, s) => sum + s.helpfulnessScore, 0) / scoresWithValues.length).toFixed(1)
        : 0;
    
    // Count careers viewed
    let totalCareersViewed = 0;
    students.forEach(s => {
        totalCareersViewed += (s.careersViewed || []).length;
    });
    
    res.json({
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        inactiveStudents: students.length - activeStudents.length,
        totalReviews: data.reviews.length,
        avgHelpfulness: avgHelpfulness,
        totalCareersViewed: totalCareersViewed,
        totalScholarships: data.scholarships.length
    });
});

// ---------- Get all reviews ----------
app.get('/api/reviews', (req, res) => {
    const data = readData();
    res.json({ reviews: data.reviews });
});

// ---------- Post a new review ----------
app.post('/api/reviews', (req, res) => {
    const { userId, userName, careerId, careerName, rating, comment } = req.body;
    const data = readData();
    
    const newReview = {
        id: data.reviews.length + 1,
        userId,
        userName,
        careerId,
        careerName,
        rating,
        comment,
        date: new Date().toISOString().split('T')[0]
    };
    
    data.reviews.push(newReview);
    writeData(data);
    
    res.json({ success: true, review: newReview });
});

// ---------- Get all scholarships ----------
app.get('/api/scholarships', (req, res) => {
    const data = readData();
    res.json({ scholarships: data.scholarships });
});

// ---------- Track career view (for helpfulness) ----------
app.post('/api/track-view', (req, res) => {
    const { userId, careerId } = req.body;
    const data = readData();
    
    const user = data.users.find(u => u.id === userId);
    if (user && user.role === 'student') {
        if (!user.careersViewed) user.careersViewed = [];
        if (!user.careersViewed.includes(careerId)) {
            user.careersViewed.push(careerId);
            writeData(data);
        }
    }
    
    res.json({ success: true });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ Career Explorer Portal running at http://localhost:${PORT}`);
    console.log(`   Login page: http://localhost:${PORT}/login`);
    console.log(`   Admin dashboard: http://localhost:${PORT}/dashboard`);
    console.log('Press Ctrl+C to stop the server.');
});