import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { CalculationService } from '../services/CalculationService';

const router = Router();

/**
 * GET /api/v1/calculations/parameters/:versionId
 * Get calculation parameters for a specific version
 */
router.get('/parameters/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM calculation_parameters WHERE version_id = $1',
      [versionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculation parameters not found' });
    }

    // Map database fields to camelCase
    const parameters = {
      versionId: result.rows[0].version_id,
      benchmarkSellingPrice: result.rows[0].benchmark_selling_price,
      wbgIncomeCalculationMethod: result.rows[0].wbg_income_calculation_method,
      loanInterestRate: result.rows[0].loan_interest_rate,
      terminalValue: result.rows[0].terminal_value,
      fiveYearValue: result.rows[0].five_year_value,
      restenantsCostRate: result.rows[0].restenants_cost_rate,
      salesCommissionFixed: result.rows[0].sales_commission_fixed,
      salesCommissionRate: result.rows[0].sales_commission_rate,
      vacancyRate: result.rows[0].vacancy_rate,
      updatedAt: result.rows[0].updated_at
    };

    res.json(parameters);
  } catch (error: any) {
    console.error('Error fetching calculation parameters:', error);
    res.status(500).json({
      error: 'Failed to fetch calculation parameters',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/calculations/parameters/:versionId
 * Update calculation parameters for a specific version
 */
router.put('/parameters/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;
  const parameters = req.body;

  try {
    const query = `
      UPDATE calculation_parameters
      SET
        benchmark_selling_price = COALESCE($1, benchmark_selling_price),
        wbg_income_calculation_method = COALESCE($2, wbg_income_calculation_method),
        loan_interest_rate = COALESCE($3, loan_interest_rate),
        terminal_value = COALESCE($4, terminal_value),
        five_year_value = COALESCE($5, five_year_value),
        restenants_cost_rate = COALESCE($6, restenants_cost_rate),
        sales_commission_fixed = COALESCE($7, sales_commission_fixed),
        sales_commission_rate = COALESCE($8, sales_commission_rate),
        vacancy_rate = COALESCE($9, vacancy_rate),
        updated_at = CURRENT_TIMESTAMP
      WHERE version_id = $10
      RETURNING *
    `;

    const result = await db.query(query, [
      parameters.benchmarkSellingPrice,
      parameters.wbgIncomeCalculationMethod,
      parameters.loanInterestRate,
      parameters.terminalValue,
      parameters.fiveYearValue,
      parameters.restenantsCostRate,
      parameters.salesCommissionFixed,
      parameters.salesCommissionRate,
      parameters.vacancyRate,
      versionId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculation parameters not found' });
    }

    res.json({
      success: true,
      message: 'Calculation parameters updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating calculation parameters:', error);
    res.status(500).json({
      error: 'Failed to update calculation parameters',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/calculations/execute/:versionId
 * Execute calculation for a specific version
 */
router.post('/execute/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const calculationService = new CalculationService(db);
    const results = await calculationService.runCalculation(parseInt(versionId));

    res.json({
      success: true,
      message: 'Calculation executed successfully',
      data: results
    });
  } catch (error: any) {
    console.error('Error executing calculation:', error);
    res.status(500).json({
      error: 'Failed to execute calculation',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/calculations/results/:versionId
 * Get calculation results for a specific version
 */
router.get('/results/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const calculationService = new CalculationService(db);
    const results = await calculationService.getCalculationResults(parseInt(versionId));

    if (results.length === 0) {
      return res.status(404).json({ error: 'No calculation results found' });
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error('Error fetching calculation results:', error);
    res.status(500).json({
      error: 'Failed to fetch calculation results',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/calculations/full-results/:versionId
 * Get full calculation results including all details
 */
router.get('/full-results/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const calculationService = new CalculationService(db);
    const results = await calculationService.performCalculation(parseInt(versionId));

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error('Error fetching full calculation results:', error);
    res.status(500).json({
      error: 'Failed to fetch full calculation results',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/calculations/dashboard/:versionId
 * Get dashboard data for calculation results
 */
router.get('/dashboard/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const calculationService = new CalculationService(db);
    const results = await calculationService.performCalculation(parseInt(versionId));

    // Extract key metrics for dashboard
    const dashboardData = {
      summary: {
        totalInvestment: results.investment.totalInvestment,
        equityInvestment: results.investment.equityInvestment,
        debtInvestment: results.investment.debtInvestment,
        totalRevenue: results.salesRevenue.totalRevenue,
        netOperatingIncome: results.noi.netOperatingIncome,
        totalWbgIncome: results.wbgIncome.totalIncome
      },
      returns: {
        irr: results.returns.irr,
        xirr: results.returns.xirr,
        npv: results.returns.npv,
        paybackPeriod: results.returns.paybackPeriod,
        mirr: results.returns.mirr,
        roi: results.returns.roi
      },
      cashFlows: results.yearlyResults.map(year => ({
        year: year.year,
        projectCashFlow: year.projectCashFlow,
        fundCashFlow: year.fundCashFlow,
        investorCashFlow: year.investorCashFlow
      })),
      parameters: results.parameters,
      calculatedAt: results.calculatedAt
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/calculations/plan/:versionId
 * Get plan data for a specific version
 */
router.get('/plan/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM plan_data WHERE version_id = $1 ORDER BY unit_code, start_date',
      [versionId]
    );

    const planData = result.rows.map(row => ({
      id: row.id,
      versionId: row.version_id,
      unitCode: row.unit_code,
      activityType: row.activity_type,
      startDate: row.start_date,
      endDate: row.end_date,
      plannedDays: row.planned_days,
      actualDays: row.actual_days,
      status: row.status,
      notes: row.notes
    }));

    res.json({
      success: true,
      data: planData,
      count: planData.length
    });
  } catch (error: any) {
    console.error('Error fetching plan data:', error);
    res.status(500).json({
      error: 'Failed to fetch plan data',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/calculations/plan/:id
 * Update plan data item
 */
router.put('/plan/:id', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;
  const planData = req.body;

  try {
    const query = `
      UPDATE plan_data
      SET
        activity_type = COALESCE($1, activity_type),
        start_date = COALESCE($2, start_date),
        end_date = COALESCE($3, end_date),
        planned_days = COALESCE($4, planned_days),
        actual_days = COALESCE($5, actual_days),
        status = COALESCE($6, status),
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const result = await db.query(query, [
      planData.activityType,
      planData.startDate,
      planData.endDate,
      planData.plannedDays,
      planData.actualDays,
      planData.status,
      planData.notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan data not found' });
    }

    res.json({
      success: true,
      message: 'Plan data updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating plan data:', error);
    res.status(500).json({
      error: 'Failed to update plan data',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/calculations/plan/:versionId
 * Create new plan data item
 */
router.post('/plan/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;
  const planData = req.body;

  try {
    const query = `
      INSERT INTO plan_data (
        version_id, unit_code, activity_type, start_date, end_date,
        planned_days, actual_days, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      versionId,
      planData.unitCode,
      planData.activityType,
      planData.startDate,
      planData.endDate,
      planData.plannedDays,
      planData.actualDays,
      planData.status || 'PLANNED',
      planData.notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Plan data created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating plan data:', error);
    res.status(500).json({
      error: 'Failed to create plan data',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/calculations/plan/:id
 * Delete plan data item
 */
router.delete('/plan/:id', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM plan_data WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan data not found' });
    }

    res.json({
      success: true,
      message: 'Plan data deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting plan data:', error);
    res.status(500).json({
      error: 'Failed to delete plan data',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/calculations/payments/:versionId
 * Get payment data for a specific version
 */
router.get('/payments/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM payment_data WHERE version_id = $1 ORDER BY planned_date',
      [versionId]
    );

    const paymentData = result.rows.map(row => ({
      id: row.id,
      versionId: row.version_id,
      paymentType: row.payment_type,
      description: row.description,
      plannedAmount: row.planned_amount,
      actualAmount: row.actual_amount,
      plannedDate: row.planned_date,
      actualDate: row.actual_date,
      status: row.status,
      recipient: row.recipient,
      notes: row.notes
    }));

    res.json({
      success: true,
      data: paymentData,
      count: paymentData.length
    });
  } catch (error: any) {
    console.error('Error fetching payment data:', error);
    res.status(500).json({
      error: 'Failed to fetch payment data',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/calculations/payments/:versionId
 * Create new payment data item
 */
router.post('/payments/:versionId', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { versionId } = req.params;
  const paymentData = req.body;

  try {
    const query = `
      INSERT INTO payment_data (
        version_id, payment_type, description, planned_amount, actual_amount,
        planned_date, actual_date, status, recipient, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await db.query(query, [
      versionId,
      paymentData.paymentType,
      paymentData.description,
      paymentData.plannedAmount,
      paymentData.actualAmount,
      paymentData.plannedDate,
      paymentData.actualDate,
      paymentData.status || 'PENDING',
      paymentData.recipient,
      paymentData.notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Payment data created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating payment data:', error);
    res.status(500).json({
      error: 'Failed to create payment data',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/calculations/payments/:id
 * Update payment data item
 */
router.put('/payments/:id', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;
  const paymentData = req.body;

  try {
    const query = `
      UPDATE payment_data
      SET
        payment_type = COALESCE($1, payment_type),
        description = COALESCE($2, description),
        planned_amount = COALESCE($3, planned_amount),
        actual_amount = COALESCE($4, actual_amount),
        planned_date = COALESCE($5, planned_date),
        actual_date = COALESCE($6, actual_date),
        status = COALESCE($7, status),
        recipient = COALESCE($8, recipient),
        notes = COALESCE($9, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const result = await db.query(query, [
      paymentData.paymentType,
      paymentData.description,
      paymentData.plannedAmount,
      paymentData.actualAmount,
      paymentData.plannedDate,
      paymentData.actualDate,
      paymentData.status,
      paymentData.recipient,
      paymentData.notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment data not found' });
    }

    res.json({
      success: true,
      message: 'Payment data updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating payment data:', error);
    res.status(500).json({
      error: 'Failed to update payment data',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/calculations/payments/:id
 * Delete payment data item
 */
router.delete('/payments/:id', async (req: Request, res: Response) => {
  const db: Pool = req.app.get('db');
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM payment_data WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment data not found' });
    }

    res.json({
      success: true,
      message: 'Payment data deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting payment data:', error);
    res.status(500).json({
      error: 'Failed to delete payment data',
      details: error.message
    });
  }
});

export default router;
