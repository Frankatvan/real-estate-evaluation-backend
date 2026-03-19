import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/projects
 * Get all projects (with optional filtering)
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { status, search, limit = '50', offset = '0' } = req.query;

  try {
    let query = `
      SELECT p.*, u.username as creator_name,
             COUNT(DISTINCT v.id) as version_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      LEFT JOIN versions v ON p.id = v.project_id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add filters
    if (status) {
      query += ' AND p.status = $' + (params.length + 1);
      params.push(status);
    }

    if (search) {
      query += ' AND (p.name ILIKE $' + (params.length + 1) + ' OR p.description ILIKE $' + (params.length + 1) + ')';
      params.push(`%${search}%`);
    }

    query += ' GROUP BY p.id, u.username ORDER BY p.created_at DESC';
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT p.*, u.username as creator_name
       FROM projects p
       LEFT JOIN users u ON p.creator_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Get versions for this project
    const versionsResult = await db.query(
      `SELECT v.*, u.username as creator_name
       FROM versions v
       LEFT JOIN users u ON v.creator_id = u.id
       WHERE v.project_id = $1
       ORDER BY v.created_at DESC`,
      [id]
    );

    const project = result.rows[0];
    project.versions = versionsResult.rows;

    res.json({
      success: true,
      data: project
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/projects
 * Create a new project
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { name, description, location, totalUnits, totalArea } = req.body;

  // Validation
  if (!name) {
    return res.status(400).json({
      error: 'Missing required field',
      details: 'Project name is required'
    });
  }

  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create project
      const projectResult = await client.query(
        `INSERT INTO projects (name, description, location, total_units, total_area, creator_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [name, description, location, totalUnits, totalArea, req.user!.id]
      );

      const project = projectResult.rows[0];

      // Create initial version
      const versionResult = await client.query(
        `INSERT INTO versions (project_id, version_number, name, description, is_current, creator_id, created_at)
         VALUES ($1, 1, '初始版本', '项目初始版本', true, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [project.id, req.user!.id]
      );

      await client.query('COMMIT');

      project.versions = [versionResult.rows[0]];

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({
      error: 'Failed to create project',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/projects/:id
 * Update a project
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;
  const { name, description, location, totalUnits, totalArea, status } = req.body;

  try {
    // Check if user owns the project or is admin
    const projectCheck = await db.query(
      'SELECT creator_id FROM projects WHERE id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (projectCheck.rows[0].creator_id !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to update this project'
      });
    }

    // Update project
    const result = await db.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           total_units = COALESCE($4, total_units),
           total_area = COALESCE($5, total_area),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, description, location, totalUnits, totalArea, status, id]
    );

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({
      error: 'Failed to update project',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/projects/:id
 * Delete a project
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;

  try {
    // Check if user owns the project or is admin
    const projectCheck = await db.query(
      'SELECT creator_id FROM projects WHERE id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (projectCheck.rows[0].creator_id !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to delete this project'
      });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Delete related data (cascade delete would be better in production)
      await client.query('DELETE FROM calculation_results WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM calculation_parameters WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM sales_data WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM construction_data WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM units_data WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM tenants_data WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM plan_data WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM payment_data WHERE version_id IN (SELECT id FROM versions WHERE project_id = $1)', [id]);
      await client.query('DELETE FROM versions WHERE project_id = $1', [id]);
      await client.query('DELETE FROM projects WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/projects/:id/versions
 * Create a new version for a project
 */
router.post('/:id/versions', authenticateToken, async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    // Check if project exists and user has access
    const projectCheck = await db.query(
      'SELECT creator_id FROM projects WHERE id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (projectCheck.rows[0].creator_id !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to create versions for this project'
      });
    }

    // Get next version number
    const versionResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM versions WHERE project_id = $1',
      [id]
    );

    const nextVersion = versionResult.rows[0].next_version;

    // Set current version to false for all versions
    await db.query(
      'UPDATE versions SET is_current = false WHERE project_id = $1',
      [id]
    );

    // Create new version
    const result = await db.query(
      `INSERT INTO versions (project_id, version_number, name, description, is_current, creator_id, created_at)
       VALUES ($1, $2, $3, $4, true, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, nextVersion, name || `版本 ${nextVersion}`, description, req.user!.id]
    );

    res.status(201).json({
      success: true,
      message: 'Version created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating version:', error);
    res.status(500).json({
      error: 'Failed to create version',
      details: error.message
    });
  }
});

export default router;
