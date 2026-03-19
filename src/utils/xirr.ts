/**
 * Cash flow interface for XIRR/XNPV calculations
 */
export interface CashFlow {
  amount: number;
  date: Date;
}

/**
 * XIRR Calculation Result
 */
export interface XIRRResult {
  irr: number;
  iterations: number;
  converged: boolean;
}

/**
 * XNPV Calculation Result
 */
export interface XNPVResult {
  npv: number;
  rate: number;
}

/**
 * XIRR and XNPV Calculation Utilities
 * Implements financial calculations for irregular cash flows
 */
export class XIRRCalculator {
  private static readonly MAX_ITERATIONS = 100;
  private static readonly TOLERANCE = 1e-6;
  private static readonly INITIAL_GUESS = 0.1;

  /**
   * Calculate the number of days between two dates
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  }

  /**
   * Calculate XIRR (Internal Rate of Return for irregular cash flows)
   * Uses Newton-Raphson method to find the rate that makes NPV = 0
   *
   * @param cashFlows Array of cash flows with dates
   * @param guess Initial guess for the rate (default 0.1)
   * @returns XIRR result with rate and convergence info
   */
  static calculateXIRR(cashFlows: CashFlow[], guess: number = this.INITIAL_GUESS): XIRRResult {
    if (cashFlows.length < 2) {
      throw new Error('XIRR requires at least 2 cash flows');
    }

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedFlows[0].date;

    let rate = guess;
    let iterations = 0;
    let converged = false;

    for (iterations = 0; iterations < this.MAX_ITERATIONS; iterations++) {
      let npv = 0;
      let dnpv = 0;

      for (const flow of sortedFlows) {
        const days = this.daysBetween(flow.date, startDate);
        const time = days / 365.0;
        const discountFactor = Math.pow(1 + rate, time);
        npv += flow.amount / discountFactor;
        dnpv -= (time * flow.amount) / (discountFactor * (1 + rate));
      }

      // Check if we've converged
      if (Math.abs(npv) < this.TOLERANCE) {
        converged = true;
        break;
      }

      // Avoid division by zero
      if (Math.abs(dnpv) < this.TOLERANCE) {
        break;
      }

      // Newton-Raphson step
      const newRate = rate - npv / dnpv;

      // Check for convergence
      if (Math.abs(newRate - rate) < this.TOLERANCE) {
        rate = newRate;
        converged = true;
        break;
      }

      rate = newRate;

      // Prevent infinite oscillation
      if (Math.abs(rate) > 100) {
        break;
      }
    }

    return {
      irr: rate,
      iterations,
      converged
    };
  }

  /**
   * Calculate XNPV (Net Present Value for irregular cash flows)
   *
   * @param rate Discount rate
   * @param cashFlows Array of cash flows with dates
   * @returns XNPV result with NPV value
   */
  static calculateXNPV(rate: number, cashFlows: CashFlow[]): XNPVResult {
    if (cashFlows.length === 0) {
      throw new Error('XNPV requires at least 1 cash flow');
    }

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedFlows[0].date;

    let npv = 0;

    for (const flow of sortedFlows) {
      const days = this.daysBetween(flow.date, startDate);
      const time = days / 365.0;
      const discountFactor = Math.pow(1 + rate, time);
      npv += flow.amount / discountFactor;
    }

    return {
      npv,
      rate
    };
  }

