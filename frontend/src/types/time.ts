export interface TimeEntryData {
  id: string;
  task_id: string;
  project_id: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_seconds: number;
  is_billable: boolean;
  hourly_rate?: number | null;
  invoiced: boolean;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  task_title?: string | null;
  project_name?: string | null;
  client_name?: string | null;
  client_id?: string | null;
  currency_code?: string | null;
  billable_amount: number;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryCreatePayload {
  task_id: string;
  project_id?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  is_billable?: boolean;
  hourly_rate?: number;
}

export interface TimeEntryUpdatePayload {
  task_id?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  is_billable?: boolean;
  hourly_rate?: number;
  invoiced?: boolean;
}
