import { pgTable, text, serial, integer, boolean, numeric, timestamp } from 'drizzle-orm/pg-core';

// Users table (Cloud SQL and Firebase Auth uid mapping)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system user ID
  email: text('email').notNull(),
  fullName: text('full_name'),
  companyName: text('company_name'),
  phone: text('phone'),
  role: text('role').default('operator'), // 'owner', 'admin', 'operator'
  tenantId: text('tenant_id').notNull(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tenants (Multi-tenant SaaS companies)
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerEmail: text('owner_email'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

// SaaS Licenses (3 Days Trial / Lifetime License)
export const licenses = pgTable('licenses', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  type: text('type').notNull().default('trial'), // 'trial' | 'lifetime'
  status: text('status').notNull().default('active'), // 'active' | 'expired'
  trialStartedAt: timestamp('trial_started_at').defaultNow(),
  trialExpiresAt: timestamp('trial_expires_at'),
  activatedAt: timestamp('activated_at'),
  transactionId: text('transaction_id'),
  price: numeric('price', { precision: 10, scale: 2 }).default('199.00'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Mercado Pago Payment Transactions
export const paymentTransactions = pgTable('payment_transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  mpPreferenceId: text('mp_preference_id'),
  mpPaymentId: text('mp_payment_id'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  paymentMethod: text('payment_method').default('pix'),
  qrCode: text('qr_code'),
  qrCodeBase64: text('qr_code_base64'),
  ticketUrl: text('ticket_url'),
  createdAt: timestamp('created_at').defaultNow(),
  paidAt: timestamp('paid_at'),
});

// Streaming Applications (IPTV / OTT Apps)
export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  color: text('color').default('blue'),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  devices: text('devices'), // JSON string array
  loginType: text('login_type').default('xtream'),
  requiresOwnLicense: boolean('requires_own_license').default(false),
  downloadUrl: text('download_url'),
  setupNotes: text('setup_notes'),
  iconName: text('icon_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Commercial Plans
export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  appId: text('app_id').notNull(),
  category: text('category'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  billingCycle: text('billing_cycle').default('mensal'),
  durationDays: integer('duration_days').default(30),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Customers (Clients subscribed to streaming apps)
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  whatsapp: text('whatsapp').notNull(),
  email: text('email'),
  cpf: text('cpf'),
  appId: text('app_id').notNull(),
  planId: text('plan_id').notNull(),
  monthlyFee: numeric('monthly_fee', { precision: 10, scale: 2 }).notNull(),
  startDate: text('start_date').notNull(),
  dueDate: text('due_date').notNull(),
  paymentMethod: text('payment_method').default('pix'),
  status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'overdue'
  notes: text('notes'),
  macAddress: text('mac_address'),
  deviceKey: text('device_key'),
  appUsername: text('app_username'),
  appPassword: text('app_password'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Financial Charges / Invoices
export const charges = pgTable('charges', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  appName: text('app_name'),
  planName: text('plan_name'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: text('due_date').notNull(),
  paidAt: text('paid_at'),
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'overdue' | 'cancelled'
  paymentMethod: text('payment_method'),
  discount: numeric('discount', { precision: 10, scale: 2 }).default('0'),
  notes: text('notes'),
  registeredBy: text('registered_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// WhatsApp Instances
export const whatsappInstances = pgTable('whatsapp_instances', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  provider: text('provider').default('evolution'),
  apiUrl: text('api_url'),
  status: text('status').notNull().default('disconnected'), // 'connected' | 'disconnected'
  phoneNumber: text('phone_number'),
  qrCode: text('qr_code'),
  lastConnectedAt: timestamp('last_connected_at'),
  errorMessage: text('error_message'),
});

// WhatsApp Automations & Templates
export const whatsappAutomations = pgTable('whatsapp_automations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  isActive: boolean('is_active').default(true),
  sendOneDayBefore: boolean('send_one_day_before').default(true),
  sendOnDueDate: boolean('send_on_due_date').default(true),
  sendAfterDueDate: boolean('send_after_due_date').default(true),
  scheduledTime: text('scheduled_time').default('09:00'),
  timezone: text('timezone').default('America/Sao_Paulo'),
  messageIntervalSeconds: integer('message_interval_seconds').default(15),
  rateLimitPerHour: integer('rate_limit_per_hour').default(60),
  instanceId: text('instance_id'),
  templateOneDayBefore: text('template_one_day_before'),
  templateDueDate: text('template_due_date'),
  templateAfterDueDate: text('template_after_due_date'),
});

// WhatsApp Delivery Logs
export const whatsappLogs = pgTable('whatsapp_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  eventType: text('event_type').notNull(), // 'one_day_before' | 'due_date' | 'after_due_date' | 'manual_test'
  messageContent: text('message_content').notNull(),
  status: text('status').notNull().default('sent'), // 'sent' | 'failed' | 'queued'
  errorReason: text('error_reason'),
  sentAt: timestamp('sent_at').defaultNow(),
});

// Global Super Admin & System Settings
export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey().default('global'),
  superAdminPasswordHash: text('super_admin_password_hash'),
  lifetimePrice: numeric('lifetime_price', { precision: 10, scale: 2 }).default('199.00'),
  trialDurationHours: integer('trial_duration_hours').default(24),
  mpAccessToken: text('mp_access_token'),
  mpWebhookSecret: text('mp_webhook_secret'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Device Anti-Abuse Fingerprints
export const usedDeviceFingerprints = pgTable('used_device_fingerprints', {
  fingerprint: text('fingerprint').primaryKey(),
  tenantId: text('tenant_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
