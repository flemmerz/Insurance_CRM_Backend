// src/routes/dashboard.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { formatResponse } from '../utils/responseHelpers.js';
import { createError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/v1/dashboard/metrics - Get dashboard metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const metricsQuery = `
      WITH company_stats AS (
        SELECT COUNT(*) as total_companies
        FROM company 
        WHERE status = 'active'
      ),
      policy_stats AS (
        SELECT 
          COUNT(*) as active_policies,
          COUNT(CASE WHEN expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as upcoming_renewals
        FROM policy p
        JOIN policy_account pa ON p.account_id = pa.account_id
        WHERE p.status = 'active'
      ),
      task_stats AS (
        SELECT COUNT(*) as tasks_due
        FROM task 
        WHERE status IN ('pending', 'in_progress') 
        AND due_date <= CURRENT_DATE + INTERVAL '7 days'
      ),
      revenue_stats AS (
        SELECT 
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month', pa.created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN pa.total_premium END), 0) as revenue_this_month,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month', pa.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN pa.total_premium END), 0) as revenue_previous_month
        FROM policy_account pa
        WHERE pa.status = 'active'
      )
      SELECT 
        cs.total_companies,
        ps.active_policies,
        ps.upcoming_renewals,
        ts.tasks_due,
        rs.revenue_this_month,
        rs.revenue_previous_month,
        CASE 
          WHEN rs.revenue_previous_month > 0 THEN 
            ROUND(((rs.revenue_this_month - rs.revenue_previous_month) / rs.revenue_previous_month * 100)::numeric, 2)
          ELSE 0 
        END as revenue_growth
      FROM company_stats cs, policy_stats ps, task_stats ts, revenue_stats rs
    `;

    const result = await query(metricsQuery);
    const metrics = result.rows[0];

    res.json(formatResponse({
      totalCompanies: parseInt(metrics.total_companies) || 0,
      activePolicies: parseInt(metrics.active_policies) || 0,
      upcomingRenewals: parseInt(metrics.upcoming_renewals) || 0,
      tasksDue: parseInt(metrics.tasks_due) || 0,
      revenueThisMonth: parseFloat(metrics.revenue_this_month) || 0,
      revenuePreviousMonth: parseFloat(metrics.revenue_previous_month) || 0,
      revenueGrowth: parseFloat(metrics.revenue_growth) || 0
    }));

  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    next(createError(500, 'Failed to fetch dashboard metrics'));
  }
});

// GET /api/v1/dashboard/recent-activities - Get recent activities
router.get('/recent-activities', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const activitiesQuery = `
      (
        SELECT 
          'company' as type,
          'Company created: ' || company_name as description,
          created_at as activity_date,
          company_id::text as reference_id
        FROM company 
        ORDER BY created_at DESC 
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          'policy' as type,
          'Policy created: ' || policy_number as description,
          created_at as activity_date,
          policy_id::text as reference_id
        FROM policy 
        ORDER BY created_at DESC 
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          'task' as type,
          'Task created: ' || title as description,
          created_at as activity_date,
          task_id::text as reference_id
        FROM task 
        ORDER BY created_at DESC 
        LIMIT 5
      )
      ORDER BY activity_date DESC
      LIMIT $1
    `;

    const result = await query(activitiesQuery, [limit]);
    res.json(formatResponse(result.rows));

  } catch (error) {
    logger.error('Error fetching recent activities:', error);
    next(createError(500, 'Failed to fetch recent activities'));
  }
});

// GET /api/v1/dashboard/upcoming-tasks - Get upcoming tasks
router.get('/upcoming-tasks', async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const tasksQuery = `
      SELECT 
        t.*,
        c.company_name,
        su.first_name || ' ' || su.last_name as assigned_to_name
      FROM task t
      LEFT JOIN company c ON t.company_id = c.company_id
      LEFT JOIN staff_user su ON t.assigned_to = su.staff_id
      WHERE t.status IN ('pending', 'in_progress')
      ORDER BY 
        CASE t.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        t.due_date ASC
      LIMIT $1
    `;

    const result = await query(tasksQuery, [limit]);
    res.json(formatResponse(result.rows));

  } catch (error) {
    logger.error('Error fetching upcoming tasks:', error);
    next(createError(500, 'Failed to fetch upcoming tasks'));
  }
});

export default router;