  /**
   * Calculate MIRR (Modified Internal Rate of Return)
   *
   * @param cashFlows Array of cash flows with dates
   * @param financeRate Cost of borrowing rate
   * @param reinvestRate Reinvestment rate
   * @returns MIRR value
   */
  static calculateMIRR(
    cashFlows: CashFlow[],
    financeRate: number,
    reinvestRate: number
  ): number {
    if (cashFlows.length < 2) {
      throw new Error('MIRR requires at least 2 cash flows');
    }

    // Separate negative and positive cash flows
    const negativeFlows: CashFlow[] = [];
    const positiveFlows: CashFlow[] = [];

    for (const flow of cashFlows) {
      if (flow.amount < 0) {
        negativeFlows.push(flow);
      } else {
        positiveFlows.push(flow);
      }
    }

    if (negativeFlows.length === 0 || positiveFlows.length === 0) {
      throw new Error('MIRR requires both positive and negative cash flows');
    }

    // Sort by date
    negativeFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
    positiveFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

    const startDate = negativeFlows[0].date;
    const endDate = positiveFlows[positiveFlows.length - 1].date;

    // Calculate present value of negative cash flows
    let pvNegative = 0;
    for (const flow of negativeFlows) {
      const days = this.daysBetween(flow.date, startDate);
      const time = days / 365.0;
      pvNegative += flow.amount / Math.pow(1 + financeRate, time);
    }

    // Calculate future value of positive cash flows
    let fvPositive = 0;
    for (const flow of positiveFlows) {
      const daysToEnd = this.daysBetween(endDate, flow.date);
      const time = daysToEnd / 365.0;
      fvPositive += flow.amount * Math.pow(1 + reinvestRate, time);
    }

    // Calculate total time period
    const totalDays = this.daysBetween(endDate, startDate);
    const totalTime = totalDays / 365.0;

    // Calculate MIRR
    const mirr = Math.pow(fvPositive / Math.abs(pvNegative), 1 / totalTime) - 1;

    return mirr;
  }

  /**
   * Calculate payback period
   *
   * @param cashFlows Array of cash flows with dates
   * @returns Payback period in years
   */
  static calculatePaybackPeriod(cashFlows: CashFlow[]): number {
    if (cashFlows.length === 0) {
      throw new Error('Payback period requires at least 1 cash flow');
    }

    // Sort by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedFlows[0].date;

    let cumulativeCashFlow = 0;

    for (let i = 0; i < sortedFlows.length; i++) {
      const flow = sortedFlows[i];
      cumulativeCashFlow += flow.amount;

      if (cumulativeCashFlow >= 0) {
        // Payback achieved
        const days = this.daysBetween(flow.date, startDate);
        return days / 365.0;
      }
    }

    // Payback not achieved
    return -1;
  }

  /**
   * Calculate discounted payback period
   *
   * @param cashFlows Array of cash flows with dates
   * @param rate Discount rate
   * @returns Discounted payback period in years
   */
  static calculateDiscountedPaybackPeriod(cashFlows: CashFlow[], rate: number): number {
    if (cashFlows.length === 0) {
      throw new Error('Discounted payback period requires at least 1 cash flow');
    }

    // Sort by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedFlows[0].date;

    let cumulativeCashFlow = 0;

    for (let i = 0; i < sortedFlows.length; i++) {
      const flow = sortedFlows[i];
      const days = this.daysBetween(flow.date, startDate);
      const time = days / 365.0;
      const discountedAmount = flow.amount / Math.pow(1 + rate, time);

      cumulativeCashFlow += discountedAmount;

      if (cumulativeCashFlow >= 0) {
        // Payback achieved
        return days / 365.0;
      }
    }

    // Payback not achieved
    return -1;
  }

  /**
   * Validate cash flows for XIRR calculation
   *
   * @param cashFlows Array of cash flows
   * @returns Validation result with errors if any
   */
  static validateCashFlows(cashFlows: CashFlow[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (cashFlows.length < 2) {
      errors.push('At least 2 cash flows are required');
    }

    let hasPositive = false;
    let hasNegative = false;

    for (let i = 0; i < cashFlows.length; i++) {
      const flow = cashFlows[i];

      if (isNaN(flow.amount)) {
        errors.push(`Cash flow ${i + 1}: Amount is not a number`);
      }

      if (!(flow.date instanceof Date) || isNaN(flow.date.getTime())) {
        errors.push(`Cash flow ${i + 1}: Invalid date`);
      }

      if (flow.amount > 0) {
        hasPositive = true;
      } else if (flow.amount < 0) {
        hasNegative = true;
      }
    }

    if (!hasPositive || !hasNegative) {
      errors.push('Cash flows must include both positive and negative values');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate annualized return
   *
   * @param totalReturn Total return over the period
   * @param days Number of days in the period
   * @returns Annualized return rate
   */
  static annualizeReturn(totalReturn: number, days: number): number {
    if (days <= 0) {
      throw new Error('Days must be positive');
    }

    const years = days / 365.0;
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }
}

export default XIRRCalculator;
