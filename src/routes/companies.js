// src/routes/companies.js
import express from 'express';
import { body, param, query } from 'express-validator';
import { 
  getCompanies, 
  getCompanyById, 
  createCompany, 
  updateCompany, 
  deleteCompany,
  getCompanyBusinessProfile,
  updateCompanyBusinessProfile,
  getCompanyRiskFactors,
  addCompanyRiskFactor,
  getCompanyChangeEvents
} from '../controllers/companyController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Company validation rules
const companyValidation = [
  body('company_name').notEmpty().withMessage('Company name is required'),
  body('legal_name').optional().isString(),
  body('tax_id').optional().isString(),
  body('primary_industry').optional().isString(),
  body('naics_code').optional().isLength({ max: 10 }),
  body('established_date').optional().isISO8601(),
  body('company_size').optional().isIn(['startup', 'small', 'medium', 'large', 'enterprise']),
  body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']),
];

const businessProfileValidation = [
  body('employee_count').optional().isInt({ min: 0 }),
  body('annual_revenue').optional().isDecimal({ decimal_digits: '0,2' }),
  body('business_description').optional().isString(),
  body('locations').optional().isObject(),
  body('assets').optional().isObject(),
  body('operations').optional().isObject(),
];

const riskFactorValidation = [
  body('risk_category').notEmpty().withMessage('Risk category is required'),
  body('risk_description').optional().isString(),
  body('severity_level').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('impact_score').optional().isDecimal({ decimal_digits: '0,2' }),
];

// Routes
// GET /api/v1/companies - Get all companies with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('industry').optional().isString(),
  query('size').optional().isIn(['startup', 'small', 'medium', 'large', 'enterprise']),
  query('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']),
  validateRequest,
], getCompanies);

// GET /api/v1/companies/:id - Get specific company
router.get('/:id', [
  param('id').isInt().withMessage('Invalid company ID'),
  validateRequest,
], getCompanyById);

// POST /api/v1/companies - Create new company
router.post('/', [
  ...companyValidation,
  validateRequest,
  authorize(['admin', 'manager', 'agent']),
], createCompany);

// PUT /api/v1/companies/:id - Update company
router.put('/:id', [
  param('id').isInt().withMessage('Invalid company ID'),
  ...companyValidation,
  validateRequest,
  authorize(['admin', 'manager', 'agent']),
], updateCompany);

// DELETE /api/v1/companies/:id - Delete company
router.delete('/:id', [
  param('id').isInt().withMessage('Invalid company ID'),
  validateRequest,
  authorize(['admin', 'manager']),
], deleteCompany);

// Business Profile routes
// GET /api/v1/companies/:id/profile - Get company business profile
router.get('/:id/profile', [
  param('id').isInt().withMessage('Invalid company ID'),
  validateRequest,
], getCompanyBusinessProfile);

// PUT /api/v1/companies/:id/profile - Update business profile
router.put('/:id/profile', [
  param('id').isInt().withMessage('Invalid company ID'),
  ...businessProfileValidation,
  validateRequest,
  authorize(['admin', 'manager', 'agent']),
], updateCompanyBusinessProfile);

// Risk Factor routes
// GET /api/v1/companies/:id/risk-factors - Get company risk factors
router.get('/:id/risk-factors', [
  param('id').isInt().withMessage('Invalid company ID'),
  validateRequest,
], getCompanyRiskFactors);

// POST /api/v1/companies/:id/risk-factors - Add risk factor
router.post('/:id/risk-factors', [
  param('id').isInt().withMessage('Invalid company ID'),
  ...riskFactorValidation,
  validateRequest,
  authorize(['admin', 'manager', 'underwriter']),
], addCompanyRiskFactor);

// Change Events routes
// GET /api/v1/companies/:id/change-events - Get company change events
router.get('/:id/change-events', [
  param('id').isInt().withMessage('Invalid company ID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
], getCompanyChangeEvents);

export default router;