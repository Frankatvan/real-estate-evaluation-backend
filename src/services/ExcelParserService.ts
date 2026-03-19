import * as XLSX from 'xlsx';
import { parse, format } from 'date-fns';

/**
 * Excel row data interface
 */
export interface ExcelRow {
  [key: string]: any;
}

/**
 * Parsed sales data
 */
export interface ParsedSalesData {
  unitCode: string;
  unitType: string;
  actualPrice: number;
  expectedPrice: number;
  closingDate: Date | null;
}

/**
 * Parsed construction data
 */
export interface ParsedConstructionData {
  unitCode: string;
  costCode: string;
  vendor: string;
  category: string;
  amount: number;
  clearDate: Date | null;
  dueDate: Date | null;
  isCleared: boolean;
  notes: string;
}

/**
 * Parsed units data
 */
export interface ParsedUnitsData {
  unitCode: string;
  unitType: string;
  area: number;
  floor: number;
  building: string;
  status: string;
}

/**
 * Parsed tenants data
 */
export interface ParsedTenantsData {
  unitCode: string;
  tenantName: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  monthlyRent: number;
  rentalDeposit: number;
}

/**
 * Parsed plan data
 */
export interface ParsedPlanData {
  unitCode: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  plannedCost: number;
  phase: string;
}

/**
 * Excel Parser Service
 * Handles parsing of Excel files for various data types
 */
