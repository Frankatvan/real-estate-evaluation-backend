import { Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CalculationService } from '../services/CalculationService';
import { ControllerResponse, asyncHandler } from '../types/controller';

/**
 * Calculation Controller
 * Handles calculation-related business logic
 */

export class CalculationController {
  private calculationService: CalculationService;

  constructor(db: Pool) {
    this.calculationService = new CalculationService(db);
  }

  /**
   * Get calculation parameters for a specific version
   */
  getParameters = async (req: any, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { versionId } = req.params;
      const db: Pool = req.app.get('db');

      const result = await db.query(
        'SELECT * FROM calculation_parameters WHERE version_id = $1',
        [versionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Calculation parameters not found'
        });
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

      return res.json(parameters);
    });
  };

  /**
   * Update calculation parameters for a specific version
   */
  updateParameters = async (req: any, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { versionId } = req.params;
      const parameters = req.body;
      const db: Pool = req.app.get('db');

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
        return res.status(404).json({
          success: false,
          error: 'Calculation parameters not found'
        });
      }

      return res.json({
        success: true,
        message: 'Calculation parameters updated successfully',
        data: result.rows[0]
      });
    });
  };

  /**
   * Execute calculation for a specific version
   */
  executeCalculation = async (req: any, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { versionId } = req.params;
      const results = await this.calculationService.runCalculation(parseInt(versionId));

      return res.json({
        success: true,
        message: 'Calculation executed successfully',
        data: results
      });
    });
  };

  /**
   * Get calculation results for a specific version
   */
  getResults = async (req: any, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { versionId } = req.params;
      const results = await this.calculationService.getCalculationResults(parseInt(versionId));

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No calculation results found'
        });
      }

      return res.json({
        success: true,
        data: results
      });
    });
  };

  /**
   * Get full calculation results including all details
   */
  getFullResults = async (req: any, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { versionId } = req.params;
      const results = await this.calculationService.performCalculation(parseInt(versionId));

      return res.json({
        success: true,
        data: results
      });
    });
  };

  /**
   * Get dashboard data for calculation results
   */
  getDashboardData = async (req: any, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { versionId } = req.params;
      const results = await this.calculationService.performCalculation(parseInt(versionId));

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
        cashFlows: results.yearlyResults.map((year: any) => ({
          year: year.year,
          projectCashFlow: year.projectCashFlow,
          fundCashFlow: year.fundCashFlow,
          investorCashFlow: year.investorCashFlow
        })),
        parameters: results.parameters,
        calculatedAt: results.calculatedAt
      };

      return res.json({
        success: true,
        data: dashboardData
      });
    });
  };
}