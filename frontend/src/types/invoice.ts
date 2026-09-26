export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface InvoiceItemData {
  id?: string;
  invoice_id?: string;
  task_id?: string | null;
  description: string;
  hsn_sac?: string | null;
  price: number;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order?: number;
}

export interface ClientInvoiceSummary {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  tax_id?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  currency_code: string;
  hourly_rate: number;
  payment_terms_days: number;
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  client_id: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  payment_gateway?: string | null;
  subtotal: number;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  discount_amount: number;
  round_off: number;
  final_amount: number;
  currency_code: string;
  gateway_notes?: string | null;
  received_amount_inr?: number | null;
  payment_date?: string | null;
  is_reconciled?: boolean;
  bank_transaction_id?: string | null;
  created_at: string;
  updated_at: string;
  client?: ClientInvoiceSummary | null;
  items: InvoiceItemData[];
}

export interface InvoiceCreatePayload {
  invoice_number?: string;
  client_id: string;
  status?: InvoiceStatus;
  issue_date: string;
  due_date: string;
  payment_gateway?: string;
  subtotal?: number;
  discount_type?: "fixed" | "percentage";
  discount_value?: number;
  discount_amount?: number;
  round_off?: number;
  final_amount?: number;
  currency_code?: string;
  gateway_notes?: string;
  received_amount_inr?: number | null;
  payment_date?: string | null;
  is_reconciled?: boolean;
  bank_transaction_id?: string | null;
  items: InvoiceItemData[];
}

export interface RecordPaymentPayload {
  received_amount_inr: number;
  payment_date?: string;
  bank_reference?: string;
}

export interface ReconcilePayload {
  bank_transaction_id?: string;
  payment_date?: string;
}

export interface UnbilledTaskData {
  id: string;
  title: string;
  project_id: string;
  project_name?: string | null;
  estimated_hours: number;
  hourly_rate?: number | null;
  time_spent_seconds: number;
}

export interface CompanyProfileData {
  name: string;
  address: string;
  phone: string;
  pan: string;
  gstin: string;
  email: string;
  website: string;
}
