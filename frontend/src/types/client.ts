export interface ClientData {
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
  hourly_rate: number;
  currency_code: string;
  payment_terms_days: number;
  is_active: boolean;
}
