// src/routes/reports.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { formatResponse, formatPaginatedResponse } from '../utils/responseHelpers.js';
import { createError } from '../utils/errors.js';
import { validatePagination } from '../utils/validation.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/v1/reports/companies - Company reports
router.get('/companies', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      industry, 
      size, 
      dateFrom, 
      dateTo 
    } = req.query;

    const pagination = validatePagination({ page, limit });
    const offset = (pagination.page - 1) * pagination.limit;

    let whereConditions = ['c.status = $1'];
    let queryParams = ['active'];
    let paramIndex = 2;

    if (industry) {
      whereConditions.push(`c.primary_industry ILIKE $${paramIndex}`);
      queryParams.push(`%${industry}%`);
      paramIndex++;
    }

    if (size) {
      whereConditions.push(`c.company_size = $${paramIndex}`);
      queryParams.push(size);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`c.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`c.created_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const reportQuery = `
      SELECT 
        c.*,
        bp.employee_count,
        bp.annual_revenue,
        COUNT(DISTINCT pa.account_id) as total_accounts,
        COUNT(DISTINCT p.policy_id) as total_policies,
        COALESCE(SUM(pa.total_premium), 0) as total_premium_value,
        COUNT(DISTINCT t.task_id) as open_tasks
      FROM company c
      LEFT JOIN business_profile bp ON c.company_id = bp.company_id AND bp.is_current = true
      LEFT JOIN policy_account pa ON c.company_id = pa.company_id
      LEFT JOIN policy p ON pa.account_id = p.account_id AND p.status = 'active'
      LEFT JOIN task t ON c.company_id = t.company_id AND t.status IN ('pending', 'in_progress')
      WHERE ${whereClause}
      GROUP BY c.company_id, bp.employee_count, bp.annual_revenue
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT c.company_id) as total
      FROM company c
      LEFT JOIN business_profile bp ON c.company_id = bp.company_id AND bp.is_current = true
      WHERE ${whereClause}
    `;

    queryParams.push(pagination.limit, offset);
    const countParams = queryParams.slice(0, paramIndex - 2);

    const [reportResult, countResult] = await Promise.all([
      query(reportQuery, queryParams),
      query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const paginationInfo = {
      ...pagination,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page * pagination.limit < total,
      hasPrev: pagination.page > 1
    };

    res.json(formatPaginatedResponse(reportResult.rows, paginationInfo));

  } catch (error) {
    logger.error('Error generating company report:', error);
    next(createError(500, 'Failed to generate company report'));
  }
});

export default router;