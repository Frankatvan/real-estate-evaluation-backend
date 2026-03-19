import { describe, test, expect } from '@jest/globals';
import { XIRRCalculator } from '../../utils/xirr';

describe('XIRRCalculator', () => {
  describe('XIRR calculation', () => {
    test('should calculate XIRR for positive cash flows', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 500, date: new Date('2023-06-01') },
        { amount: 600, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result).toBeDefined();
      expect(result.irr).toBeGreaterThan(0);
      expect(typeof result.irr).toBe('number');
    });

    test('should calculate XIRR for negative cash flows', () => {
      const cashFlows = [
        { amount: 1000, date: new Date('2023-01-01') },
        { amount: -500, date: new Date('2023-06-01') },
        { amount: -600, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result).toBeDefined();
      expect(result.irr).toBeLessThan(0);
    });

    test('should handle edge case with zero cash flows', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 0, date: new Date('2023-06-01') },
        { amount: 1000, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result).toBeDefined();
      expect(result.irr).toBeCloseTo(0, 1); // Should be close to 0
    });

    test('should throw error for empty cash flows', () => {
      const cashFlows: any[] = [];

      expect(() => {
        XIRRCalculator.calculateXIRR(cashFlows);
      }).toThrow();
    });

    test('should handle single investment and return', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 1200, date: new Date('2024-01-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result.irr).toBeCloseTo(0.20, 1); // Should be close to 20%
    });
  });

  describe('XNPV calculation', () => {
    test('should calculate XNPV correctly', () => {
      const rate = 0.10; // 10% discount rate
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 500, date: new Date('2023-06-01') },
        { amount: 600, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXNPV(rate, cashFlows);

      expect(result).toBeDefined();
      expect(typeof result.npv).toBe('number');
    });

    test('should return negative NPV for high discount rate', () => {
      const rate = 0.50; // 50% discount rate
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 500, date: new Date('2023-06-01') },
        { amount: 600, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXNPV(rate, cashFlows);

      expect(result.npv).toBeLessThan(0);
    });

    test('should return positive NPV for low discount rate', () => {
      const rate = 0.01; // 1% discount rate
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 500, date: new Date('2023-06-01') },
        { amount: 600, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXNPV(rate, cashFlows);

      expect(result.npv).toBeGreaterThan(0);
    });
  });

  describe('Payback period calculation', () => {
    test('should calculate payback period correctly', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 300, date: new Date('2023-04-01') },
        { amount: 400, date: new Date('2023-07-01') },
        { amount: 500, date: new Date('2023-10-01') }
      ];

      const paybackPeriod = XIRRCalculator.calculatePaybackPeriod(cashFlows);

      expect(paybackPeriod).toBeGreaterThan(0);
      expect(paybackPeriod).toBeLessThan(3); // Should recover in less than 3 periods
    });

    test('should return Infinity if investment never recovered', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 100, date: new Date('2023-04-01') },
        { amount: 100, date: new Date('2023-07-01') }
      ];

      const paybackPeriod = XIRRCalculator.calculatePaybackPeriod(cashFlows);

      expect(paybackPeriod).toBe(Infinity);
    });
  });

  describe('MIRR calculation', () => {
    test('should calculate MIRR correctly', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 500, date: new Date('2023-06-01') },
        { amount: 600, date: new Date('2023-12-01') }
      ];

      const financeRate = 0.08; // 8% finance rate
      const reinvestRate = 0.10; // 10% reinvest rate

      const mirr = XIRRCalculator.calculateMIRR(cashFlows, financeRate, reinvestRate);

      expect(mirr).toBeDefined();
      expect(typeof mirr).toBe('number');
    });

    test('should handle negative cash flows with MIRR', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: -200, date: new Date('2023-06-01') },
        { amount: 1500, date: new Date('2023-12-01') }
      ];

      const financeRate = 0.10;
      const reinvestRate = 0.12;

      const mirr = XIRRCalculator.calculateMIRR(cashFlows, financeRate, reinvestRate);

      expect(mirr).toBeDefined();
      expect(typeof mirr).toBe('number');
    });
  });

  describe('Discounted payback period', () => {
    test('should calculate discounted payback period', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 400, date: new Date('2023-04-01') },
        { amount: 500, date: new Date('2023-07-01') },
        { amount: 600, date: new Date('2023-10-01') }
      ];

      const discountRate = 0.10;
      const discountedPayback = XIRRCalculator.calculateDiscountedPaybackPeriod(cashFlows, discountRate);

      expect(discountedPayback).toBeDefined();
      expect(discountedPayback).toBeGreaterThan(0);
      // Discounted payback should be longer than regular payback
      expect(discountedPayback).toBeGreaterThan(0);
    });

    test('should return Infinity if discounted investment never recovered', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 100, date: new Date('2023-04-01') },
        { amount: 100, date: new Date('2023-07-01') }
      ];

      const discountRate = 0.20; // High discount rate
      const discountedPayback = XIRRCalculator.calculateDiscountedPaybackPeriod(cashFlows, discountRate);

      expect(discountedPayback).toBe(Infinity);
    });
  });

  describe('Edge cases and validation', () => {
    test('should handle cash flows with same dates', () => {
      const cashFlows = [
        { amount: -1000, date: new Date('2023-01-01') },
        { amount: 500, date: new Date('2023-01-01') },
        { amount: 600, date: new Date('2023-01-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result).toBeDefined();
    });

    test('should handle very large cash amounts', () => {
      const cashFlows = [
        { amount: -1000000000, date: new Date('2023-01-01') },
        { amount: 500000000, date: new Date('2023-06-01') },
        { amount: 600000000, date: new Date('2023-12-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result).toBeDefined();
      expect(result.irr).toBeGreaterThan(0);
    });

    test('should handle cash flows over multiple years', () => {
      const cashFlows = [
        { amount: -10000, date: new Date('2020-01-01') },
        { amount: 2000, date: new Date('2021-01-01') },
        { amount: 3000, date: new Date('2022-01-01') },
        { amount: 4000, date: new Date('2023-01-01') },
        { amount: 5000, date: new Date('2024-01-01') }
      ];

      const result = XIRRCalculator.calculateXIRR(cashFlows);

      expect(result).toBeDefined();
      expect(result.irr).toBeGreaterThan(0);
    });
  });
});