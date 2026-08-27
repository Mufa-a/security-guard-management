export interface InvoiceLineItem {
  id: string;
  invoice: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  client: string;
  client_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes: string;
  line_items: InvoiceLineItem[];
  subtotal: string;
  amount_paid: string;
  balance_due: string;
  is_overdue: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreatePayload {
  client: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes: string;
}

export interface InvoiceLineItemCreatePayload {
  invoice: string;
  description: string;
  quantity: number;
  unit_price: number;
}