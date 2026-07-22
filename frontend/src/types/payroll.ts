export type PayrollPeriodStatus = 'OPEN' | 'CLOSED';

export interface PayrollPeriod {
  id: string;
  period_start: string;
  period_end: string;
  status: PayrollPeriodStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriodCreatePayload {
  period_start: string;
  period_end: string;
}

export type PayslipStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface Payslip {
  id: string;
  period: string;
  period_detail: string;
  employee: string;
  employee_name: string;
  // Note: DRF serializes DecimalField as a STRING by default, not a number.
  // Always parseFloat() before formatting/arithmetic.
  basic_salary: string;
  total_allowances: string;
  gross_pay: string;
  nssf_employee: string;
  shif_contribution: string;
  housing_levy: string;
  taxable_income: string;
  paye_tax: string;
  total_other_deductions: string;
  net_pay: string;
  status: PayslipStatus;
  pdf_file: string | null;
  generated_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratePayslipsResponse {
  created_count: number;
  skipped: { employee: string; reason: string }[];
}
export type PaymentFrequency = 'MONTHLY' | 'WEEKLY' | 'BI_WEEKLY';

export interface SalaryStructure {
  id: string;
  employee: string;
  employee_name: string;
  basic_salary: string;
  payment_frequency: PaymentFrequency;
  effective_from: string;
  effective_to: string | null;
  overtime_rate: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructureCreatePayload {
  employee: string;
  basic_salary: string;
  payment_frequency: PaymentFrequency;
  effective_from: string;
  effective_to?: string;
  overtime_rate?: string;
}

export interface Allowance {
  id: string;
  employee: string;
  employee_name: string;
  allowance_type: string;
  amount: string;
  is_recurring: boolean;
  is_taxable: boolean;
  is_active: boolean;
}

export interface AllowanceCreatePayload {
  employee: string;
  allowance_type: string;
  amount: string;
  is_recurring: boolean;
  is_taxable: boolean;
}

export interface Deduction {
  id: string;
  employee: string;
  employee_name: string;
  deduction_type: string;
  amount: string;
  is_recurring: boolean;
  is_active: boolean;
}

export interface DeductionCreatePayload {
  employee: string;
  deduction_type: string;
  amount: string;
  is_recurring: boolean;
}