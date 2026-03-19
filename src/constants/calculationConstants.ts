/**
 * Calculation Constants
 * Default values and rates used in financial calculations
 */

/**
 * Loan and Financing Constants
 */
export const LOAN_CONSTANTS = {
  DEFAULT_LOAN_TO_VALUE_RATIO: 0.7, // 70% LTV
  DEFAULT_LOAN_TERM_YEARS: 30, // 30-year loan
  DEFAULT_INTEREST_RATE: 0.05 // 5% annual interest rate
} as const;

/**
 * Expense Ratios
 */
export const EXPENSE_RATIOS = {
  DEFAULT_OPERATING_EXPENSE_RATIO: 0.30, // 30% of effective rental income
  PROPERTY_MANAGEMENT_RATIO: 0.25, // 25% of total expenses
  MAINTENANCE_RATIO: 0.30, // 30% of total expenses
  INSURANCE_RATIO: 0.15, // 15% of total expenses
  TAXES_RATIO: 0.20, // 20% of total expenses
  UTILITIES_RATIO: 0.05, // 5% of total expenses
  OTHER_EXPENSE_RATIO: 0.05 // 5% of total expenses
} as const;

/**
 * Income Calculation Constants
 */
export const INCOME_CONSTANTS = {
  MANAGEMENT_FEE_SAVINGS_RATIO: 0.10, // 10% of savings (difference method)
  MANAGEMENT_FEE_DIRECT_RATIO: 0.05, // 5% of total revenue (direct method)
  OTHER_INCOME_RATIO: 0.01, // 1% of total revenue
  WBG_DISTRIBUTION_PERIOD_YEARS: 3, // Spread WBG income over 3 years
  SALES_DISTRIBUTION_PERIOD_YEARS: 3 // Spread sales revenue over 3 years
} as const;

/**
 * Cash Flow Projection Constants
 */
export const CASH_FLOW_CONSTANTS = {
  DEFAULT_PROJECTION_YEARS: 10, // 10-year projection
  DEFAULT_ANNUAL_GROWTH_RATE: 0.02, // 2% annual growth rate
  SALES_REVENUE_DISTRIBUTION_YEARS: 3 // Distribute sales revenue over 3 years
} as const;

/**
 * Return Metrics Constants
 */
export const RETURN_METRICS_CONSTANTS = {
  DEFAULT_DISCOUNT_RATE: 0.08, // 8% discount rate for NPV
  DEFAULT_FINANCE_RATE: 0.05, // 5% finance rate for MIRR
  DEFAULT_REINVEST_RATE: 0.08, // 8% reinvest rate for MIRR
  FUND_IRR_MULTIPLIER: 0.8 // Fund gets 80% of project IRR
} as const;

/**
 * Default Parameter Values
 */
export const DEFAULT_PARAMETERS = {
  BENCHMARK_SELLING_PRICE: 300000,
  WBG_INCOME_CALCULATION_METHOD: 'DIFFERENCE',
  LOAN_INTEREST_RATE: 0.05,
  TERMINAL_VALUE: 0,
  FIVE_YEAR_VALUE: 5572101.85,
  RESTENANTS_COST_RATE: 0.30,
  SALES_COMMISSION_FIXED: 10000,
  SALES_COMMISSION_RATE: 0.08,
  VACANCY_RATE: 0.10
} as const;

/**
 * Validation Constants
 */
export const VALIDATION_CONSTANTS = {
  NPV_TOLERANCE: 0.01, // Tolerance for NPV validation
  MIN_IRR: -1.0, // Minimum valid IRR (-100%)
  MAX_IRR: 10.0, // Maximum valid IRR (1000%)
  MIN_CASH_FLOW: -1000000000, // Minimum reasonable cash flow
  MAX_CASH_FLOW: 1000000000 // Maximum reasonable cash flow
} as const;