export class ExcelParserService {
  /**
   * Parse Excel file and return data as array of objects
   */
  private parseExcelFile(buffer: Buffer): ExcelRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    return data as ExcelRow[];
  }

  /**
   * Parse date from various formats
   */
  private parseDate(value: any): Date | null {
    if (!value) return null;

    // If already a Date object
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    // If string, try to parse
    if (typeof value === 'string') {
      // Try Excel date format (number as string)
      const excelDate = parseFloat(value);
      if (!isNaN(excelDate) && excelDate > 0) {
        const date = XLSX.SSF.parse_date_code(excelDate);
        if (date) {
          return new Date(date.y, date.m - 1, date.d);
        }
      }

      // Try common date formats
      const formats = [
        'yyyy-MM-dd',
        'MM/dd/yyyy',
        'dd/MM/yyyy',
        'yyyy/MM/dd',
        'yyyy-MM-dd HH:mm:ss'
      ];

      for (const fmt of formats) {
        try {
          const parsed = parse(value, fmt, new Date());
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch {
          // Continue trying next format
        }
      }
    }

    // If number, treat as Excel date
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return new Date(date.y, date.m - 1, date.d);
      }
    }

    return null;
  }

  /**
   * Parse decimal number
   */
  private parseDecimal(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    // Remove currency symbols and commas
    if (typeof value === 'string') {
      value = value.replace(/[$,]/g, '');
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse boolean value
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
    }
    if (typeof value === 'number') return value === 1;
    return false;
  }

  /**
   * Parse sales data from Excel file
   */
  parseSalesData(buffer: Buffer): ParsedSalesData[] {
    const data = this.parseExcelFile(buffer);
    const salesData: ParsedSalesData[] = [];

    for (const row of data) {
      const salesItem: ParsedSalesData = {
        unitCode: String(row['单元编号'] || row['Unit Code'] || row['unit_code'] || ''),
        unitType: String(row['单元类型'] || row['Unit Type'] || row['unit_type'] || ''),
        actualPrice: this.parseDecimal(row['实际价格'] || row['Actual Price'] || row['actual_price']),
        expectedPrice: this.parseDecimal(row['预期价格'] || row['Expected Price'] || row['expected_price']),
        closingDate: this.parseDate(row['成交日期'] || row['Closing Date'] || row['closing_date'])
      };

      // Skip rows without required fields
      if (salesItem.unitCode) {
        salesData.push(salesItem);
      }
    }

    return salesData;
  }

  /**
   * Parse construction data from Excel file
   */
  parseConstructionData(buffer: Buffer): ParsedConstructionData[] {
    const data = this.parseExcelFile(buffer);
    const constructionData: ParsedConstructionData[] = [];

    for (const row of data) {
      const constructionItem: ParsedConstructionData = {
        unitCode: String(row['单元编号'] || row['Unit Code'] || row['unit_code'] || ''),
        costCode: String(row['成本编号'] || row['Cost Code'] || row['cost_code'] || ''),
        vendor: String(row['供应商'] || row['Vendor'] || row['vendor'] || ''),
        category: String(row['类别'] || row['Category'] || row['category'] || ''),
        amount: this.parseDecimal(row['金额'] || row['Amount'] || row['amount']),
        clearDate: this.parseDate(row['清账日期'] || row['Clear Date'] || row['clear_date']),
        dueDate: this.parseDate(row['到期日期'] || row['Due Date'] || row['due_date']),
        isCleared: this.parseBoolean(row['已清账'] || row['Cleared'] || row['is_cleared']),
        notes: String(row['备注'] || row['Notes'] || row['notes'] || '')
      };

      // Skip rows without required fields
      if (constructionItem.unitCode && constructionItem.costCode) {
        constructionData.push(constructionItem);
      }
    }

    return constructionData;
  }

  /**
   * Parse units data from Excel file
   */
  parseUnitsData(buffer: Buffer): ParsedUnitsData[] {
    const data = this.parseExcelFile(buffer);
    const unitsData: ParsedUnitsData[] = [];

    for (const row of data) {
      const unitItem: ParsedUnitsData = {
        unitCode: String(row['单元编号'] || row['Unit Code'] || row['unit_code'] || ''),
        unitType: String(row['单元类型'] || row['Unit Type'] || row['unit_type'] || ''),
        area: this.parseDecimal(row['面积'] || row['Area'] || row['area']),
        floor: parseInt(row['楼层'] || row['Floor'] || row['floor']) || 0,
        building: String(row['楼宇'] || row['Building'] || row['building'] || ''),
        status: String(row['状态'] || row['Status'] || row['status'] || '')
      };

      // Skip rows without required fields
      if (unitItem.unitCode) {
        unitsData.push(unitItem);
      }
    }

    return unitsData;
  }

  /**
   * Parse tenants data from Excel file
   */
  parseTenantsData(buffer: Buffer): ParsedTenantsData[] {
    const data = this.parseExcelFile(buffer);
    const tenantsData: ParsedTenantsData[] = [];

    for (const row of data) {
      const tenantItem: ParsedTenantsData = {
        unitCode: String(row['单元编号'] || row['Unit Code'] || row['unit_code'] || ''),
        tenantName: String(row['租户名称'] || row['Tenant Name'] || row['tenant_name'] || ''),
        leaseStartDate: this.parseDate(row['租期开始'] || row['Lease Start'] || row['lease_start_date']) || new Date(),
        leaseEndDate: this.parseDate(row['租期结束'] || row['Lease End'] || row['lease_end_date']) || new Date(),
        monthlyRent: this.parseDecimal(row['月租金'] || row['Monthly Rent'] || row['monthly_rent']),
        rentalDeposit: this.parseDecimal(row['租赁押金'] || row['Rental Deposit'] || row['rental_deposit'])
      };

      // Skip rows without required fields
      if (tenantItem.unitCode && tenantItem.tenantName) {
        tenantsData.push(tenantItem);
      }
    }

    return tenantsData;
  }

  /**
   * Parse plan data from Excel file
   */
  parsePlanData(buffer: Buffer): ParsedPlanData[] {
    const data = this.parseExcelFile(buffer);
    const planData: ParsedPlanData[] = [];

    for (const row of data) {
      const planItem: ParsedPlanData = {
        unitCode: String(row['单元编号'] || row['Unit Code'] || row['unit_code'] || ''),
        plannedStartDate: this.parseDate(row['计划开始日期'] || row['Planned Start'] || row['planned_start_date']) || new Date(),
        plannedEndDate: this.parseDate(row['计划结束日期'] || row['Planned End'] || row['planned_end_date']) || new Date(),
        plannedCost: this.parseDecimal(row['计划成本'] || row['Planned Cost'] || row['planned_cost']),
        phase: String(row['阶段'] || row['Phase'] || row['phase'] || '')
      };

      // Skip rows without required fields
      if (planItem.unitCode) {
        planData.push(planItem);
      }
    }

    return planData;
  }

  /**
   * Validate parsed data
   */
  validateData<T>(data: T[], requiredFields: (keyof T)[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const field of requiredFields) {
        if (!row[field] || (typeof row[field] === 'string' && row[field].trim() === '')) {
          errors.push(`Row ${i + 1}: Missing required field '${String(field)}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new ExcelParserService();
