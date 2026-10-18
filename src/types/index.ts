export type LicenseStatus = 'active' | 'expired';
export type LicenseType = 'trial' | 'lifetime';

export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  company_name: string;
  phone: string;
  role: 'owner' | 'admin' | 'operator';
  created_at: string;
}

export interface License {
  id: string;
  tenant_id: string;
  type: LicenseType;
  status: LicenseStatus;
  trial_started_at: string;
  trial_expires_at: string;
  activated_at?: string;
  transaction_id?: string;
  price: number;
  remaining_seconds: number;
  is_expired: boolean;
}

export interface PaymentTransaction {
  id: string;
  tenant_id: string;
  mp_preference_id?: string;
  mp_payment_id?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_process';
  payment_method: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  created_at: string;
  paid_at?: string;
}

export type AppCategory =
  | 'player_iptv'
  | 'android_box'
  | 'smart_tv'
  | 'multiplataforma'
  | 'streaming'
  | 'canais'
  | 'iptv'
  | 'esportes'
  | 'combos'
  | 'outros';

export interface StreamingApp {
  id: string;
  tenant_id: string;
  name: string;
  category: AppCategory;
  description: string;
  color: string;
  status: 'active' | 'inactive';
  devices?: string[];
  login_type?: 'xtream' | 'mac_key' | 'm3u' | 'stalker' | 'outro';
  requires_own_license?: boolean;
  download_url?: string;
  setup_notes?: string;
  icon_name?: string;
  active_customers_count?: number;
  created_at: string;
}

export type BillingCycle = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'personalizado';

export interface CommercialPlan {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  app_id?: string;
  app_name?: string;
  category: string;
  price: number;
  billing_cycle: BillingCycle;
  duration_days: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  cpf?: string;
  created_at: string;
  app_id: string;
  plan_id: string;
  monthly_fee: number;
  start_date: string;
  due_date: string;
  payment_method: string;
  status: 'active' | 'inactive' | 'overdue';
  notes?: string;
  mac_address?: string;
  device_key?: string;
  app_username?: string;
  app_password?: string;
  stream_username?: string;
  stream_password?: string;
  app_name?: string;
  plan_name?: string;
}

export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

export interface Charge {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  app_name: string;
  plan_name: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  status: ChargeStatus;
  payment_method?: string;
  discount?: number;
  notes?: string;
  created_at: string;
  registered_by?: string;
}

export interface WhatsAppInstance {
  id: string;
  tenant_id: string;
  name: string;
  provider: 'z-api' | 'evolution' | 'baileys' | 'whatsapp-cloud';
  api_url?: string;
  status: 'connected' | 'disconnected' | 'connecting';
  phone_number?: string;
  qr_code?: string;
  last_connected_at?: string;
  error_message?: string;
}

export interface WhatsAppAutomationSettings {
  id: string;
  tenant_id: string;
  is_active: boolean;
  send_one_day_before: boolean;
  send_on_due_date: boolean;
  send_after_due_date: boolean;
  scheduled_time: string; // "09:00"
  timezone: string;
  message_interval_seconds: number;
  rate_limit_per_hour: number;
  instance_id?: string;
  template_one_day_before: string;
  template_due_date: string;
  template_after_due_date: string;
}

export interface WhatsAppLog {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  event_type: 'one_day_before' | 'due_date' | 'after_due_date' | 'manual_test' | 'credentials' | 'manual' | (string & {});
  message_content: string;
  status: 'sent' | 'failed' | 'queued';
  error_reason?: string;
  sent_at: string;
}

export interface DashboardMetrics {
  received_today: number;
  to_receive_tomorrow: number;
  overdue_total: number;
  active_customers: number;
  recent_charges: Charge[];
  upcoming_due_customers: Customer[];
  monthly_revenue: { date: string; amount: number; count: number }[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  license: License;
}
