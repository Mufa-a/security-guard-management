export type ExpenseCategory =
  | 'FUEL'
  | 'EQUIPMENT'
  | 'VEHICLE_MAINTENANCE'
  | 'RENT_UTILITIES'
  | 'LICENSES'
  | 'OTHER';

export type ExpenseStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  vendor_name: string;
  description: string;
  amount: string;
  expense_date: string;
  due_date: string | null;
  payment_date: string | null;
  status: ExpenseStatus;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreatePayload {
  category: ExpenseCategory;
  vendor_name?: string;
  description: string;
  amount: string;
  expense_date: string;
  due_date?: string;
  payment_date?: string;
  status?: ExpenseStatus;
  notes?: string;
}