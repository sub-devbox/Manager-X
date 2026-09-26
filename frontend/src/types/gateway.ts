export interface GatewayData {
  id: string;
  name: string;
  currency_code: string;
  total_incoming_amount: number;
  total_equivalent_inr: number;
  average_rate: number;
  gateway_note: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GatewayCreatePayload {
  name: string;
  currency_code: string;
  total_incoming_amount?: number;
  total_equivalent_inr?: number;
  average_rate?: number;
  gateway_note?: string;
  is_active?: boolean;
}

export interface GatewayUpdatePayload {
  name?: string;
  currency_code?: string;
  total_incoming_amount?: number;
  total_equivalent_inr?: number;
  average_rate?: number;
  gateway_note?: string;
  is_active?: boolean;
}
