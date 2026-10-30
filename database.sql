-- SkillConnect Database Schema
CREATE DATABASE IF NOT EXISTS skillconnect;
USE skillconnect;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_type ENUM('student', 'mentor', 'admin') DEFAULT 'student',
    college VARCHAR(255),
    branch VARCHAR(255),
    year VARCHAR(50),
    is_anonymous BOOLEAN DEFAULT FALSE,
    skills TEXT,
    xp_points INT DEFAULT 0,
    level INT DEFAULT 1,
    profile_photo VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mentor Profiles table
CREATE TABLE IF NOT EXISTS mentor_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    experience VARCHAR(255),
    expertise TEXT,
    badges TEXT,
    availability TEXT,
    bio TEXT,
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    max_students INT DEFAULT 10,
    verified BOOLEAN DEFAULT FALSE,
    joined_date DATE,
    rating DECIMAL(3, 2) DEFAULT 0.0,
    total_sessions INT DEFAULT 0,
    students_helped INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Doubts table
CREATE TABLE IF NOT EXISTS doubts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    subject VARCHAR(100),
    category VARCHAR(100),
    image_path VARCHAR(500),
    is_anonymous BOOLEAN DEFAULT FALSE,
    urgency VARCHAR(50) DEFAULT 'medium',
    status ENUM('pending', 'assigned', 'resolved', 'reopened') DEFAULT 'pending',
    assigned_mentor_id VARCHAR(36),
    solution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    mentor_id VARCHAR(36) NOT NULL,
    doubt_id VARCHAR(36),
    session_type VARCHAR(50) DEFAULT '1-on-1',
    scheduled_time DATETIME NOT NULL,
    duration INT DEFAULT 60,
    notes TEXT,
    meeting_link VARCHAR(500),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Study Resources table
CREATE TABLE IF NOT EXISTS study_resources (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    category VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    access_level VARCHAR(50) DEFAULT 'public',
    downloads_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    doubt_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    image_path VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id VARCHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

