import apiClient from './client';
import type { Expense, ExpenseCreatePayload } from '../types/expenses';

export async function getExpenses(): Promise<Expense[]> {
  const { data } = await apiClient.get('/expenses/expenses/');
  return data.results ?? data;
}

export async function getExpense(id: string): Promise<Expense> {
  const { data } = await apiClient.get(`/expenses/expenses/${id}/`);
  return data;
}

export async function createExpense(payload: ExpenseCreatePayload): Promise<Expense> {
  const { data } = await apiClient.post('/expenses/expenses/', payload);
  return data;
}

export async function updateExpense(id: string, payload: Partial<ExpenseCreatePayload>): Promise<Expense> {
  const { data } = await apiClient.patch(`/expenses/expenses/${id}/`, payload);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/expenses/${id}/`);
}