import apiClient from './client';
import type { Invoice, InvoiceCreatePayload, InvoiceLineItem, InvoiceLineItemCreatePayload } from '../types/invoices';

export async function getInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get('/invoices/invoices/');
  return data.results ?? data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get(`/invoices/invoices/${id}/`);
  return data;
}

export async function createInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  const { data } = await apiClient.post('/invoices/invoices/', payload);
  return data;
}

export async function updateInvoice(id: string, payload: Partial<InvoiceCreatePayload>): Promise<Invoice> {
  const { data } = await apiClient.patch(`/invoices/invoices/${id}/`, payload);
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiClient.delete(`/invoices/invoices/${id}/`);
}

export async function createLineItem(payload: InvoiceLineItemCreatePayload): Promise<InvoiceLineItem> {
  const { data } = await apiClient.post('/invoices/line-items/', payload);
  return data;
}

export async function deleteLineItem(id: string): Promise<void> {
  await apiClient.delete(`/invoices/line-items/${id}/`);
}