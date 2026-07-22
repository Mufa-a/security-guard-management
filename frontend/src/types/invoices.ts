export interface InvoiceLineItem {
  id: string;
  invoice: string;
  description: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

export interface InvoiceLineItemCreatePayload {
  invoice?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  client: string;
  client_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes: string;
  line_items: InvoiceLineItem[];
  subtotal: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreatePayload {
  client: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status?: string;
  notes?: string;
}