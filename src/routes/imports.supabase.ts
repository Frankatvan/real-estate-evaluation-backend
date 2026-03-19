import { Router, Request, Response } from 'express';
import { FileFilterCallback } from 'multer';
import multer from 'multer';
import { Pool } from 'pg';
import { ExcelParserService } from '../services/ExcelParserService';
import { supabaseStorageService } from '../services/supabaseStorageService';
import { authenticateSupabaseToken } from '../middleware/supabaseAuth';
import logger from '../config/logger';

const router = Router();
const excelParser = new ExcelParserService();

// Configure multer for memory upload (files will be uploaded to Supabase)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept Excel files
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Helper function to get project ID from version ID
 */
async function getProjectId(db: Pool, versionId: string): Promise<number | null> {
  const result = await db.query(
    'SELECT project_id FROM versions WHERE id = $1',
    [versionId]
  );
  return result.rows[0]?.project_id || null;
}

/**
 * Import sales data from Excel file
 */
router.post('/sales/:versionId', authenticateSupabaseToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Upload file to Supabase Storage
    const projectId = await getProjectId(db, versionId);
    if (!projectId) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const uploadResult = await supabaseStorageService.uploadFile(
      req.user.id,
      projectId.toString(),
      req.file,
      'imports'
    );

    logger.info('File uploaded to Supabase', {
      versionId,
      filePath: uploadResult.path,
      url: uploadResult.url
    });

    // Parse Excel file
    const salesData = excelParser.parseSalesData(req.file.buffer);

    // Validate data
    const validation = excelParser.validateData(salesData, ['unitCode']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Insert data into database
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Record file upload in database
      const fileRecord = await client.query(
        `INSERT INTO file_uploads (version_id, file_path, file_name, file_size, upload_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'sales_import', CURRENT_TIMESTAMP)
         RETURNING id`,
        [versionId, uploadResult.path, req.file.originalname, uploadResult.size]
      );

      // Insert sales data
      for (const item of salesData) {
        const query = `
          INSERT INTO sales_data (
            version_id, unit_code, unit_type, actual_price, expected_price, closing_date
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (version_id, unit_code)
          DO UPDATE SET
            unit_type = EXCLUDED.unit_type,
            actual_price = EXCLUDED.actual_price,
            expected_price = EXCLUDED.expected_price,
            closing_date = EXCLUDED.closing_date,
            version_timestamp = CURRENT_TIMESTAMP
        `;

        await client.query(query, [
          versionId,
          item.unitCode,
          item.unitType,
          item.actualPrice,
          item.expectedPrice,
          item.closingDate
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully imported ${salesData.length} sales records`,
        count: salesData.length,
        file: {
          id: fileRecord.rows[0].id,
          path: uploadResult.path,
          url: uploadResult.url
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error importing sales data', { error: error.message });
    res.status(500).json({
      error: 'Failed to import sales data',
      details: error.message
    });
  }
});

/**
 * Import construction data from Excel file
 */
router.post('/construction/:versionId', authenticateSupabaseToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Upload file to Supabase Storage
    const projectId = await getProjectId(db, versionId);
    if (!projectId) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const uploadResult = await supabaseStorageService.uploadFile(
      req.user.id,
      projectId.toString(),
      req.file,
      'imports'
    );

    logger.info('File uploaded to Supabase', {
      versionId,
      filePath: uploadResult.path,
      url: uploadResult.url
    });

    // Parse Excel file
    const constructionData = excelParser.parseConstructionData(req.file.buffer);

    // Validate data
    const validation = excelParser.validateData(constructionData, ['unitCode', 'costCode']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Insert data into database
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Record file upload in database
      await client.query(
        `INSERT INTO file_uploads (version_id, file_path, file_name, file_size, upload_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'construction_import', CURRENT_TIMESTAMP)`,
        [versionId, uploadResult.path, req.file.originalname, uploadResult.size]
      );

      for (const item of constructionData) {
        const query = `
          INSERT INTO construction_data (
            version_id, unit_code, cost_code, vendor, category, amount,
            clear_date, due_date, is_cleared, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id)
          DO UPDATE SET
            vendor = EXCLUDED.vendor,
            category = EXCLUDED.category,
            amount = EXCLUDED.amount,
            clear_date = EXCLUDED.clear_date,
            due_date = EXCLUDED.due_date,
            is_cleared = EXCLUDED.is_cleared,
            notes = EXCLUDED.notes,
            version_timestamp = CURRENT_TIMESTAMP
        `;

        await client.query(query, [
          versionId,
          item.unitCode,
          item.costCode,
          item.vendor,
          item.category,
          item.amount,
          item.clearDate,
          item.dueDate,
          item.isCleared,
          item.notes
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully imported ${constructionData.length} construction records`,
        count: constructionData.length,
        file: {
          path: uploadResult.path,
          url: uploadResult.url
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error importing construction data', { error: error.message });
    res.status(500).json({
      error: 'Failed to import construction data',
      details: error.message
    });
  }
});

/**
 * Import units data from Excel file
 */
router.post('/units/:versionId', authenticateSupabaseToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Upload file to Supabase Storage
    const projectId = await getProjectId(db, versionId);
    if (!projectId) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const uploadResult = await supabaseStorageService.uploadFile(
      req.user.id,
      projectId.toString(),
      req.file,
      'imports'
    );

    logger.info('File uploaded to Supabase', {
      versionId,
      filePath: uploadResult.path,
      url: uploadResult.url
    });

    // Parse Excel file
    const unitsData = excelParser.parseUnitsData(req.file.buffer);

    // Validate data
    const validation = excelParser.validateData(unitsData, ['unitCode']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Insert data into database
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Record file upload in database
      await client.query(
        `INSERT INTO file_uploads (version_id, file_path, file_name, file_size, upload_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'units_import', CURRENT_TIMESTAMP)`,
        [versionId, uploadResult.path, req.file.originalname, uploadResult.size]
      );

      for (const item of unitsData) {
        const query = `
          INSERT INTO units_data (
            version_id, unit_code, unit_type, area, floor, building, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (version_id, unit_code)
          DO UPDATE SET
            unit_type = EXCLUDED.unit_type,
            area = EXCLUDED.area,
            floor = EXCLUDED.floor,
            building = EXCLUDED.building,
            status = EXCLUDED.status
        `;

        await client.query(query, [
          versionId,
          item.unitCode,
          item.unitType,
          item.area,
          item.floor,
          item.building,
          item.status
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully imported ${unitsData.length} unit records`,
        count: unitsData.length,
        file: {
          path: uploadResult.path,
          url: uploadResult.url
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error importing units data', { error: error.message });
    res.status(500).json({
      error: 'Failed to import units data',
      details: error.message
    });
  }
});

/**
 * Import tenants data from Excel file
 */
router.post('/tenants/:versionId', authenticateSupabaseToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Upload file to Supabase Storage
    const projectId = await getProjectId(db, versionId);
    if (!projectId) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const uploadResult = await supabaseStorageService.uploadFile(
      req.user.id,
      projectId.toString(),
      req.file,
      'imports'
    );

    logger.info('File uploaded to Supabase', {
      versionId,
      filePath: uploadResult.path,
      url: uploadResult.url
    });

    // Parse Excel file
    const tenantsData = excelParser.parseTenantsData(req.file.buffer);

    // Validate data
    const validation = excelParser.validateData(tenantsData, ['unitCode', 'tenantName']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Insert data into database
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Record file upload in database
      await client.query(
        `INSERT INTO file_uploads (version_id, file_path, file_name, file_size, upload_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'tenants_import', CURRENT_TIMESTAMP)`,
        [versionId, uploadResult.path, req.file.originalname, uploadResult.size]
      );

      for (const item of tenantsData) {
        const query = `
          INSERT INTO tenants_data (
            version_id, unit_code, tenant_name, lease_start_date, lease_end_date,
            monthly_rent, rental_deposit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id)
          DO UPDATE SET
            tenant_name = EXCLUDED.tenant_name,
            lease_start_date = EXCLUDED.lease_start_date,
            lease_end_date = EXCLUDED.lease_end_date,
            monthly_rent = EXCLUDED.monthly_rent,
            rental_deposit = EXCLUDED.rental_deposit
        `;

        await client.query(query, [
          versionId,
          item.unitCode,
          item.tenantName,
          item.leaseStartDate,
          item.leaseEndDate,
          item.monthlyRent,
          item.rentalDeposit
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully imported ${tenantsData.length} tenant records`,
        count: tenantsData.length,
        file: {
          path: uploadResult.path,
          url: uploadResult.url
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error importing tenants data', { error: error.message });
    res.status(500).json({
      error: 'Failed to import tenants data',
      details: error.message
    });
  }
});

/**
 * Import plan data from Excel file
 */
router.post('/plan/:versionId', authenticateSupabaseToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Upload file to Supabase Storage
    const projectId = await getProjectId(db, versionId);
    if (!projectId) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const uploadResult = await supabaseStorageService.uploadFile(
      req.user.id,
      projectId.toString(),
      req.file,
      'imports'
    );

    logger.info('File uploaded to Supabase', {
      versionId,
      filePath: uploadResult.path,
      url: uploadResult.url
    });

    // Parse Excel file
    const planData = excelParser.parsePlanData(req.file.buffer);

    // Validate data
    const validation = excelParser.validateData(planData, ['unitCode']);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Insert data into database
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Record file upload in database
      await client.query(
        `INSERT INTO file_uploads (version_id, file_path, file_name, file_size, upload_type, uploaded_at)
         VALUES ($1, $2, $3, $4, 'plan_import', CURRENT_TIMESTAMP)`,
        [versionId, uploadResult.path, req.file.originalname, uploadResult.size]
      );

      for (const item of planData) {
        const query = `
          INSERT INTO plan_data (
            version_id, unit_code, planned_start_date, planned_end_date,
            planned_cost, phase
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (version_id, unit_code)
          DO UPDATE SET
            planned_start_date = EXCLUDED.planned_start_date,
            planned_end_date = EXCLUDED.planned_end_date,
            planned_cost = EXCLUDED.planned_cost,
            phase = EXCLUDED.phase
        `;

        await client.query(query, [
          versionId,
          item.unitCode,
          item.plannedStartDate,
          item.plannedEndDate,
          item.plannedCost,
          item.phase
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully imported ${planData.length} plan records`,
        count: planData.length,
        file: {
          path: uploadResult.path,
          url: uploadResult.url
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error importing plan data', { error: error.message });
    res.status(500).json({
      error: 'Failed to import plan data',
      details: error.message
    });
  }
});

/**
 * Get import status for a version
 */
router.get('/status/:versionId', authenticateSupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const [salesResult, constructionResult, unitsResult, tenantsResult, planResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM sales_data WHERE version_id = $1', [versionId]),
      db.query('SELECT COUNT(*) as count FROM construction_data WHERE version_id = $1', [versionId]),
      db.query('SELECT COUNT(*) as count FROM units_data WHERE version_id = $1', [versionId]),
      db.query('SELECT COUNT(*) as count FROM tenants_data WHERE version_id = $1', [versionId]),
      db.query('SELECT COUNT(*) as count FROM plan_data WHERE version_id = $1', [versionId])
    ]);

    res.json({
      versionId,
      data: {
        sales: parseInt(salesResult.rows[0].count),
        construction: parseInt(constructionResult.rows[0].count),
        units: parseInt(unitsResult.rows[0].count),
        tenants: parseInt(tenantsResult.rows[0].count),
        plan: parseInt(planResult.rows[0].count)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching import status', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch import status',
      details: error.message
    });
  }
});

/**
 * List uploaded files for a version
 */
router.get('/files/:versionId', authenticateSupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await db.query(
      `SELECT id, file_path, file_name, file_size, upload_type, uploaded_at
       FROM file_uploads
       WHERE version_id = $1
       ORDER BY uploaded_at DESC`,
      [versionId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error('Error fetching uploaded files', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch uploaded files',
      details: error.message
    });
  }
});

export default router;