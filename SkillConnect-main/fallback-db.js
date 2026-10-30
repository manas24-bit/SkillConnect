const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'uploads', 'local-database.json');

// Initial seed data
const defaultHashedPassword = bcrypt.hashSync('password123', 10);

const initialData = {
    users: [
        {
            id: 'student-demo-id',
            email: 'student@skillconnect.com',
            password: defaultHashedPassword,
            full_name: 'Alex Johnson',
            user_type: 'student',
            college: 'Tech Institute of Science',
            branch: 'Computer Science',
            year: '3rd Year',
            is_anonymous: false,
            skills: JSON.stringify(['JavaScript', 'Python', 'Data Structures']),
            xp_points: 350,
            level: 4,
            profile_photo: null,
            created_at: new Date().toISOString()
        },
        {
            id: 'mentor-demo-id',
            email: 'mentor@skillconnect.com',
            password: defaultHashedPassword,
            full_name: 'Dr. Sarah Mitchell',
            user_type: 'mentor',
            college: 'State University',
            branch: 'Software Engineering',
            year: 'Faculty',
            is_anonymous: false,
            skills: JSON.stringify(['System Design', 'Node.js', 'Machine Learning', 'Databases']),
            xp_points: 1200,
            level: 12,
            profile_photo: null,
            created_at: new Date().toISOString()
        }
    ],
    mentor_profiles: [
        {
            id: 'mentor-profile-demo-id',
            user_id: 'mentor-demo-id',
            experience: '5+ years',
            expertise: JSON.stringify(['System Design', 'Node.js', 'Machine Learning', 'Databases']),
            badges: JSON.stringify(['Top Mentor', 'Quick Responder', 'Verified Educator']),
            availability: JSON.stringify(['Mon-Wed: 4pm - 7pm', 'Sat: 10am - 2pm']),
            bio: 'Senior Software Architect passionate about helping students master computer science fundamentals and career prep.',
            hourly_rate: 0,
            max_students: 25,
            verified: 1,
            joined_date: '2024-01-10',
            rating: 4.9,
            total_sessions: 42,
            students_helped: 88,
            updated_at: new Date().toISOString()
        }
    ],
    doubts: [
        {
            id: 'doubt-demo-1',
            user_id: 'student-demo-id',
            title: 'How to implement Dijkstra Algorithm in JavaScript?',
            description: 'I understand the theory behind shortest paths, but I am struggling with implementing a priority queue efficiently in JS without external libraries.',
            subject: 'Data Structures',
            category: 'Algorithms',
            image_path: null,
            is_anonymous: false,
            urgency: 'medium',
            status: 'assigned',
            assigned_mentor_id: 'mentor-profile-demo-id',
            solution: null,
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
            resolved_at: null
        },
        {
            id: 'doubt-demo-2',
            user_id: 'student-demo-id',
            title: 'Understanding SQL Indexing and B-Trees',
            description: 'Can someone explain when composite indexes are used vs single column indexes with examples?',
            subject: 'Database Systems',
            category: 'Databases',
            image_path: null,
            is_anonymous: false,
            urgency: 'high',
            status: 'resolved',
            assigned_mentor_id: 'mentor-profile-demo-id',
            solution: 'Composite indexes follow the Leftmost Prefix Rule. For an index on (A, B, C), queries filtering by A, or A and B, or A, B and C will utilize the index. Filtering by only B or C alone will not use the composite index tree.',
            created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
            resolved_at: new Date(Date.now() - 3600000 * 12).toISOString()
        }
    ],
    sessions: [
        {
            id: 'session-demo-1',
            user_id: 'student-demo-id',
            mentor_id: 'mentor-profile-demo-id',
            doubt_id: 'doubt-demo-1',
            session_type: '1-on-1 Mentorship',
            scheduled_time: new Date(Date.now() + 3600000 * 24).toISOString().replace('T', ' ').substring(0, 19),
            duration: 60,
            notes: 'Discussion on Graph algorithms and mock technical interview questions.',
            meeting_link: 'https://meet.google.com/demo-skillconnect',
            status: 'scheduled',
            created_at: new Date().toISOString()
        }
    ],
    study_resources: [
        {
            id: 'resource-demo-1',
            user_id: 'mentor-demo-id',
            title: 'DSA Comprehensive Cheat Sheet',
            description: 'Time and space complexity cheat sheet covering Trees, Graphs, Sorting, and Dynamic Programming.',
            subject: 'Data Structures',
            category: 'Study Guide',
            file_path: '/uploads/study-materials/dsa-guide.pdf',
            access_level: 'public',
            downloads_count: 145,
            created_at: new Date(Date.now() - 3600000 * 72).toISOString()
        },
        {
            id: 'resource-demo-2',
            user_id: 'mentor-demo-id',
            title: 'Full Stack Web Architecture Best Practices',
            description: 'REST API design, JWT security, CORS configuration, and database indexing.',
            subject: 'Web Development',
            category: 'Architecture',
            file_path: '/uploads/study-materials/web-arch.pdf',
            access_level: 'public',
            downloads_count: 98,
            created_at: new Date(Date.now() - 3600000 * 96).toISOString()
        }
    ],
    messages: [
        {
            id: 'msg-demo-1',
            doubt_id: 'doubt-demo-1',
            sender_id: 'student-demo-id',
            receiver_id: 'mentor-demo-id',
            message: 'Hello Dr. Sarah! Looking forward to our session on Dijkstra algorithm.',
            image_path: null,
            is_read: true,
            created_at: new Date(Date.now() - 3600000 * 20).toISOString()
        },
        {
            id: 'msg-demo-2',
            doubt_id: 'doubt-demo-1',
            sender_id: 'mentor-demo-id',
            receiver_id: 'student-demo-id',
            message: 'Hi Alex! Review binary min-heaps beforehand; we will build a fast priority queue from scratch.',
            image_path: null,
            is_read: true,
            created_at: new Date(Date.now() - 3600000 * 18).toISOString()
        }
    ],
    notifications: [
        {
            id: 'notif-demo-1',
            user_id: 'student-demo-id',
            type: 'session',
            title: 'Mentorship Session Confirmed',
            message: 'Your 1-on-1 session with Dr. Sarah Mitchell has been scheduled.',
            related_id: 'session-demo-1',
            is_read: false,
            created_at: new Date().toISOString()
        }
    ]
};

