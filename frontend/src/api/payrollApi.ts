import apiClient from './client';
import type {
  PayrollPeriod,
  PayrollPeriodCreatePayload,
  Payslip,
  GeneratePayslipsResponse,
  SalaryStructure,
  SalaryStructureCreatePayload,
  Allowance,
  AllowanceCreatePayload,
  Deduction,
  DeductionCreatePayload,
} from '../types/payroll';

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data } = await apiClient.get('/payroll/periods/');
  return data.results ?? data;
}

export async function createPayrollPeriod(payload: PayrollPeriodCreatePayload): Promise<PayrollPeriod> {
  const { data } = await apiClient.post('/payroll/periods/', payload);
  return data;
}

export async function getPayslips(): Promise<Payslip[]> {
  const { data } = await apiClient.get('/payroll/payslips/');
  return data.results ?? data;
}

export async function getPayslip(id: string): Promise<Payslip> {
  const { data } = await apiClient.get(`/payroll/payslips/${id}/`);
  return data;
}

export async function getMyPayslips(): Promise<Payslip[]> {
  const { data } = await apiClient.get('/payroll/payslips/my-payslips/');
  return data;
}

export async function generatePayslips(
  periodId: string,
  employeeIds?: string[]
): Promise<GeneratePayslipsResponse> {
  const { data } = await apiClient.post('/payroll/payslips/generate/', {
    period_id: periodId,
    employee_ids: employeeIds,
  });
  return data;
}
export async function updatePayslipStatus(id: string, status: PayslipStatus): Promise<Payslip> {
  const { data } = await apiClient.patch(`/payroll/payslips/${id}/`, { status });
  return data;
}

export async function getSalaryStructures(employeeId?: string): Promise<SalaryStructure[]> {
  const url = employeeId
    ? `/payroll/salary-structures/?employee=${employeeId}`
    : '/payroll/salary-structures/';
  const { data } = await apiClient.get(url);
  return data.results ?? data;
}

export async function createSalaryStructure(
  payload: SalaryStructureCreatePayload
): Promise<SalaryStructure> {
  const { data } = await apiClient.post('/payroll/salary-structures/', payload);
  return data;
}

export async function getAllowances(employeeId: string): Promise<Allowance[]> {
  const { data } = await apiClient.get(`/payroll/allowances/?employee=${employeeId}`);
  return data.results ?? data;
}

export async function createAllowance(payload: AllowanceCreatePayload): Promise<Allowance> {
  const { data } = await apiClient.post('/payroll/allowances/', payload);
  return data;
}

export async function getDeductions(employeeId: string): Promise<Deduction[]> {
  const { data } = await apiClient.get(`/payroll/deductions/?employee=${employeeId}`);
  return data.results ?? data;
}

export async function createDeduction(payload: DeductionCreatePayload): Promise<Deduction> {
  const { data } = await apiClient.post('/payroll/deductions/', payload);
  return data;
}

export async function deletePayrollPeriod(id: string): Promise<void> {
  await apiClient.delete(`/payroll/periods/${id}/`);
}
export async function deleteAllowance(id: string): Promise<void> {
  await apiClient.delete(`/payroll/allowances/${id}/`);
}

export async function deleteDeduction(id: string): Promise<void> {
  await apiClient.delete(`/payroll/deductions/${id}/`);
}