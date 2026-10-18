import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    const url = (process.env.SUPABASE_URL || 'https://wzyvtetchhqmeagippak.supabase.co').trim();
    const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eXZ0ZXRjaGhxbWVhZ2lwcGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzQ0NTQsImV4cCI6MjEwNjg1MDQ1NH0.Rfr93UBxni5N_5WE3j1b0cNtB0Pq2043C2HEbZjCrh0').trim();

    // Polyfill seguro para Node 20 ou ambientes de hospedagem sem WebSocket nativo
    if (typeof globalThis.WebSocket === 'undefined') {
      (globalThis as any).WebSocket = class WebSocket {
        constructor() {}
        addEventListener() {}
        removeEventListener() {}
        send() {}
        close() {}
      };
    }

    if (url && secretKey) {
      try {
        this.client = createClient(url, secretKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        this.isConfigured = true;
        const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Ativo' : 'Anon Key Ativa';
        console.log(`⚡ Supabase Service inicializado com sucesso (${keyType})`);
      } catch (err: any) {
        console.warn('⚠️ Erro ao inicializar cliente Supabase:', err?.message);
      }
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Converte identificadores em formato UUID determinístico caso não sejam UUIDs nativos.
   */
  public toUuid(str: string | null | undefined): string | null {
    if (!str) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      return str;
    }
    const hash = crypto.createHash('md5').update(String(str)).digest('hex');
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-');
  }

  // ==========================================
  // SYNC & LOAD ALL FROM SUPABASE
  // ==========================================
  public async loadAll() {
    if (!this.client) return null;
    try {
      const [
        tenantsRes,
        profilesRes,
        licensesRes,
        appsRes,
        plansRes,
        customersRes,
        chargesRes,
        transRes,
        waInstRes,
        waAutoRes,
        waLogsRes,
        auditLogsRes
      ] = await Promise.all([
        this.client.from('tenants').select('*'),
        this.client.from('profiles').select('*'),
        this.client.from('licenses').select('*'),
        this.client.from('applications').select('*'),
        this.client.from('plans').select('*'),
        this.client.from('customers').select('*'),
        this.client.from('charges').select('*'),
        this.client.from('payment_transactions').select('*'),
        this.client.from('whatsapp_instances').select('*'),
        this.client.from('automation_settings').select('*'),
        this.client.from('message_logs').select('*'),
        this.client.from('audit_logs').select('*')
      ]);

      return {
        tenants: tenantsRes.data || [],
        profiles: profilesRes.data || [],
        licenses: licensesRes.data || [],
        applications: appsRes.data || [],
        plans: plansRes.data || [],
        customers: customersRes.data || [],
        charges: chargesRes.data || [],
        payment_transactions: transRes.data || [],
        whatsapp_instances: waInstRes.data || [],
        automation_settings: waAutoRes.data || [],
        message_logs: waLogsRes.data || [],
        audit_logs: auditLogsRes.data || []
      };
    } catch (err: any) {
      console.error('Erro ao ler tabelas do Supabase:', err?.message);
      return null;
    }
  }

  // ==========================================
  // TENANTS & USERS
  // ==========================================
  public async upsertTenant(tenant: { id: string; name: string; created_at?: string }) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(tenant.id);
      await this.client.from('tenants').upsert({
        id: uuid,
        name: tenant.name,
        created_at: tenant.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertTenant error:', e?.message);
    }
  }

  public async upsertProfile(profile: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(profile.id);
      const tenantUuid = this.toUuid(profile.tenant_id);
      await this.client.from('profiles').upsert({
        id: uuid,
        email: profile.email ? profile.email.toLowerCase().trim() : '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        tenant_id: tenantUuid,
        role: profile.role || 'owner',
        created_at: profile.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertProfile error:', e?.message);
    }
  }

  public async upsertLicense(license: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(license.id);
      const tenantUuid = this.toUuid(license.tenant_id);

      // Check if this tenant already has a license record in Supabase
      const { data } = await this.client.from('licenses').select('id').eq('tenant_id', tenantUuid);
      const existingId = data && data.length > 0 ? data[0].id : uuid;

      const isLifetime = license.type === 'lifetime';
      const farFuture = new Date(Date.now() + 100 * 365 * 86400000).toISOString();

      await this.client.from('licenses').upsert({
        id: existingId,
        tenant_id: tenantUuid,
        type: isLifetime ? 'lifetime' : (license.type || 'trial'),
        status: isLifetime ? 'active' : (license.status || 'active'),
        trial_started_at: license.trial_started_at || new Date().toISOString(),
        trial_expires_at: isLifetime
          ? farFuture
          : (license.trial_expires_at || new Date(Date.now() + 24 * 3600000).toISOString()),
        activated_at: license.activated_at || (isLifetime ? new Date().toISOString() : null),
        transaction_id: license.transaction_id || null,
        price: Number(license.price) || 199.00
      }, { onConflict: 'id' });

      // If lifetime, also explicitly update any records matching tenant_id
      if (isLifetime) {
        await this.client.from('licenses').update({
          type: 'lifetime',
          status: 'active',
          trial_expires_at: farFuture,
          activated_at: license.activated_at || new Date().toISOString()
        }).eq('tenant_id', tenantUuid);
      }
    } catch (e: any) {
      console.warn('Supabase upsertLicense error:', e?.message);
    }
  }

  // ==========================================
  // APPLICATIONS
  // ==========================================
  public async upsertApplication(app: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(app.id);
      const tenantUuid = this.toUuid(app.tenant_id);
      await this.client.from('applications').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        name: app.name,
        category: app.category || 'streaming',
        description: app.description || '',
        color: app.color || '#2563EB',
        status: app.status || 'active',
        created_at: app.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertApplication error:', e?.message);
    }
  }

  public async deleteApplication(id: string) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(id);
      await this.client.from('applications').delete().eq('id', uuid);
    } catch (e: any) {
      console.warn('Supabase deleteApplication error:', e?.message);
    }
  }

  // ==========================================
  // PLANS
  // ==========================================
  public async upsertPlan(plan: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(plan.id);
      const tenantUuid = this.toUuid(plan.tenant_id);
      const appUuid = this.toUuid(plan.app_id);
      await this.client.from('plans').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        name: plan.name,
        description: plan.description || '',
        app_id: appUuid,
        category: plan.category || 'streaming',
        price: Number(plan.price) || 0,
        billing_cycle: plan.billing_cycle || 'mensal',
        duration_days: Number(plan.duration_days) || 30,
        status: plan.status || 'active',
        created_at: plan.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertPlan error:', e?.message);
    }
  }

  public async deletePlan(id: string) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(id);
      await this.client.from('plans').delete().eq('id', uuid);
    } catch (e: any) {
      console.warn('Supabase deletePlan error:', e?.message);
    }
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  public async upsertCustomer(c: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(c.id);
      const tenantUuid = this.toUuid(c.tenant_id);
      const appUuid = this.toUuid(c.app_id);
      const planUuid = this.toUuid(c.plan_id);

      await this.client.from('customers').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        full_name: c.full_name,
        phone: c.phone || '',
        whatsapp: c.whatsapp || c.phone || '',
        email: c.email || null,
        cpf: c.cpf || null,
        app_id: appUuid,
        plan_id: planUuid,
        monthly_fee: Number(c.monthly_fee) || 0,
        start_date: c.start_date || new Date().toISOString().split('T')[0],
        due_date: c.due_date,
        payment_method: c.payment_method || 'Pix',
        status: c.status || 'active',
        notes: c.notes || null,
        created_at: c.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertCustomer error:', e?.message);
    }
  }

  public async deleteCustomer(id: string) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(id);
      await this.client.from('customers').delete().eq('id', uuid);
    } catch (e: any) {
      console.warn('Supabase deleteCustomer error:', e?.message);
    }
  }

  // ==========================================
  // CHARGES
  // ==========================================
  public async upsertCharge(charge: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(charge.id);
      const tenantUuid = this.toUuid(charge.tenant_id);
      const custUuid = this.toUuid(charge.customer_id);

      await this.client.from('charges').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        customer_id: custUuid,
        customer_name: charge.customer_name,
        app_name: charge.app_name || null,
        plan_name: charge.plan_name || null,
        amount: Number(charge.amount) || 0,
        due_date: charge.due_date,
        paid_at: charge.paid_at || null,
        status: charge.status || 'pending',
        payment_method: charge.payment_method || null,
        discount: Number(charge.discount) || 0,
        notes: charge.notes || null,
        registered_by: charge.registered_by || null,
        created_at: charge.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertCharge error:', e?.message);
    }
  }

  public async deleteCharge(id: string) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(id);
      await this.client.from('charges').delete().eq('id', uuid);
    } catch (e: any) {
      console.warn('Supabase deleteCharge error:', e?.message);
    }
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  public async upsertTransaction(tx: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(tx.id);
      const tenantUuid = this.toUuid(tx.tenant_id);

      await this.client.from('payment_transactions').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        amount: Number(tx.amount) || 0,
        status: tx.status || 'pending',
        payment_method: tx.payment_method || null,
        mp_preference_id: tx.mp_preference_id || null,
        mp_payment_id: tx.mp_payment_id || null,
        paid_at: tx.paid_at || null,
        created_at: tx.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertTransaction error:', e?.message);
    }
  }

  // ==========================================
  // WHATSAPP & AUTOMATIONS
  // ==========================================
  public async upsertWhatsAppInstance(inst: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(inst.id);
      const tenantUuid = this.toUuid(inst.tenant_id);

      await this.client.from('whatsapp_instances').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        name: inst.name || 'WhatsApp Principal',
        provider: inst.provider || 'evolution',
        api_url: inst.api_url || null,
        status: inst.status || 'disconnected',
        phone_number: inst.phone_number || null,
        qr_code: inst.qr_code || null,
        last_connected_at: inst.last_connected_at || null,
        created_at: inst.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertWhatsAppInstance error:', e?.message);
    }
  }

  public async upsertWhatsAppAutomation(auto: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(auto.id);
      const tenantUuid = this.toUuid(auto.tenant_id);

      await this.client.from('automation_settings').upsert({
        id: uuid,
        tenant_id: tenantUuid,
        is_active: Boolean(auto.is_active),
        send_one_day_before: Boolean(auto.send_one_day_before),
        send_on_due_date: Boolean(auto.send_on_due_date),
        send_after_due_date: Boolean(auto.send_after_due_date),
        scheduled_time: auto.scheduled_time || '09:00',
        timezone: auto.timezone || 'America/Sao_Paulo',
        message_interval_seconds: Number(auto.message_interval_seconds) || 15,
        rate_limit_per_hour: Number(auto.rate_limit_per_hour) || 120,
        template_one_day_before: auto.template_one_day_before || '',
        template_due_date: auto.template_due_date || '',
        template_after_due_date: auto.template_after_due_date || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e: any) {
      console.warn('Supabase upsertWhatsAppAutomation error:', e?.message);
    }
  }

  public async insertWhatsAppLog(log: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(log.id);
      const tenantUuid = this.toUuid(log.tenant_id);

      await this.client.from('message_logs').insert({
        id: uuid,
        tenant_id: tenantUuid,
        customer_id: String(log.customer_id),
        customer_name: log.customer_name || 'Cliente',
        phone: log.phone || '',
        event_type: log.event_type || 'due_date',
        message_content: log.message_content || '',
        status: log.status || 'sent',
        error_reason: log.error_reason || null,
        sent_at: log.sent_at || new Date().toISOString()
      });
    } catch (e: any) {
      console.warn('Supabase insertWhatsAppLog error:', e?.message);
    }
  }

  public async insertAuditLog(log: any) {
    if (!this.client) return;
    try {
      const uuid = this.toUuid(log.id);
      const tenantUuid = this.toUuid(log.tenant_id);

      await this.client.from('audit_logs').insert({
        id: uuid,
        tenant_id: tenantUuid,
        action: log.action || 'ACTION',
        description: log.description || '',
        created_at: log.created_at || new Date().toISOString()
      });
    } catch (e: any) {
      console.warn('Supabase insertAuditLog error:', e?.message);
    }
  }
}

export const supabaseService = new SupabaseService();