class FallbackDatabase {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const raw = fs.readFileSync(DB_FILE, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (err) {
            console.warn('[FallbackDB] Error reading existing local DB file, using initial data:', err.message);
        }
        this.saveData(initialData);
        return JSON.parse(JSON.stringify(initialData));
    }

    saveData(dataToSave) {
        try {
            const dir = path.dirname(DB_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[FallbackDB] Error saving data:', err.message);
        }
    }

    async execute(query, params = []) {
        const q = query.trim().replace(/\s+/g, ' ');
        const qUpper = q.toUpperCase();
        const p = Array.isArray(params) ? [...params] : [];

        // 1. Health checks & counts
        if (qUpper.includes('SELECT COUNT(*) AS COUNT FROM USERS')) {
            return [[{ count: this.data.users.length }]];
        }
        if (qUpper.includes('SELECT COUNT(*) AS COUNT FROM DOUBTS')) {
            return [[{ count: this.data.doubts.length }]];
        }
        if (qUpper.includes('SELECT COUNT(*) AS COUNT FROM MENTOR_PROFILES')) {
            return [[{ count: this.data.mentor_profiles.length }]];
        }

        // 2. Admin analytics
        if (qUpper.includes('SELECT COUNT(*) AS TOTAL_USERS, SUM(CASE WHEN USER_TYPE = "MENTOR"')) {
            const mentors = this.data.users.filter(u => u.user_type === 'mentor').length;
            return [[{ total_users: this.data.users.length, total_mentors: mentors }]];
        }
        if (qUpper.includes('SELECT COUNT(*) AS TOTAL_DOUBTS, SUM(CASE WHEN STATUS = "RESOLVED"')) {
            const resolved = this.data.doubts.filter(d => d.status === 'resolved').length;
            return [[{ total_doubts: this.data.doubts.length, resolved_doubts: resolved }]];
        }
        if (qUpper.includes('SELECT COUNT(*) AS TOTAL_SESSIONS FROM SESSIONS')) {
            return [[{ total_sessions: this.data.sessions.length }]];
        }
        if (qUpper.includes('SELECT COUNT(*) AS TOTAL_RESOURCES FROM STUDY_RESOURCES')) {
            return [[{ total_resources: this.data.study_resources.length }]];
        }

        // 3. User queries
        if (qUpper.startsWith('SELECT ID FROM USERS WHERE EMAIL = ?')) {
            const user = this.data.users.find(u => u.email.toLowerCase() === (p[0] || '').toLowerCase());
            return [user ? [{ id: user.id }] : []];
        }

        if (qUpper.startsWith('SELECT * FROM USERS WHERE EMAIL = ?')) {
            const user = this.data.users.find(u => u.email.toLowerCase() === (p[0] || '').toLowerCase());
            return [user ? [user] : []];
        }

        if (qUpper.includes('FROM USERS WHERE ID = ?')) {
            const user = this.data.users.find(u => u.id === p[0]);
            return [user ? [user] : []];
        }

        // INSERT INTO users
        if (qUpper.startsWith('INSERT INTO USERS')) {
            // (id, email, password, full_name, user_type, college, branch, year, is_anonymous, skills, xp_points, level)
            const newUser = {
                id: p[0],
                email: p[1],
                password: p[2],
                full_name: p[3],
                user_type: p[4] || 'student',
                college: p[5] || '',
                branch: p[6] || '',
                year: p[7] || '',
                is_anonymous: !!p[8],
                skills: typeof p[9] === 'string' ? p[9] : JSON.stringify(p[9] || []),
                xp_points: p[10] || 0,
                level: p[11] || 1,
                profile_photo: null,
                created_at: new Date().toISOString()
            };
            this.data.users.push(newUser);
            this.saveData();
            return [{ affectedRows: 1, insertId: newUser.id }];
        }

        // UPDATE users xp_points & level
        if (qUpper.startsWith('UPDATE USERS SET XP_POINTS = XP_POINTS + ?')) {
            const xpAdd = Number(p[0]);
            const userId = p[2];
            const user = this.data.users.find(u => u.id === userId);
            if (user) {
                user.xp_points = (user.xp_points || 0) + xpAdd;
                user.level = Math.floor(user.xp_points / 100) + 1;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.startsWith('UPDATE USERS SET XP_POINTS = XP_POINTS + 25')) {
            const userId = p[0];
            const user = this.data.users.find(u => u.id === userId);
            if (user) {
                user.xp_points = (user.xp_points || 0) + 25;
                user.level = Math.floor(user.xp_points / 100) + 1;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.startsWith('UPDATE USERS SET XP_POINTS = XP_POINTS + 30')) {
            const userId = p[0];
            const user = this.data.users.find(u => u.id === userId);
            if (user) {
                user.xp_points = (user.xp_points || 0) + 30;
                user.level = Math.floor(user.xp_points / 100) + 1;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.startsWith('UPDATE USERS SET XP_POINTS = XP_POINTS + 50')) {
            const userId = p[0];
            const user = this.data.users.find(u => u.id === userId);
            if (user) {
                user.xp_points = (user.xp_points || 0) + 50;
                user.level = Math.floor(user.xp_points / 100) + 1;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.startsWith('UPDATE USERS SET XP_POINTS = XP_POINTS + 5')) {
            const userId = p[0];
            const user = this.data.users.find(u => u.id === userId);
            if (user) {
                user.xp_points = (user.xp_points || 0) + 5;
                user.level = Math.floor(user.xp_points / 100) + 1;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.startsWith('UPDATE USERS SET')) {
            const userId = p[p.length - 1];
            const user = this.data.users.find(u => u.id === userId);
            if (user) {
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        // 4. Mentor profile queries
        if (qUpper.startsWith('INSERT INTO MENTOR_PROFILES')) {
            const newMentor = {
                id: p[0],
                user_id: p[1],
                experience: p[2] || '',
                expertise: typeof p[3] === 'string' ? p[3] : JSON.stringify(p[3] || []),
                badges: JSON.stringify(['Verified Mentor']),
                availability: JSON.stringify(['Available on request']),
                bio: 'Passionate about mentoring and guiding developers.',
                hourly_rate: 0,
                max_students: 15,
                verified: p[4] ? 1 : 0,
                joined_date: p[5] || new Date().toISOString().split('T')[0],
                rating: p[6] !== undefined ? p[6] : 5.0,
                total_sessions: p[7] || 0,
                students_helped: p[8] || 0,
                updated_at: new Date().toISOString()
            };
            this.data.mentor_profiles.push(newMentor);
            this.saveData();
            return [{ affectedRows: 1 }];
        }

        if (qUpper.includes('SELECT ID FROM MENTOR_PROFILES WHERE USER_ID = ?')) {
            const mp = this.data.mentor_profiles.find(m => m.user_id === p[0]);
            return [mp ? [{ id: mp.id }] : []];
        }

        if (qUpper.includes('FROM MENTOR_PROFILES MP JOIN USERS U ON MP.USER_ID = U.ID WHERE MP.USER_ID = ?')) {
            const mp = this.data.mentor_profiles.find(m => m.user_id === p[0]);
            if (!mp) return [[]];
            const user = this.data.users.find(u => u.id === mp.user_id) || {};
            return [[{ ...mp, email: user.email, full_name: user.full_name, college: user.college, branch: user.branch, skills: user.skills, xp_points: user.xp_points, level: user.level }]];
        }

        if (qUpper.includes('FROM MENTOR_PROFILES MP JOIN USERS U ON MP.USER_ID = U.ID WHERE MP.VERIFIED = TRUE')) {
            const res = this.data.mentor_profiles.map(mp => {
                const user = this.data.users.find(u => u.id === mp.user_id) || {};
                return {
                    ...mp,
                    name: user.full_name,
                    email: user.email,
                    college: user.college,
                    department: user.branch
                };
            });
            return [res];
        }

        if (qUpper.includes('FROM MENTOR_PROFILES MP JOIN USERS U ON MP.USER_ID = U.ID ORDER BY MP.RATING DESC')) {
            const res = this.data.mentor_profiles.map(mp => {
                const user = this.data.users.find(u => u.id === mp.user_id) || {};
                const resolved = this.data.doubts.filter(d => d.assigned_mentor_id === mp.id && d.status === 'resolved').length;
                return {
                    ...mp,
                    full_name: user.full_name,
                    email: user.email,
                    resolved_doubts: resolved
                };
            });
            return [res];
        }

        if (qUpper.startsWith('UPDATE MENTOR_PROFILES SET EXPERTISE = ?')) {
            const userId = p[p.length - 1];
            const mp = this.data.mentor_profiles.find(m => m.user_id === userId);
            if (mp) {
                mp.expertise = p[0];
                mp.bio = p[1];
                mp.availability = p[2];
                mp.experience = p[3];
                mp.hourly_rate = p[4];
                mp.max_students = p[5];
                mp.updated_at = new Date().toISOString();
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.includes('UPDATE MENTOR_PROFILES SET TOTAL_SESSIONS = TOTAL_SESSIONS + 1')) {
            const mentorId = p[0];
            const mp = this.data.mentor_profiles.find(m => m.id === mentorId);
            if (mp) {
                mp.total_sessions = (mp.total_sessions || 0) + 1;
                mp.students_helped = (mp.students_helped || 0) + 1;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.includes('SELECT RATING, TOTAL_SESSIONS, STUDENTS_HELPED FROM MENTOR_PROFILES WHERE ID = ?')) {
            const mp = this.data.mentor_profiles.find(m => m.id === p[0]);
            return [mp ? [{ rating: mp.rating, total_sessions: mp.total_sessions, students_helped: mp.students_helped }] : []];
        }

        // 5. Doubts queries
        if (qUpper.startsWith('INSERT INTO DOUBTS')) {
            const newDoubt = {
                id: p[0],
                user_id: p[1],
                title: p[2],
                description: p[3],
                subject: p[4] || '',
                category: p[5] || '',
                image_path: p[6] || null,
                is_anonymous: !!p[7],
                urgency: p[8] || 'medium',
                status: 'pending',
                assigned_mentor_id: null,
                solution: null,
                created_at: new Date().toISOString(),
                resolved_at: null
            };
            this.data.doubts.unshift(newDoubt);
            this.saveData();
            return [{ affectedRows: 1, insertId: newDoubt.id }];
        }

        if (qUpper.includes('SELECT * FROM DOUBTS WHERE ID = ? AND STATUS = "PENDING"')) {
            const doubt = this.data.doubts.find(d => d.id === p[0] && d.status === 'pending');
            return [doubt ? [doubt] : []];
        }

        if (qUpper.includes('SELECT * FROM DOUBTS WHERE ID = ?')) {
            const doubt = this.data.doubts.find(d => d.id === p[0]);
            return [doubt ? [doubt] : []];
        }

        if (qUpper.includes('SELECT D.*, U.FULL_NAME AS STUDENT_NAME') && qUpper.includes('WHERE D.STATUS = \'PENDING\'')) {
            const pendingDoubts = this.data.doubts
                .filter(d => d.status === 'pending')
                .map(d => {
                    const student = this.data.users.find(u => u.id === d.user_id) || {};
                    return {
                        ...d,
                        student_name: d.is_anonymous ? 'Anonymous Student' : student.full_name,
                        student_college: student.college
                    };
                });
            return [pendingDoubts];
        }

        if (qUpper.includes('WHERE D.ASSIGNED_MENTOR_ID = ?')) {
            const mentorDoubts = this.data.doubts
                .filter(d => d.assigned_mentor_id === p[0])
                .map(d => {
                    const student = this.data.users.find(u => u.id === d.user_id) || {};
                    return {
                        ...d,
                        student_name: d.is_anonymous ? 'Anonymous Student' : student.full_name,
                        student_college: student.college
                    };
                });
            return [mentorDoubts];
        }

        if (qUpper.includes('WHERE D.ID = ?')) {
            const doubt = this.data.doubts.find(d => d.id === p[0]);
            if (!doubt) return [[]];
            const student = this.data.users.find(u => u.id === doubt.user_id) || {};
            return [[{
                ...doubt,
                student_name: doubt.is_anonymous ? 'Anonymous Student' : student.full_name,
                student_email: student.email
            }]];
        }

        if (qUpper.includes('SELECT * FROM DOUBTS WHERE USER_ID = ?')) {
            const userDoubts = this.data.doubts.filter(d => d.user_id === p[0]);
            return [userDoubts];
        }

        if (qUpper.includes('SELECT * FROM DOUBTS WHERE ASSIGNED_MENTOR_ID = ?')) {
            const mentorDoubts = this.data.doubts.filter(d => d.assigned_mentor_id === p[0]);
            return [mentorDoubts];
        }

        if (qUpper.includes('SELECT STATUS FROM DOUBTS WHERE USER_ID = ?')) {
            const statuses = this.data.doubts.filter(d => d.user_id === p[0]).map(d => ({ status: d.status }));
            return [statuses];
        }

        if (qUpper.includes('SELECT COUNT(*) AS COUNT FROM DOUBTS WHERE ASSIGNED_MENTOR_ID = ?')) {
            const count = this.data.doubts.filter(d => d.assigned_mentor_id === p[0]).length;
            return [[{ count }]];
        }

        if (qUpper.includes('UPDATE DOUBTS SET STATUS = "ASSIGNED"')) {
            const mentorId = p[0];
            const doubtId = p[1];
            const doubt = this.data.doubts.find(d => d.id === doubtId);
            if (doubt) {
                doubt.status = 'assigned';
                doubt.assigned_mentor_id = mentorId;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.includes('UPDATE DOUBTS SET STATUS = \'RESOLVED\'')) {
            const solution = p[0];
            const doubtId = p[1];
            const doubt = this.data.doubts.find(d => d.id === doubtId);
            if (doubt) {
                doubt.status = 'resolved';
                doubt.solution = solution;
                doubt.resolved_at = new Date().toISOString();
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        if (qUpper.includes('UPDATE DOUBTS SET STATUS = "REOPENED"')) {
            const doubtId = p[0];
            const userId = p[1];
            const doubt = this.data.doubts.find(d => d.id === doubtId && d.user_id === userId);
            if (doubt) {
                doubt.status = 'reopened';
                doubt.resolved_at = null;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        // 6. Sessions queries
        if (qUpper.startsWith('INSERT INTO SESSIONS')) {
            const newSession = {
                id: p[0],
                user_id: p[1],
                mentor_id: p[2],
                doubt_id: p[3] || null,
                session_type: p[4] || '1-on-1',
                scheduled_time: p[5],
                notes: p[6] || '',
                meeting_link: p[7] || 'https://meet.google.com/demo-session',
                status: 'scheduled',
                created_at: new Date().toISOString()
            };
            this.data.sessions.push(newSession);
            this.saveData();
            return [{ affectedRows: 1, insertId: newSession.id }];
        }

        if (qUpper.includes('SELECT * FROM SESSIONS WHERE ID = ?')) {
            const session = this.data.sessions.find(s => s.id === p[0]);
            return [session ? [session] : []];
        }

        if (qUpper.includes('SELECT * FROM SESSIONS WHERE USER_ID = ?')) {
            const sessions = this.data.sessions.filter(s => s.user_id === p[0]);
            return [sessions];
        }

        if (qUpper.includes('FROM SESSIONS S JOIN USERS U ON S.USER_ID = U.ID') && qUpper.includes('WHERE S.MENTOR_ID = ?')) {
            const sessions = this.data.sessions
                .filter(s => s.mentor_id === p[0])
                .map(s => {
                    const student = this.data.users.find(u => u.id === s.user_id) || {};
                    const doubt = this.data.doubts.find(d => d.id === s.doubt_id) || {};
                    return {
                        ...s,
                        student_name: student.full_name,
                        student_email: student.email,
                        doubt_title: doubt.title || 'General Mentorship'
                    };
                });
            return [sessions];
        }

        // 7. Study resources
        if (qUpper.startsWith('INSERT INTO STUDY_RESOURCES')) {
            const newRes = {
                id: p[0],
                user_id: p[1],
                title: p[2],
                description: p[3] || '',
                subject: p[4] || '',
                category: p[5] || '',
                file_path: p[6],
                access_level: p[7] || 'public',
                downloads_count: 0,
                created_at: new Date().toISOString()
            };
            this.data.study_resources.unshift(newRes);
            this.saveData();
            return [{ affectedRows: 1, insertId: newRes.id }];
        }

        if (qUpper.includes('FROM STUDY_RESOURCES SR JOIN USERS U ON SR.USER_ID = U.ID')) {
            const resources = this.data.study_resources.map(sr => {
                const uploader = this.data.users.find(u => u.id === sr.user_id) || {};
                return {
                    ...sr,
                    uploader_name: uploader.full_name || 'Educator'
                };
            });
            return [resources];
        }

        // 8. Messages & Chat
        if (qUpper.startsWith('INSERT INTO MESSAGES')) {
            const newMsg = {
                id: p[0],
                doubt_id: p[1],
                sender_id: p[2],
                receiver_id: p[3],
                message: p[4],
                image_path: p[5] || null,
                is_read: false,
                created_at: new Date().toISOString()
            };
            this.data.messages.push(newMsg);
            this.saveData();
            return [{ affectedRows: 1, insertId: newMsg.id }];
        }

        if (qUpper.includes('FROM MESSAGES M JOIN USERS U ON M.SENDER_ID = U.ID WHERE M.DOUBT_ID = ?')) {
            const msgs = this.data.messages
                .filter(m => m.doubt_id === p[0])
                .map(m => {
                    const sender = this.data.users.find(u => u.id === m.sender_id) || {};
                    return {
                        ...m,
                        sender_name: sender.full_name,
                        sender_photo: sender.profile_photo || null
                    };
                });
            return [msgs];
        }

        if (qUpper.includes('UPDATE MESSAGES SET IS_READ = TRUE WHERE DOUBT_ID = ?')) {
            const doubtId = p[0];
            const receiverId = p[1];
            this.data.messages.forEach(m => {
                if (m.doubt_id === doubtId && m.receiver_id === receiverId) {
                    m.is_read = true;
                }
            });
            this.saveData();
            return [{ affectedRows: 1 }];
        }

        if (qUpper.includes('SELECT USER_ID, ASSIGNED_MENTOR_ID FROM DOUBTS WHERE ID = ?')) {
            const doubt = this.data.doubts.find(d => d.id === p[0]);
            return [doubt ? [{ user_id: doubt.user_id, assigned_mentor_id: doubt.assigned_mentor_id }] : []];
        }

        if (qUpper.includes('FROM DOUBTS D') && qUpper.includes('LAST_MESSAGE')) {
            const userId = p[0];
            const chats = this.data.doubts
                .filter(d => d.user_id === userId || d.assigned_mentor_id === userId)
                .map(d => {
                    const student = this.data.users.find(u => u.id === d.user_id) || {};
                    const mentorUser = this.data.users.find(u => u.id === d.assigned_mentor_id) || {};
                    const dMsgs = this.data.messages.filter(m => m.doubt_id === d.id);
                    const lastMsg = dMsgs[dMsgs.length - 1];
                    const unread = dMsgs.filter(m => m.receiver_id === userId && !m.is_read).length;
                    return {
                        id: d.id,
                        title: d.title,
                        status: d.status,
                        student_id: d.user_id,
                        mentor_id: d.assigned_mentor_id,
                        student_name: student.full_name,
                        mentor_name: mentorUser.full_name,
                        unread_count: unread,
                        last_message: lastMsg ? lastMsg.message : null,
                        last_message_time: lastMsg ? lastMsg.created_at : d.created_at
                    };
                });
            return [chats];
        }

        // 9. Notifications
        if (qUpper.startsWith('INSERT INTO NOTIFICATIONS')) {
            const newNotif = {
                id: p[0],
                user_id: p[1],
                type: p[2],
                title: p[3],
                message: p[4],
                related_id: p[5] || null,
                is_read: false,
                created_at: new Date().toISOString()
            };
            this.data.notifications.unshift(newNotif);
            this.saveData();
            return [{ affectedRows: 1, insertId: newNotif.id }];
        }

        if (qUpper.includes('SELECT * FROM NOTIFICATIONS WHERE USER_ID = ?')) {
            const notifs = this.data.notifications.filter(n => n.user_id === p[0]);
            return [notifs];
        }

        if (qUpper.includes('UPDATE NOTIFICATIONS SET IS_READ = TRUE WHERE ID = ?')) {
            const notifId = p[0];
            const userId = p[1];
            const n = this.data.notifications.find(item => item.id === notifId && item.user_id === userId);
            if (n) {
                n.is_read = true;
                this.saveData();
            }
            return [{ affectedRows: 1 }];
        }

        // Default empty result
        console.log('[FallbackDB] Unhandled query pattern:', q);
        return [[]];
    }

    async getConnection() {
        return {
            execute: (query, params) => this.execute(query, params),
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {}
        };
    }
}

module.exports = new FallbackDatabase();

