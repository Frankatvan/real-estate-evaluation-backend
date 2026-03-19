/**
 * Calculation Parameters Model
 */
export interface CalculationParameters {
  benchmarkSellingPrice: number;
  wbgIncomeCalculationMethod: 'DIFFERENCE' | 'DIRECT';
  loanInterestRate: number;
  terminalValue: number;
  fiveYearValue: number;
  restenantsCostRate: number;
  salesCommissionFixed: number;
  salesCommissionRate: number;
  vacancyRate: number;
}

/**
 * Cash Flow Item
 */
export interface CashFlowItem {
  year: number;
  projectCashFlow: number;
  fundCashFlow: number;
  investorCashFlow: number;
}

/**
 * Calculation Result
 */
export interface CalculationResult {
  year: number;
  projectCashFlow: number;
  fundCashFlow: number;
  investorCashFlow: number;
  projectIrr: number;
  fundIrr: number;
  investorIrr: number;
  wbgIncome: number;
  terminalValue: number;
  npv: number;
}

/**
 * WBG Income Calculation Result
 */
export interface WBGIncomeResult {
  totalIncome: number;
  breakdown: {
    salesCommission: number;
    managementFee: number;
    otherIncome: number;
  };
}

/**
 * Sales Revenue Calculation Result
 */
export interface SalesRevenueResult {
  totalRevenue: number;
  unitsSold: number;
  averagePrice: number;
  commissionAmount: number;
}

/**
 * Rental Income Calculation Result
 */
export interface RentalIncomeResult {
  grossIncome: number;
  vacancyLoss: number;
  effectiveIncome: number;
  occupiedUnits: number;
  totalUnits: number;
}

/**
 * Operating Expenses Calculation Result
 */
export interface OperatingExpensesResult {
  totalExpenses: number;
  breakdown: {
    propertyManagement: number;
    maintenance: number;
    insurance: number;
    taxes: number;
    utilities: number;
    other: number;
  };
}

/**
 * NOI (Net Operating Income) Calculation Result
 */
export interface NOIResult {
  grossIncome: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  noiRate: number;
}

/**
 * Debt Service Calculation Result
 */
export interface DebtServiceResult {
  annualPayment: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

/**
 * Cash Flow Calculation Result
 */
export interface CashFlowResult {
  noi: number;
  debtService: number;
  beforeTaxCashFlow: number;
  capitalExpenditures: number;
  afterTaxCashFlow: number;
}

/**
 * Investment Summary
 */
export interface InvestmentSummary {
  totalInvestment: number;
  equityInvestment: number;
  debtInvestment: number;
  loanToValue: number;
}

/**
 * Return Metrics
 */
export interface ReturnMetrics {
  irr: number;
  xirr: number;
  npv: number;
  paybackPeriod: number;
  discountedPaybackPeriod: number;
  mirr: number;
  roi: number;
}

/**
 * Full Calculation Output
 */
export interface FullCalculationOutput {
  versionId: number;
  parameters: CalculationParameters;
  investment: InvestmentSummary;
  salesRevenue: SalesRevenueResult;
  rentalIncome: RentalIncomeResult;
  operatingExpenses: OperatingExpensesResult;
  noi: NOIResult;
  debtService: DebtServiceResult;
  cashFlows: CashFlowItem[];
  wbgIncome: WBGIncomeResult;
  returns: ReturnMetrics;
  yearlyResults: CalculationResult[];
  calculatedAt: Date;
}

/**
 * Calculation Input Data
 */
export interface CalculationInput {
  versionId: number;
  parameters: CalculationParameters;
  salesData: Array<{
    unitCode: string;
    actualPrice: number;
    expectedPrice: number;
    closingDate: Date | null;
  }>;
  constructionData: Array<{
    unitCode: string;
    costCode: string;
    amount: number;
    clearDate: Date | null;
    dueDate: Date | null;
    isCleared: boolean;
  }>;
  unitsData: Array<{
    unitCode: string;
    unitType: string;
    area: number;
    status: string;
  }>;
  tenantsData: Array<{
    unitCode: string;
    tenantName: string;
    leaseStartDate: Date;
    leaseEndDate: Date;
    monthlyRent: number;
    rentalDeposit: number;
  }>;
  planData: Array<{
    unitCode: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    plannedCost: number;
    phase: string;
  }>;
}
