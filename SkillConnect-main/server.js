const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'skillconnect-secret-key-2024';

const fallbackDb = require('./fallback-db');

// MySQL Connection Pool with graceful fallback
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Change this to your MySQL password
    database: 'skillconnect',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let mysqlPool = null;
let useFallback = false;

try {
    mysqlPool = mysql.createPool(dbConfig);
} catch (e) {
    useFallback = true;
}

// Test MySQL connection once at startup
(async () => {
    try {
        if (!mysqlPool) throw new Error('MySQL pool not initialized');
        const conn = await mysqlPool.getConnection();
        conn.release();
        console.log("📊 Database: MySQL connected to 'skillconnect'");
    } catch (err) {
        useFallback = true;
        console.log(`💡 Note: MySQL not reachable (${err.code || err.message}).`);
        console.log("   Using built-in local database fallback (Demo data ready).");
        console.log("   To use MySQL, start MySQL and run 'npm run init-db'.");
    }
})();

const pool = {
    execute: async (query, params) => {
        if (useFallback) {
            return fallbackDb.execute(query, params);
        }
        try {
            return await mysqlPool.execute(query, params);
        } catch (err) {
            if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
                useFallback = true;
                return fallbackDb.execute(query, params);
            }
            throw err;
        }
    },
    getConnection: async () => {
        if (useFallback) {
            return fallbackDb.getConnection();
        }
        try {
            return await mysqlPool.getConnection();
        } catch (err) {
            if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
                useFallback = true;
                return fallbackDb.getConnection();
            }
            throw err;
        }
    }
};

