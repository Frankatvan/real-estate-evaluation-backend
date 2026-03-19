import { Pool } from 'pg';
import {
  CalculationInput,
  FullCalculationOutput,
  CalculationParameters,
  InvestmentSummary,
  SalesRevenueResult,
  RentalIncomeResult,
  OperatingExpensesResult,
  NOIResult,
  DebtServiceResult,
  CashFlowItem,
  WBGIncomeResult,
  ReturnMetrics,
  CalculationResult
} from '../models/Calculation';
import { XIRRCalculator, CashFlow } from '../utils/xirr';
import {
  LOAN_CONSTANTS,
  EXPENSE_RATIOS,
  INCOME_CONSTANTS,
  CASH_FLOW_CONSTANTS,
  RETURN_METRICS_CONSTANTS,
  DEFAULT_PARAMETERS
} from '../constants/calculationConstants';

/**
 * Database field mapping utilities
 * Convert snake_case database fields to camelCase TypeScript interfaces
 */

/**
 * Map calculation parameters from database row to TypeScript interface
 */
function mapCalculationParameters(dbRow: any): CalculationParameters {
  return {
    benchmarkSellingPrice: dbRow.benchmark_selling_price || DEFAULT_PARAMETERS.BENCHMARK_SELLING_PRICE,
    wbgIncomeCalculationMethod: dbRow.wbg_income_calculation_method || DEFAULT_PARAMETERS.WBG_INCOME_CALCULATION_METHOD,
    loanInterestRate: dbRow.loan_interest_rate || DEFAULT_PARAMETERS.LOAN_INTEREST_RATE,
    terminalValue: dbRow.terminal_value || DEFAULT_PARAMETERS.TERMINAL_VALUE,
    fiveYearValue: dbRow.five_year_value || DEFAULT_PARAMETERS.FIVE_YEAR_VALUE,
    restenantsCostRate: dbRow.restenants_cost_rate || DEFAULT_PARAMETERS.RESTENANTS_COST_RATE,
    salesCommissionFixed: dbRow.sales_commission_fixed || DEFAULT_PARAMETERS.SALES_COMMISSION_FIXED,
    salesCommissionRate: dbRow.sales_commission_rate || DEFAULT_PARAMETERS.SALES_COMMISSION_RATE,
    vacancyRate: dbRow.vacancy_rate || DEFAULT_PARAMETERS.VACANCY_RATE
  };
}

/**
 * Map sales data from database row to TypeScript interface
 */
function mapSalesData(dbRow: any): any {
  return {
    ...dbRow,
    actualPrice: dbRow.actual_price,
    expectedPrice: dbRow.expected_price,
    unitId: dbRow.unit_id,
    buyerName: dbRow.buyer_name,
    saleDate: dbRow.sale_date,
    contractAmount: dbRow.contract_amount
  };
}

/**
 * Map construction data from database row to TypeScript interface
 */
function mapConstructionData(dbRow: any): any {
  return {
    ...dbRow,
    categoryId: dbRow.category_id,
    itemName: dbRow.item_name,
    budgetAmount: dbRow.budget_amount,
    actualAmount: dbRow.actual_amount,
    paymentTerm: dbRow.payment_term,
    supplierName: dbRow.supplier_name
  };
}

/**
 * Map units data from database row to TypeScript interface
 */
function mapUnitsData(dbRow: any): any {
  return {
    ...dbRow,
    unitNumber: dbRow.unit_number,
    unitType: dbRow.unit_type,
    floorNumber: dbRow.floor_number,
    areaSize: dbRow.area_size,
    sellingPrice: dbRow.selling_price
  };
}

/**
 * Map tenants data from database row to TypeScript interface
 */
function mapTenantsData(dbRow: any): any {
  return {
    ...dbRow,
    tenantName: dbRow.tenant_name,
    unitNumber: dbRow.unit_number,
    monthlyRent: dbRow.monthly_rent,
    leaseStartDate: dbRow.lease_start_date,
    leaseEndDate: dbRow.lease_end_date,
    depositAmount: dbRow.deposit_amount
  };
}

