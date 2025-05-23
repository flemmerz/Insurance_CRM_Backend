// src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { validateRequest } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';
import { formatResponse } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Validation rules
const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['admin', 'manager', 'agent', 'underwriter', 'claims_adjuster']).withMessage('Invalid role'),
  body('department').isIn(['sales', 'underwriting', 'claims', 'customer_service', 'management']).withMessage('Invalid department'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.staff_id,
      username: user.username,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      userId: user.staff_id,
      type: 'refresh' 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// POST /api/v1/auth/login - User login
router.post('/login', loginValidation, validateRequest, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const userResult = await query(
      `SELECT * FROM staff_user 
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return next(createError(401, 'Invalid credentials'));
    }

    const user = userResult.rows[0];

    // For demo purposes, we'll assume passwords are stored as plain text
    // In production, use bcrypt.compare(password, user.password_hash)
    if (password !== 'password123') { // Temporary password for demo
      return next(createError(401, 'Invalid credentials'));
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log successful login
    logger.info(`User logged in: ${user.username} (${user.email})`);

    // Return user data and tokens
    const userData = {
      id: user.staff_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      permissions: user.permissions || {}
    };

    res.json(formatResponse({
      user: userData,
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRE || '24h'
    }, 'Login successful'));

  } catch (error) {
    logger.error('Login error:', error);
    next(createError(500, 'Login failed'));
  }
});

// POST /api/v1/auth/register - User registration (admin only)
router.post('/register', registerValidation, validateRequest, authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Only administrators can register new users'));
    }

    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role,
      department,
      permissions = {}
    } = req.body;

    // Check if username or email already exists
    const existingUser = await query(
      'SELECT staff_id FROM staff_user WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return next(createError(400, 'Username or email already exists'));
    }

    // Hash password (for demo, we're skipping this)
    // const passwordHash = await bcrypt.hash(password, 12);

    // Insert new user
    const newUserResult = await query(
      `INSERT INTO staff_user (
        username, email, first_name, last_name, role, department, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING staff_id, username, email, first_name, last_name, role, department, permissions`,
      [username, email, first_name, last_name, role, department, JSON.stringify(permissions)]
    );

    const newUser = newUserResult.rows[0];

    logger.info(`New user registered: ${newUser.username} by ${req.user.username}`);

    res.status(201).json(formatResponse({
      id: newUser.staff_id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      department: newUser.department,
      permissions: newUser.permissions || {}
    }, 'User registered successfully'));

  } catch (error) {
    logger.error('Registration error:', error);
    next(createError(500, 'Registration failed'));
  }
});

// GET /api/v1/auth/profile - Get current user profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const userResult = await query(
      `SELECT staff_id, username, email, first_name, last_name, role, department, 
              permissions, created_at
       FROM staff_user 
       WHERE staff_id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return next(createError(404, 'User profile not found'));
    }

    const user = userResult.rows[0];
    const userData = {
      id: user.staff_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      permissions: user.permissions || {},
      createdAt: user.created_at
    };

    res.json(formatResponse(userData));

  } catch (error) {
    logger.error('Profile fetch error:', error);
    next(createError(500, 'Failed to fetch profile'));
  }
});

export default router;