// Enable CORS
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// Create uploads directories
const createUploadsDir = () => {
    const dirs = [
        'uploads',
        'uploads/doubt-images',
        'uploads/profile-photos',
        'uploads/mentor-resources',
        'uploads/chat-images',
        'uploads/study-materials'
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};
createUploadsDir();

// Multer configurations
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads/doubt-images/';
        if (req.baseUrl.includes('messages')) {
            folder = 'uploads/chat-images/';
        } else if (req.baseUrl.includes('resources')) {
            folder = 'uploads/study-materials/';
        } else if (req.baseUrl.includes('profile')) {
            folder = 'uploads/profile-photos/';
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
        cb(null, Date.now() + '-' + originalName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// ==================== ENHANCED API ROUTES ====================

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [doubts] = await pool.execute('SELECT COUNT(*) as count FROM doubts');
        const [mentors] = await pool.execute('SELECT COUNT(*) as count FROM mentor_profiles');
        
        res.json({ 
            status: 'OK', 
            message: 'SkillConnect Backend is running',
            timestamp: new Date().toISOString(),
            users: users[0].count,
            doubts: doubts[0].count,
            mentors: mentors[0].count
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    let connection;
    try {
        const { fullName, email, password, college, branch, year, isAnonymous, userType, skills } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        connection = await pool.getConnection();
        
        // Check if user exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = require('crypto').randomUUID();

        // Insert user
        await connection.execute(
            'INSERT INTO users (id, email, password, full_name, user_type, college, branch, year, is_anonymous, skills, xp_points, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, email, hashedPassword, fullName, userType || 'student', college, branch, year, isAnonymous || false, JSON.stringify(skills || []), 0, 1]
        );

        // If user is mentor, create mentor profile
        if (userType === 'mentor') {
            const mentorId = require('crypto').randomUUID();
            await connection.execute(
                `INSERT INTO mentor_profiles (id, user_id, experience, expertise, verified, joined_date, rating, total_sessions, students_helped) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [mentorId, userId, '', JSON.stringify(skills || []), email.includes('.edu') || email.includes('.ac.'), new Date().toISOString().split('T')[0], 0, 0, 0]
            );
        }

        const token = jwt.sign(
            { userId, email, userType: userType || 'student' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: userId,
                fullName,
                email,
                college,
                branch,
                year,
                isAnonymous: isAnonymous || false,
                userType: userType || 'student',
                skills: skills || [],
                xpPoints: 0,
                level: 1
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        let user = users[0];

        // For demo purposes - create user if not found
        if (!user) {
            const userId = require('crypto').randomUUID();
            const hashedPassword = await bcrypt.hash(password, 10);
            
            await pool.execute(
                'INSERT INTO users (id, email, password, full_name, user_type, college, branch, year, skills, xp_points, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, email, hashedPassword, email.split('@')[0], userType || 'student', 'Demo College', 'Computer Science', '2nd Year', JSON.stringify(['Mathematics', 'Programming']), 100, 1]
            );

            user = {
                id: userId,
                email: email,
                full_name: email.split('@')[0],
                user_type: userType || 'student',
                college: 'Demo College',
                branch: 'Computer Science',
                year: '2nd Year',
                skills: JSON.stringify(['Mathematics', 'Programming']),
                xp_points: 100,
                level: 1
            };

            // Create mentor profile if logging in as mentor
            if (userType === 'mentor') {
                const mentorId = require('crypto').randomUUID();
                await pool.execute(
                    `INSERT INTO mentor_profiles (id, user_id, experience, expertise, rating, total_sessions, students_helped, verified, joined_date) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [mentorId, userId, '3 years', JSON.stringify(['Mathematics', 'Physics', 'Programming']), 4.5, 12, 8, true, new Date().toISOString().split('T')[0]]
                );
            }
        } else {
            // Verify password for existing users
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                userType: user.user_type 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                userType: user.user_type,
                college: user.college,
                branch: user.branch,
                year: user.year,
                skills: JSON.parse(user.skills || '[]'),
                xpPoints: user.xp_points || 0,
                level: user.level || 1
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, email, full_name, user_type, college, branch, year, skills, xp_points, level, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        user.skills = JSON.parse(user.skills || '[]');

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update User Profile
app.put('/api/profile', authenticateToken, upload.single('profilePhoto'), async (req, res) => {
    try {
        const { fullName, college, branch, year, skills } = req.body;
        
        let updateFields = [];
        let updateValues = [];

        if (fullName) {
            updateFields.push('full_name = ?');
            updateValues.push(fullName);
        }
        if (college) {
            updateFields.push('college = ?');
            updateValues.push(college);
        }
        if (branch) {
            updateFields.push('branch = ?');
            updateValues.push(branch);
        }
        if (year) {
            updateFields.push('year = ?');
            updateValues.push(year);
        }
        if (skills) {
            updateFields.push('skills = ?');
            updateValues.push(JSON.stringify(Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim())));
        }
        if (req.file) {
            updateFields.push('profile_photo = ?');
            updateValues.push(`/uploads/profile-photos/${req.file.filename}`);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(req.user.userId);

        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated profile
        const [users] = await pool.execute(
            'SELECT id, email, full_name, user_type, college, branch, year, skills, xp_points, level, profile_photo FROM users WHERE id = ?',
            [req.user.userId]
        );

        const user = users[0];
        user.skills = JSON.parse(user.skills || '[]');

        res.json({ 
            message: 'Profile updated successfully', 
            user 
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== GAMIFICATION ROUTES ====================

// Get user achievements
app.get('/api/achievements', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT xp_points, level FROM users WHERE id = ?',
            [req.user.userId]
        );

        const user = users[0];
        const achievements = calculateAchievements(user.xp_points, user.level);

        res.json(achievements);
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function calculateAchievements(xpPoints, level) {
    const achievements = [];
    
    if (xpPoints >= 100) achievements.push({ name: 'Curious Cat', icon: '🐱', description: 'Asked first question' });
    if (xpPoints >= 500) achievements.push({ name: 'Active Learner', icon: '📚', description: 'Reached 500 XP' });
    if (level >= 5) achievements.push({ name: 'Doubt Master', icon: '🎯', description: 'Level 5 reached' });
    if (xpPoints >= 1000) achievements.push({ name: 'Knowledge Seeker', icon: '🔍', description: '1000 XP milestone' });
    
    return achievements;
}

// Add XP points to user
app.post('/api/xp/add', authenticateToken, async (req, res) => {
    try {
        const { points, reason } = req.body;
        
        await pool.execute(
            'UPDATE users SET xp_points = xp_points + ?, level = FLOOR((xp_points + ?) / 100) + 1 WHERE id = ?',
            [points, points, req.user.userId]
        );

        // Create notification for XP gain
        const notificationId = require('crypto').randomUUID();
        await pool.execute(
            'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
            [notificationId, req.user.userId, 'xp_gained', 'XP Gained!', `You earned ${points} XP for ${reason}`]
        );

        res.json({ message: 'XP added successfully', points });
    } catch (error) {
        console.error('Add XP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== STUDY RESOURCES ROUTES ====================

// Upload study resource
app.post('/api/resources', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { title, description, subject, category, accessLevel } = req.body;
        
        if (!title || !subject || !req.file) {
            return res.status(400).json({ error: 'Title, subject and file are required' });
        }

        const resourceId = require('crypto').randomUUID();
        
        await pool.execute(
            `INSERT INTO study_resources (id, user_id, title, description, subject, category, file_path, access_level) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [resourceId, req.user.userId, title, description, subject, category, `/uploads/study-materials/${req.file.filename}`, accessLevel || 'public']
        );

        // Add XP for sharing resource
        await pool.execute(
            'UPDATE users SET xp_points = xp_points + 50 WHERE id = ?',
            [req.user.userId]
        );

        res.status(201).json({ 
            message: 'Resource uploaded successfully',
            resourceId 
        });
    } catch (error) {
        console.error('Upload resource error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get study resources
app.get('/api/resources', authenticateToken, async (req, res) => {
    try {
        const { subject, category } = req.query;
        
        let query = `
            SELECT sr.*, u.full_name as uploader_name 
            FROM study_resources sr 
            JOIN users u ON sr.user_id = u.id 
            WHERE sr.access_level = 'public'
        `;
        const params = [];

        if (subject && subject !== 'all') {
            query += ' AND sr.subject = ?';
            params.push(subject);
        }

        if (category && category !== 'all') {
            query += ' AND sr.category = ?';
            params.push(category);
        }

        query += ' ORDER BY sr.created_at DESC';

        const [resources] = await pool.execute(query, params);

        res.json(resources);
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ENHANCED MENTOR ROUTES ====================

// Get mentor profile with enhanced data
app.get('/api/mentor/profile', authenticateToken, async (req, res) => {
    try {
        const [mentors] = await pool.execute(
            `SELECT mp.*, u.email, u.full_name, u.college, u.branch, u.skills, u.xp_points, u.level
             FROM mentor_profiles mp 
             JOIN users u ON mp.user_id = u.id 
             WHERE mp.user_id = ?`,
            [req.user.userId]
        );

        if (mentors.length === 0) {
            return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const mentor = mentors[0];
        mentor.expertise = JSON.parse(mentor.expertise || '[]');
        mentor.badges = JSON.parse(mentor.badges || '[]');
        mentor.availability = JSON.parse(mentor.availability || '[]');
        mentor.skills = JSON.parse(mentor.skills || '[]');

        res.json(mentor);
    } catch (error) {
        console.error('Get mentor profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update mentor profile with enhanced fields
app.put('/api/mentor/profile', authenticateToken, async (req, res) => {
    try {
        const { expertise, bio, availability, experience, hourlyRate, maxStudents } = req.body;

        await pool.execute(
            `UPDATE mentor_profiles 
             SET expertise = ?, bio = ?, availability = ?, experience = ?, hourly_rate = ?, max_students = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ?`,
            [JSON.stringify(expertise || []), bio, JSON.stringify(availability || []), experience, hourlyRate, maxStudents, req.user.userId]
        );

        // Get updated profile
        const [mentors] = await pool.execute(
            `SELECT mp.*, u.email, u.full_name, u.college, u.branch, u.skills
             FROM mentor_profiles mp 
             JOIN users u ON mp.user_id = u.id 
             WHERE mp.user_id = ?`,
            [req.user.userId]
        );

        const mentor = mentors[0];
        mentor.expertise = JSON.parse(mentor.expertise || '[]');
        mentor.badges = JSON.parse(mentor.badges || '[]');
        mentor.availability = JSON.parse(mentor.availability || '[]');
        mentor.skills = JSON.parse(mentor.skills || '[]');

        res.json({ 
            message: 'Profile updated successfully', 
            profile: mentor 
        });
    } catch (error) {
        console.error('Update mentor profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all doubts (for mentors to browse)
app.get('/api/mentor/doubts', authenticateToken, async (req, res) => {
    try {
        const { status, subject } = req.query;
        
        let query = `
            SELECT d.*, u.full_name as student_name 
            FROM doubts d 
            JOIN users u ON d.user_id = u.id 
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND d.status = ?';
            params.push(status);
        }

        if (subject && subject !== 'all') {
            query += ' AND d.subject = ?';
            params.push(subject);
        }

        query += ' ORDER BY d.created_at DESC';

        const [doubts] = await pool.execute(query, params);

        res.json(doubts);
    } catch (error) {
        console.error('Get mentor doubts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get mentor's assigned doubts
app.get('/api/mentor/my-doubts', authenticateToken, async (req, res) => {
    try {
        const [mentors] = await pool.execute(
            'SELECT id FROM mentor_profiles WHERE user_id = ?',
            [req.user.userId]
        );

        if (mentors.length === 0) {
            return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const mentorId = mentors[0].id;

        const [doubts] = await pool.execute(
            `SELECT d.*, u.full_name as student_name 
             FROM doubts d 
             JOIN users u ON d.user_id = u.id 
             WHERE d.assigned_mentor_id = ? AND d.status != 'resolved' 
             ORDER BY d.created_at DESC`,
            [mentorId]
        );

        res.json(doubts);
    } catch (error) {
        console.error('Get mentor assigned doubts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept a doubt
app.post('/api/mentor/doubts/:doubtId/accept', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { doubtId } = req.params;
        
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [mentors] = await connection.execute(
            'SELECT id FROM mentor_profiles WHERE user_id = ?',
            [req.user.userId]
        );

        if (mentors.length === 0) {
            return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const mentorId = mentors[0].id;

        // Check if doubt exists and is available
        const [doubts] = await connection.execute(
            'SELECT * FROM doubts WHERE id = ? AND status = "pending"',
            [doubtId]
        );

        if (doubts.length === 0) {
            return res.status(404).json({ error: 'Doubt not found or no longer available' });
        }

        // Assign doubt to mentor
        await connection.execute(
            'UPDATE doubts SET status = "assigned", assigned_mentor_id = ? WHERE id = ?',
            [mentorId, doubtId]
        );

        // Create notification
        const notificationId = require('crypto').randomUUID();
        await connection.execute(
            'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
            [notificationId, doubts[0].user_id, 'doubt_assigned', 'Mentor Assigned', `A mentor has accepted your doubt about ${doubts[0].title}`]
        );

        await connection.commit();

        res.json({ 
            message: 'Doubt accepted successfully'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Accept doubt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
});

// Get mentor's sessions
app.get('/api/mentor/sessions', authenticateToken, async (req, res) => {
    try {
        const [mentors] = await pool.execute(
            'SELECT id FROM mentor_profiles WHERE user_id = ?',
            [req.user.userId]
        );

        if (mentors.length === 0) {
            return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const mentorId = mentors[0].id;

        const [sessions] = await pool.execute(
            `SELECT s.*, u.full_name as student_name, d.title as doubt_title, u.college as student_college
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             LEFT JOIN doubts d ON s.doubt_id = d.id 
             WHERE s.mentor_id = ? 
             ORDER BY s.scheduled_time ASC`,
            [mentorId]
        );

        res.json(sessions);
    } catch (error) {
        console.error('Get mentor sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get mentor analytics
app.get('/api/mentor/analytics', authenticateToken, async (req, res) => {
    try {
        const [mentors] = await pool.execute(
            'SELECT id FROM mentor_profiles WHERE user_id = ?',
            [req.user.userId]
        );

        if (mentors.length === 0) {
            return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const mentorId = mentors[0].id;

        // Get assigned doubts
        const [assignedDoubts] = await pool.execute(
            'SELECT * FROM doubts WHERE assigned_mentor_id = ?',
            [mentorId]
        );

        const resolvedDoubts = assignedDoubts.filter(d => d.status === 'resolved');
        const pendingDoubts = assignedDoubts.filter(d => d.status === 'assigned');

        // Subject distribution
        const subjectDistribution = {};
        assignedDoubts.forEach(doubt => {
            subjectDistribution[doubt.subject] = (subjectDistribution[doubt.subject] || 0) + 1;
        });

        // Weekly activity
        const [weeklyActivityResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM doubts WHERE assigned_mentor_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
            [mentorId]
        );

        const weeklyActivity = weeklyActivityResult[0].count;

        // Get mentor profile for additional stats
        const [mentorProfile] = await pool.execute(
            'SELECT rating, total_sessions, students_helped FROM mentor_profiles WHERE id = ?',
            [mentorId]
        );

        const analytics = {
            totalDoubts: assignedDoubts.length,
            resolvedDoubts: resolvedDoubts.length,
            pendingDoubts: pendingDoubts.length,
            resolutionRate: assignedDoubts.length > 0 ? (resolvedDoubts.length / assignedDoubts.length) * 100 : 0,
            weeklyActivity,
            averageResponseTime: '2.3 hours', // Simplified for demo
            subjectDistribution,
            studentSatisfaction: mentorProfile[0].rating,
            totalSessions: mentorProfile[0].total_sessions,
            studentsHelped: mentorProfile[0].students_helped
        };

        res.json(analytics);
    } catch (error) {
        console.error('Get mentor analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get mentor leaderboard
app.get('/api/mentor/leaderboard', authenticateToken, async (req, res) => {
    try {
        const [leaderboard] = await pool.execute(
            `SELECT mp.rating, mp.total_sessions, mp.students_helped, mp.expertise, mp.badges,
                    u.full_name as name, u.college
             FROM mentor_profiles mp 
             JOIN users u ON mp.user_id = u.id 
             WHERE mp.verified = TRUE 
             ORDER BY mp.rating DESC, mp.total_sessions DESC 
             LIMIT 10`
        );

        // Parse JSON fields
        const formattedLeaderboard = leaderboard.map(mentor => ({
            ...mentor,
            expertise: JSON.parse(mentor.expertise || '[]'),
            badges: JSON.parse(mentor.badges || '[]')
        }));

        res.json(formattedLeaderboard);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== STUDENT ROUTES ====================

// Post Doubt with XP reward
app.post('/api/doubts', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, subject, category, isAnonymous, urgency } = req.body;
        const userId = req.user.userId;

        if (!title || !description || !subject) {
            return res.status(400).json({ error: 'Title, description, and subject are required' });
        }

        const doubtId = require('crypto').randomUUID();
        
        await pool.execute(
            `INSERT INTO doubts (id, user_id, title, description, subject, category, image_path, is_anonymous, urgency) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [doubtId, userId, title, description, subject, category, req.file ? `/uploads/doubt-images/${req.file.filename}` : null, isAnonymous === 'true', urgency || 'medium']
        );

        // Add XP for posting doubt
        await pool.execute(
            'UPDATE users SET xp_points = xp_points + 25 WHERE id = ?',
            [userId]
        );

        // Get the created doubt
        const [doubts] = await pool.execute('SELECT * FROM doubts WHERE id = ?', [doubtId]);

        res.status(201).json({ message: 'Doubt posted successfully', doubt: doubts[0] });

    } catch (error) {
        console.error('Doubt posting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User's Doubts
app.get('/api/doubts', authenticateToken, async (req, res) => {
    try {
        const [userDoubts] = await pool.execute(
            'SELECT * FROM doubts WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.userId]
        );
        res.json(userDoubts);
    } catch (error) {
        console.error('Get doubts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Available Mentors
app.get('/api/mentors', authenticateToken, async (req, res) => {
    try {
        const [mentors] = await pool.execute(
            `SELECT mp.*, u.full_name as name, u.email, u.college, u.branch as department
             FROM mentor_profiles mp 
             JOIN users u ON mp.user_id = u.id 
             WHERE mp.verified = TRUE`
        );

        // Parse JSON fields and add availability flag
        const formattedMentors = mentors.map(mentor => ({
            ...mentor,
            expertise: JSON.parse(mentor.expertise || '[]'),
            badges: JSON.parse(mentor.badges || '[]'),
            availability: JSON.parse(mentor.availability || '[]'),
            available: true // Simplified for demo
        }));

        res.json(formattedMentors);
    } catch (error) {
        console.error('Get mentors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Schedule Session with XP reward
app.post('/api/sessions', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { doubtId, mentorId, sessionType, scheduledTime, notes } = req.body;
        const userId = req.user.userId;

        if (!mentorId || !scheduledTime) {
            return res.status(400).json({ error: 'Mentor ID and scheduled time are required' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const sessionId = require('crypto').randomUUID();
        
        await connection.execute(
            `INSERT INTO sessions (id, user_id, mentor_id, doubt_id, session_type, scheduled_time, notes, meeting_link) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, userId, mentorId, doubtId, sessionType || '1:1', scheduledTime, notes || '', `https://meet.skillconnect.com/session-${sessionId}`]
        );

        // If doubtId is provided and not 'new', update doubt status
        if (doubtId && doubtId !== 'new') {
            await connection.execute(
                'UPDATE doubts SET status = "assigned", assigned_mentor_id = ? WHERE id = ?',
                [mentorId, doubtId]
            );
        }

        // Add XP for scheduling session
        await connection.execute(
            'UPDATE users SET xp_points = xp_points + 30 WHERE id = ?',
            [userId]
        );

        await connection.commit();

        // Get the created session
        const [sessions] = await connection.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);

        res.status(201).json({ message: 'Session scheduled successfully', session: sessions[0] });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Session scheduling error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
});

// Get User Sessions
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const [userSessions] = await pool.execute(
            'SELECT * FROM sessions WHERE user_id = ? ORDER BY scheduled_time ASC',
            [req.user.userId]
        );
        res.json(userSessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Student Progress
app.get('/api/progress', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [userDoubts] = await pool.execute(
            'SELECT status FROM doubts WHERE user_id = ?',
            [userId]
        );
        
        const totalDoubts = userDoubts.length;
        const resolvedDoubts = userDoubts.filter(d => d.status === 'resolved').length;
        const pendingDoubts = userDoubts.filter(d => d.status === 'pending').length;

        const progress = {
            totalDoubts,
            resolvedDoubts,
            pendingDoubts,
            resolutionRate: totalDoubts > 0 ? (resolvedDoubts / totalDoubts) * 100 : 0
        };

        res.json(progress);
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reopen doubt
app.post('/api/doubts/:doubtId/reopen', authenticateToken, async (req, res) => {
    try {
        const { doubtId } = req.params;

        await pool.execute(
            'UPDATE doubts SET status = "reopened", resolved_at = NULL WHERE id = ? AND user_id = ?',
            [doubtId, req.user.userId]
        );

        res.json({ message: 'Doubt reopened successfully' });
    } catch (error) {
        console.error('Reopen doubt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== DOUBT RESOLUTION ROUTES ====================

// Get doubt details
app.get('/api/doubts/:doubtId', authenticateToken, async (req, res) => {
    try {
        const { doubtId } = req.params;

        const [doubts] = await pool.execute(
            `SELECT d.*, u.full_name as student_name, u.email as student_email,
                    mp.id as mentor_id, mentu.full_name as mentor_name, mentu.id as mentor_user_id
             FROM doubts d 
             JOIN users u ON d.user_id = u.id 
             LEFT JOIN mentor_profiles mp ON d.assigned_mentor_id = mp.id
             LEFT JOIN users mentu ON mp.user_id = mentu.id
             WHERE d.id = ?`,
            [doubtId]
        );

        if (doubts.length === 0) {
            return res.status(404).json({ error: 'Doubt not found' });
        }

        res.json(doubts[0]);
    } catch (error) {
        console.error('Get doubt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit solution for a doubt
app.post('/api/doubts/:doubtId/solve', authenticateToken, upload.single('solutionImage'), async (req, res) => {
    let connection;
    try {
        const { doubtId } = req.params;
        const { solution } = req.body;
        const mentorId = req.user.userId;

        if (!solution) {
            return res.status(400).json({ error: 'Solution is required' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Verify the mentor is assigned to this doubt
        const [doubts] = await connection.execute(
            `SELECT d.*, mp.id as mentor_profile_id 
             FROM doubts d 
             JOIN mentor_profiles mp ON mp.user_id = ?
             WHERE d.id = ? AND d.assigned_mentor_id = mp.id`,
            [mentorId, doubtId]
        );

        if (doubts.length === 0) {
            return res.status(403).json({ error: 'You are not assigned to this doubt' });
        }

        // Update doubt with solution
        await connection.execute(
            `UPDATE doubts 
             SET status = 'resolved', solution = ?, solution_image = ?, resolved_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [solution, req.file ? `/uploads/doubt-images/${req.file.filename}` : null, doubtId]
        );

        // Update mentor stats
        await connection.execute(
            `UPDATE mentor_profiles 
             SET total_sessions = total_sessions + 1, students_helped = students_helped + 1 
             WHERE id = ?`,
            [doubts[0].assigned_mentor_id]
        );

        // Create notification for student
        const notificationId = require('crypto').randomUUID();
        await connection.execute(
            'INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)',
            [notificationId, doubts[0].user_id, 'doubt_resolved', 'Doubt Solved!', `Your doubt "${doubts[0].title}" has been solved by the mentor`, doubtId]
        );

        await connection.commit();

        res.json({ 
            message: 'Doubt solved successfully!',
            doubt: {
                id: doubtId,
                status: 'resolved',
                solution: solution,
                solution_image: req.file ? `/uploads/doubt-images/${req.file.filename}` : null,
                resolved_at: new Date()
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Solve doubt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
});

// ==================== CHAT MESSAGES ROUTES ====================

// Send message with XP reward
app.post('/api/messages', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { doubtId, receiverId, message } = req.body;
        const senderId = req.user.userId;

        if (!doubtId || !receiverId || !message) {
            return res.status(400).json({ error: 'Doubt ID, receiver ID and message are required' });
        }

        const messageId = require('crypto').randomUUID();
        
        await pool.execute(
            `INSERT INTO messages (id, doubt_id, sender_id, receiver_id, message, image_path) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [messageId, doubtId, senderId, receiverId, message, req.file ? `/uploads/chat-images/${req.file.filename}` : null]
        );

        // Add XP for active communication
        await pool.execute(
            'UPDATE users SET xp_points = xp_points + 5 WHERE id = ?',
            [senderId]
        );

        // Create notification for receiver
        const notificationId = require('crypto').randomUUID();
        const [sender] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [senderId]);
        const senderName = sender[0]?.full_name || 'Someone';

        await pool.execute(
            'INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)',
            [notificationId, receiverId, 'new_message', 'New Message', `${senderName} sent you a message`, doubtId]
        );

        res.status(201).json({ 
            message: 'Message sent successfully',
            messageId: messageId
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get messages for a doubt
app.get('/api/doubts/:doubtId/messages', authenticateToken, async (req, res) => {
    try {
        const { doubtId } = req.params;
        const userId = req.user.userId;

        const [messages] = await pool.execute(
            `SELECT m.*, u.full_name as sender_name, 
                    CASE WHEN m.sender_id = ? THEN 'sent' ELSE 'received' END as message_type
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             WHERE m.doubt_id = ? 
             ORDER BY m.created_at ASC`,
            [userId, doubtId]
        );

        // Mark messages as read
        await pool.execute(
            'UPDATE messages SET is_read = TRUE WHERE doubt_id = ? AND receiver_id = ? AND is_read = FALSE',
            [doubtId, userId]
        );

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get chat participants for a doubt
app.get('/api/doubts/:doubtId/participants', authenticateToken, async (req, res) => {
    try {
        const { doubtId } = req.params;

        const [participants] = await pool.execute(
            `SELECT DISTINCT u.id, u.full_name, u.user_type
             FROM messages m
             JOIN users u ON m.sender_id = u.id OR m.receiver_id = u.id
             WHERE m.doubt_id = ?
             UNION
             SELECT u.id, u.full_name, u.user_type
             FROM doubts d
             JOIN users u ON d.user_id = u.id
             WHERE d.id = ?
             UNION
             SELECT u.id, u.full_name, u.user_type
             FROM doubts d
             JOIN mentor_profiles mp ON d.assigned_mentor_id = mp.id
             JOIN users u ON mp.user_id = u.id
             WHERE d.id = ?`,
            [doubtId, doubtId, doubtId]
        );

        res.json(participants);
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's chat conversations
app.get('/api/chats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [chats] = await pool.execute(
            `SELECT DISTINCT d.id as doubt_id, d.title, 
                    CASE 
                        WHEN u1.id = ? THEN u2.full_name
                        ELSE u1.full_name
                    END as participant_name,
                    CASE 
                        WHEN u1.id = ? THEN u2.id
                        ELSE u1.id
                    END as participant_id,
                    (SELECT message FROM messages WHERE doubt_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM messages WHERE doubt_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message_time
             FROM doubts d
             JOIN users u1 ON d.user_id = u1.id
             LEFT JOIN mentor_profiles mp ON d.assigned_mentor_id = mp.id
             LEFT JOIN users u2 ON mp.user_id = u2.id
             WHERE d.user_id = ? OR mp.user_id = ?
             ORDER BY last_message_time DESC`,
            [userId, userId, userId, userId]
        );

        res.json(chats);
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== NOTIFICATIONS ROUTES ====================

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.userId]
        );

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;

        await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, req.user.userId]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ADMIN ROUTES ====================

// Get platform analytics
app.get('/api/admin/analytics', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin (simplified check)
        const [users] = await pool.execute('SELECT user_type FROM users WHERE id = ?', [req.user.userId]);
        if (users[0].user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const [userStats] = await pool.execute('SELECT COUNT(*) as total_users, SUM(CASE WHEN user_type = "mentor" THEN 1 ELSE 0 END) as total_mentors FROM users');
        const [doubtStats] = await pool.execute('SELECT COUNT(*) as total_doubts, SUM(CASE WHEN status = "resolved" THEN 1 ELSE 0 END) as resolved_doubts FROM doubts');
        const [sessionStats] = await pool.execute('SELECT COUNT(*) as total_sessions FROM sessions');
        const [resourceStats] = await pool.execute('SELECT COUNT(*) as total_resources FROM study_resources');

        const analytics = {
            users: userStats[0],
            doubts: doubtStats[0],
            sessions: sessionStats[0],
            resources: resourceStats[0],
            timestamp: new Date().toISOString()
        };

        res.json(analytics);
    } catch (error) {
        console.error('Get admin analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SkillConnect Server running on http://localhost:${PORT}`);
    console.log(`🌐 Website Landing Page: http://localhost:${PORT}/`);
    console.log(`🔐 Login Page: http://localhost:${PORT}/login.html`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
    console.log(`💡 Live Server also supported: http://127.0.0.1:5500`);
});