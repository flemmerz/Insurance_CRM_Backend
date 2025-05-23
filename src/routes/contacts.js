// src/routes/contacts.js
import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Placeholder routes - implement similar to companies
router.get('/', (req, res) => {
  res.json({ message: 'Contacts endpoint - Coming soon' });
});

export default router;