/**
 * Calculation Service
 * Handles all financial calculations for real estate evaluation
 */
export class CalculationService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Load all data needed for calculation
   */
  async loadCalculationData(versionId: number): Promise<CalculationInput> {
    const [parametersResult, salesResult, constructionResult, unitsResult, tenantsResult, planResult] = await Promise.all([
      this.db.query('SELECT * FROM calculation_parameters WHERE version_id = $1', [versionId]),
      this.db.query('SELECT * FROM sales_data WHERE version_id = $1', [versionId]),
      this.db.query('SELECT * FROM construction_data WHERE version_id = $1', [versionId]),
      this.db.query('SELECT * FROM units_data WHERE version_id = $1', [versionId]),
      this.db.query('SELECT * FROM tenants_data WHERE version_id = $1', [versionId]),
      this.db.query('SELECT * FROM plan_data WHERE version_id = $1', [versionId])
    ]);

    // Map database rows to TypeScript interfaces
    const parameters = mapCalculationParameters(parametersResult.rows[0]);
    const salesData = salesResult.rows.map(mapSalesData);
    const constructionData = constructionResult.rows.map(mapConstructionData);
    const unitsData = unitsResult.rows.map(mapUnitsData);
    const tenantsData = tenantsResult.rows.map(mapTenantsData);
    const planData = planResult.rows; // Plan data doesn't need mapping as-is

    return {
      versionId,
      parameters,
      salesData,
      constructionData,
      unitsData,
      tenantsData,
      planData
    };
  }

  /**
   * Calculate total investment
   */
  private calculateInvestment(input: CalculationInput): InvestmentSummary {
    const totalConstructionCost = input.constructionData.reduce((sum, item) => sum + Number(item.amount), 0);
    const loanAmount = totalConstructionCost * LOAN_CONSTANTS.DEFAULT_LOAN_TO_VALUE_RATIO;
    const equityInvestment = totalConstructionCost - loanAmount;

    return {
      totalInvestment: totalConstructionCost,
      equityInvestment,
      debtInvestment: loanAmount,
      loanToValue: LOAN_CONSTANTS.DEFAULT_LOAN_TO_VALUE_RATIO
    };
  }

  /**
   * Calculate sales revenue
   */
  private calculateSalesRevenue(input: CalculationInput): SalesRevenueResult {
    let totalRevenue = 0;
    let unitsSold = 0;

    for (const sale of input.salesData) {
      const price = sale.actualPrice || sale.expectedPrice || input.parameters.benchmarkSellingPrice;
      totalRevenue += price;
      if (sale.actualPrice) {
        unitsSold++;
      }
    }

    const averagePrice = unitsSold > 0 ? totalRevenue / unitsSold : input.parameters.benchmarkSellingPrice;
    const commissionAmount = totalRevenue * input.parameters.salesCommissionRate + input.parameters.salesCommissionFixed;

    return {
      totalRevenue,
      unitsSold,
      averagePrice,
      commissionAmount
    };
  }

  /**
   * Calculate rental income
   */
  private calculateRentalIncome(input: CalculationInput): RentalIncomeResult {
    let grossIncome = 0;
    let occupiedUnits = 0;

    for (const tenant of input.tenantsData) {
      grossIncome += Number(tenant.monthlyRent) * 12; // Annualize
      occupiedUnits++;
    }

    const totalUnits = input.unitsData.length;
    const vacancyLoss = grossIncome * input.parameters.vacancyRate;
    const effectiveIncome = grossIncome - vacancyLoss;

    return {
      grossIncome,
      vacancyLoss,
      effectiveIncome,
      occupiedUnits,
      totalUnits
    };
  }

  /**
   * Calculate operating expenses
   */
  private calculateOperatingExpenses(input: CalculationInput, rentalIncome: RentalIncomeResult): OperatingExpensesResult {
    const totalExpenses = rentalIncome.effectiveIncome * EXPENSE_RATIOS.DEFAULT_OPERATING_EXPENSE_RATIO;

    return {
      totalExpenses,
      breakdown: {
        propertyManagement: totalExpenses * EXPENSE_RATIOS.PROPERTY_MANAGEMENT_RATIO,
        maintenance: totalExpenses * EXPENSE_RATIOS.MAINTENANCE_RATIO,
        insurance: totalExpenses * EXPENSE_RATIOS.INSURANCE_RATIO,
        taxes: totalExpenses * EXPENSE_RATIOS.TAXES_RATIO,
        utilities: totalExpenses * EXPENSE_RATIOS.UTILITIES_RATIO,
        other: totalExpenses * EXPENSE_RATIOS.OTHER_EXPENSE_RATIO
      }
    };
  }

  /**
   * Calculate Net Operating Income (NOI)
   */
  private calculateNOI(rentalIncome: RentalIncomeResult, operatingExpenses: OperatingExpensesResult): NOIResult {
    const netOperatingIncome = rentalIncome.effectiveIncome - operatingExpenses.totalExpenses;
    const noiRate = rentalIncome.effectiveIncome > 0 ? netOperatingIncome / rentalIncome.effectiveIncome : 0;

    return {
      grossIncome: rentalIncome.effectiveIncome,
      operatingExpenses: operatingExpenses.totalExpenses,
      netOperatingIncome,
      noiRate
    };
  }

  /**
   * Calculate debt service
   */
  private calculateDebtService(input: CalculationInput, investment: InvestmentSummary): DebtServiceResult {
    const loanAmount = investment.debtInvestment;
    const interestRate = input.parameters.loanInterestRate;
    const term = LOAN_CONSTANTS.DEFAULT_LOAN_TERM_YEARS;

    // Calculate annual payment using mortgage formula
    const monthlyRate = interestRate / 12;
    const numberOfPayments = term * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    const annualPayment = monthlyPayment * 12;

    // Calculate interest and principal for first year
    const interestPayment = loanAmount * interestRate;
    const principalPayment = annualPayment - interestPayment;
    const remainingBalance = loanAmount - principalPayment;

    return {
      annualPayment,
      principalPayment,
      interestPayment,
      remainingBalance
    };
  }

  /**
   * Calculate WBG income
   */
  private calculateWBGIncome(input: CalculationInput, salesRevenue: SalesRevenueResult): WBGIncomeResult {
    const salesCommission = salesRevenue.commissionAmount;

    let managementFee = 0;
    if (input.parameters.wbgIncomeCalculationMethod === 'DIFFERENCE') {
      // Calculate based on difference between expected and actual
      managementFee = input.salesData.reduce((sum, sale) => {
        if (sale.actualPrice && sale.expectedPrice) {
          return sum + Math.max(0, sale.expectedPrice - sale.actualPrice);
        }
        return sum;
      }, 0) * INCOME_CONSTANTS.MANAGEMENT_FEE_SAVINGS_RATIO;
    } else {
      // Direct method: percentage of total revenue
      managementFee = salesRevenue.totalRevenue * INCOME_CONSTANTS.MANAGEMENT_FEE_DIRECT_RATIO;
    }

    const otherIncome = salesRevenue.totalRevenue * INCOME_CONSTANTS.OTHER_INCOME_RATIO;

    return {
      totalIncome: salesCommission + managementFee + otherIncome,
      breakdown: {
        salesCommission,
        managementFee,
        otherIncome
      }
    };
  }

  /**
   * Calculate cash flows for multiple years
   */
  private calculateCashFlows(
    input: CalculationInput,
    investment: InvestmentSummary,
    salesRevenue: SalesRevenueResult,
    rentalIncome: RentalIncomeResult,
    operatingExpenses: OperatingExpensesResult,
    noi: NOIResult,
    debtService: DebtServiceResult,
    wbgIncome: WBGIncomeResult
  ): CashFlowItem[] {
    const cashFlows: CashFlowItem[] = [];
    const years = CASH_FLOW_CONSTANTS.DEFAULT_PROJECTION_YEARS;

    for (let year = 1; year <= years; year++) {
      // Assume sales occur in early years
      const salesRevenueYear = year <= CASH_FLOW_CONSTANTS.SALES_REVENUE_DISTRIBUTION_YEARS
        ? salesRevenue.totalRevenue / CASH_FLOW_CONSTANTS.SALES_REVENUE_DISTRIBUTION_YEARS
        : 0;

      // Rental income grows at annual rate
      const rentalIncomeYear = rentalIncome.effectiveIncome * Math.pow(1 + CASH_FLOW_CONSTANTS.DEFAULT_ANNUAL_GROWTH_RATE, year - 1);

      // Operating expenses grow at annual rate
      const operatingExpensesYear = operatingExpenses.totalExpenses * Math.pow(1 + CASH_FLOW_CONSTANTS.DEFAULT_ANNUAL_GROWTH_RATE, year - 1);

      // NOI
      const noiYear = rentalIncomeYear - operatingExpensesYear;

      // Debt service (constant for simplicity)
      const debtServiceYear = debtService.annualPayment;

      // Project cash flow
      const projectCashFlow = noiYear + salesRevenueYear - (year === 1 ? investment.totalInvestment : 0);

      // Fund cash flow (after debt service)
      const fundCashFlow = projectCashFlow - debtServiceYear;

      // Investor cash flow (after WBG income)
      const wbgIncomeYear = wbgIncome.totalIncome * (year <= INCOME_CONSTANTS.WBG_DISTRIBUTION_PERIOD_YEARS
        ? 1 / INCOME_CONSTANTS.WBG_DISTRIBUTION_PERIOD_YEARS
        : 0);
      const investorCashFlow = fundCashFlow - wbgIncomeYear;

      cashFlows.push({
        year,
        projectCashFlow,
        fundCashFlow,
        investorCashFlow
      });
    }

    return cashFlows;
  }

  /**
   * Calculate return metrics
   */
  private calculateReturnMetrics(
    cashFlows: CashFlowItem[],
    investment: InvestmentSummary
  ): ReturnMetrics {
    // Prepare cash flows for XIRR calculation
    const xirrCashFlows: CashFlow[] = [
      { amount: -investment.equityInvestment, date: new Date() }
    ];

    const baseDate = new Date();
    for (const cf of cashFlows) {
      const yearDate = new Date(baseDate);
      yearDate.setFullYear(baseDate.getFullYear() + cf.year);
      xirrCashFlows.push({
        amount: cf.investorCashFlow,
        date: yearDate
      });
    }

    // Calculate XIRR
    const xirrResult = XIRRCalculator.calculateXIRR(xirrCashFlows);

    // Calculate NPV at default discount rate
    const discountRate = RETURN_METRICS_CONSTANTS.DEFAULT_DISCOUNT_RATE;
    const npvCashFlows = xirrCashFlows.slice(1); // Remove initial investment
    const xnpvResult = XIRRCalculator.calculateXNPV(discountRate, npvCashFlows);
    const npv = xnpvResult.npv - investment.equityInvestment;

    // Calculate payback period
    const paybackPeriod = XIRRCalculator.calculatePaybackPeriod(xirrCashFlows);

    // Calculate discounted payback period
    const discountedPaybackPeriod = XIRRCalculator.calculateDiscountedPaybackPeriod(xirrCashFlows, discountRate);

    // Calculate MIRR
    const financeRate = RETURN_METRICS_CONSTANTS.DEFAULT_FINANCE_RATE;
    const reinvestRate = RETURN_METRICS_CONSTANTS.DEFAULT_REINVEST_RATE;
    const mirr = XIRRCalculator.calculateMIRR(xirrCashFlows, financeRate, reinvestRate);

    // Calculate ROI
    const totalReturn = cashFlows.reduce((sum, cf) => sum + cf.investorCashFlow, 0);
    const roi = (totalReturn - investment.equityInvestment) / investment.equityInvestment;

    return {
      irr: xirrResult.irr,
      xirr: xirrResult.irr,
      npv,
      paybackPeriod,
      discountedPaybackPeriod,
      mirr,
      roi
    };
  }

  /**
   * Perform full calculation
   */
  async performCalculation(versionId: number): Promise<FullCalculationOutput> {
    // Load data
    const input = await this.loadCalculationData(versionId);

    // Calculate components
    const investment = this.calculateInvestment(input);
    const salesRevenue = this.calculateSalesRevenue(input);
    const rentalIncome = this.calculateRentalIncome(input);
    const operatingExpenses = this.calculateOperatingExpenses(input, rentalIncome);
    const noi = this.calculateNOI(rentalIncome, operatingExpenses);
    const debtService = this.calculateDebtService(input, investment);
    const wbgIncome = this.calculateWBGIncome(input, salesRevenue);
    const cashFlows = this.calculateCashFlows(
      input,
      investment,
      salesRevenue,
      rentalIncome,
      operatingExpenses,
      noi,
      debtService,
      wbgIncome
    );
    const returns = this.calculateReturnMetrics(cashFlows, investment);

    // Generate yearly results
    const yearlyResults: CalculationResult[] = cashFlows.map(cf => ({
      year: cf.year,
      projectCashFlow: cf.projectCashFlow,
      fundCashFlow: cf.fundCashFlow,
      investorCashFlow: cf.investorCashFlow,
      projectIrr: returns.irr,
      fundIrr: returns.irr * RETURN_METRICS_CONSTANTS.FUND_IRR_MULTIPLIER,
      investorIrr: returns.xirr,
      wbgIncome: wbgIncome.totalIncome / INCOME_CONSTANTS.WBG_DISTRIBUTION_PERIOD_YEARS,
      terminalValue: input.parameters.terminalValue,
      npv: returns.npv
    }));

    const output: FullCalculationOutput = {
      versionId,
      parameters: input.parameters,
      investment,
      salesRevenue,
      rentalIncome,
      operatingExpenses,
      noi,
      debtService,
      cashFlows,
      wbgIncome,
      returns,
      yearlyResults,
      calculatedAt: new Date()
    };

    return output;
  }

  /**
   * Save calculation results to database
   */
  async saveCalculationResults(versionId: number, output: FullCalculationOutput): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Delete existing results
      await client.query('DELETE FROM calculation_results WHERE version_id = $1', [versionId]);

      // Insert new results
      for (const result of output.yearlyResults) {
        const query = `
          INSERT INTO calculation_results (
            version_id, year, project_cash_flow, fund_cash_flow, investor_cash_flow,
            project_irr, fund_irr, investor_irr, wbg_income, terminal_value, npv
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await client.query(query, [
          versionId,
          result.year,
          result.projectCashFlow,
          result.fundCashFlow,
          result.investorCashFlow,
          result.projectIrr,
          result.fundIrr,
          result.investorIrr,
          result.wbgIncome,
          result.terminalValue,
          result.npv
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run calculation and save results
   */
  async runCalculation(versionId: number): Promise<FullCalculationOutput> {
    const output = await this.performCalculation(versionId);
    await this.saveCalculationResults(versionId, output);
    return output;
  }

  /**
   * Get calculation results from database
   */
  async getCalculationResults(versionId: number): Promise<CalculationResult[]> {
    const result = await this.db.query(
      'SELECT * FROM calculation_results WHERE version_id = $1 ORDER BY year',
      [versionId]
    );

    return result.rows.map((row: any) => ({
      year: row.year,
      projectCashFlow: Number(row.project_cash_flow),
      fundCashFlow: Number(row.fund_cash_flow),
      investorCashFlow: Number(row.investor_cash_flow),
      projectIrr: Number(row.project_irr),
      fundIrr: Number(row.fund_irr),
      investorIrr: Number(row.investor_irr),
      wbgIncome: Number(row.wbg_income),
      terminalValue: Number(row.terminal_value),
      npv: Number(row.npv)
    }));
  }
}

export default CalculationService;
