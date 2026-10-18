import { db } from '../src/db/index.ts';
import * as schema from '../src/db/schema.ts';
import { eq, and, or } from 'drizzle-orm';

export class PostgresService {
  private isConnected: boolean = false;

  constructor() {
    this.testConnection();
  }

  public isReady(): boolean {
    return Boolean(process.env.SQL_HOST && process.env.SQL_USER && this.isConnected);
  }

  private async testConnection() {
    if (!process.env.SQL_HOST || !process.env.SQL_USER) {
      this.isConnected = false;
      return;
    }
    try {
      await db.select().from(schema.systemSettings).limit(1);
      this.isConnected = true;
      console.log('✅ PostgreSQL / Cloud SQL conectado com sucesso via Drizzle ORM');
    } catch (e) {
      this.isConnected = false;
      console.warn('PostgreSQL connection warming or waiting for proxy:', (e as any)?.message);
    }
  }

  // Load all entities from PostgreSQL if they exist
  public async loadAll() {
    if (!this.isReady()) return null;
    try {
      const [
        tenants,
        users,
        licenses,
        applications,
        plans,
        customers,
        charges,
        paymentTransactions,
        whatsappInstances,
        whatsappAutomations,
        whatsappLogs,
        systemSettings
      ] = await Promise.all([
        db.select().from(schema.tenants),
        db.select().from(schema.users),
        db.select().from(schema.licenses),
        db.select().from(schema.applications),
        db.select().from(schema.plans),
        db.select().from(schema.customers),
        db.select().from(schema.charges),
        db.select().from(schema.paymentTransactions),
        db.select().from(schema.whatsappInstances),
        db.select().from(schema.whatsappAutomations),
        db.select().from(schema.whatsappLogs),
        db.select().from(schema.systemSettings)
      ]);

      return {
        tenants,
        users,
        licenses,
        applications,
        plans,
        customers,
        charges,
        paymentTransactions,
        whatsappInstances,
        whatsappAutomations,
        whatsappLogs,
        systemSettings: systemSettings[0] || null
      };
    } catch (error) {
      console.error('Erro ao ler dados do PostgreSQL:', error);
      return null;
    }
  }

  // Upsert Tenant
  public async upsertTenant(tenant: { id: string; name: string; owner_email?: string; phone?: string; created_at?: string }) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.tenants)
        .values({
          id: tenant.id,
          name: tenant.name,
          ownerEmail: tenant.owner_email || null,
          phone: tenant.phone || null,
          createdAt: tenant.created_at ? new Date(tenant.created_at) : new Date()
        })
        .onConflictDoUpdate({
          target: schema.tenants.id,
          set: {
            name: tenant.name,
            ownerEmail: tenant.owner_email || null,
            phone: tenant.phone || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar tenant no PostgreSQL:', error);
    }
  }

  // Upsert User
  public async upsertUser(user: { id: string; email: string; full_name?: string; company_name?: string; phone?: string; role?: string; tenant_id: string; password_hash?: string; created_at?: string }) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.users)
        .values({
          uid: user.id,
          email: user.email,
          fullName: user.full_name || null,
          companyName: user.company_name || null,
          phone: user.phone || null,
          role: user.role || 'operator',
          tenantId: user.tenant_id,
          passwordHash: user.password_hash || null,
          createdAt: user.created_at ? new Date(user.created_at) : new Date()
        })
        .onConflictDoUpdate({
          target: schema.users.uid,
          set: {
            email: user.email,
            fullName: user.full_name || null,
            companyName: user.company_name || null,
            phone: user.phone || null,
            role: user.role || 'operator',
            passwordHash: user.password_hash || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar usuário no PostgreSQL:', error);
    }
  }

  // Upsert Customer
  public async upsertCustomer(c: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.customers)
        .values({
          id: c.id,
          tenantId: c.tenant_id,
          fullName: c.full_name,
          phone: c.phone || '',
          whatsapp: c.whatsapp || '',
          email: c.email || null,
          cpf: c.cpf || null,
          appId: c.app_id,
          planId: c.plan_id,
          monthlyFee: String(c.monthly_fee || 0),
          startDate: c.start_date || new Date().toISOString().split('T')[0],
          dueDate: c.due_date,
          paymentMethod: c.payment_method || 'pix',
          status: c.status || 'active',
          notes: c.notes || null,
          macAddress: c.mac_address || null,
          deviceKey: c.device_key || null,
          appUsername: c.app_username || null,
          appPassword: c.app_password || null,
          createdAt: c.created_at ? new Date(c.created_at) : new Date()
        })
        .onConflictDoUpdate({
          target: schema.customers.id,
          set: {
            fullName: c.full_name,
            phone: c.phone || '',
            whatsapp: c.whatsapp || '',
            email: c.email || null,
            cpf: c.cpf || null,
            appId: c.app_id,
            planId: c.plan_id,
            monthlyFee: String(c.monthly_fee || 0),
            startDate: c.start_date,
            dueDate: c.due_date,
            paymentMethod: c.payment_method || 'pix',
            status: c.status || 'active',
            notes: c.notes || null,
            macAddress: c.mac_address || null,
            deviceKey: c.device_key || null,
            appUsername: c.app_username || null,
            appPassword: c.app_password || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar cliente no PostgreSQL:', error);
    }
  }

  // Delete Customer
  public async deleteCustomer(id: string) {
    if (!this.isReady()) return;
    try {
      await db.delete(schema.customers).where(eq(schema.customers.id, id));
    } catch (error) {
      console.error('Falha ao deletar cliente do PostgreSQL:', error);
    }
  }

  // Upsert Application
  public async upsertApplication(app: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.applications)
        .values({
          id: app.id,
          tenantId: app.tenant_id,
          name: app.name,
          category: app.category || 'streaming',
          description: app.description || null,
          color: app.color || 'blue',
          status: app.status || 'active',
          devices: Array.isArray(app.devices) ? JSON.stringify(app.devices) : (app.devices || '[]'),
          loginType: app.login_type || 'xtream',
          requiresOwnLicense: Boolean(app.requires_own_license),
          downloadUrl: app.download_url || null,
          setupNotes: app.setup_notes || null,
          iconName: app.icon_name || null,
          createdAt: app.created_at ? new Date(app.created_at) : new Date()
        })
        .onConflictDoUpdate({
          target: schema.applications.id,
          set: {
            name: app.name,
            category: app.category || 'streaming',
            description: app.description || null,
            color: app.color || 'blue',
            status: app.status || 'active',
            devices: Array.isArray(app.devices) ? JSON.stringify(app.devices) : (app.devices || '[]'),
            loginType: app.login_type || 'xtream',
            requiresOwnLicense: Boolean(app.requires_own_license),
            downloadUrl: app.download_url || null,
            setupNotes: app.setup_notes || null,
            iconName: app.icon_name || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar app no PostgreSQL:', error);
    }
  }

  // Delete Application
  public async deleteApplication(id: string) {
    if (!this.isReady()) return;
    try {
      await db.delete(schema.applications).where(eq(schema.applications.id, id));
    } catch (error) {
      console.error('Falha ao deletar app do PostgreSQL:', error);
    }
  }

  // Upsert Plan
  public async upsertPlan(plan: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.plans)
        .values({
          id: plan.id,
          tenantId: plan.tenant_id,
          name: plan.name,
          description: plan.description || null,
          appId: plan.app_id,
          category: plan.category || null,
          price: String(plan.price || 0),
          billingCycle: plan.billing_cycle || 'mensal',
          durationDays: Number(plan.duration_days) || 30,
          status: plan.status || 'active',
          createdAt: plan.created_at ? new Date(plan.created_at) : new Date()
        })
        .onConflictDoUpdate({
          target: schema.plans.id,
          set: {
            name: plan.name,
            description: plan.description || null,
            appId: plan.app_id,
            category: plan.category || null,
            price: String(plan.price || 0),
            billingCycle: plan.billing_cycle || 'mensal',
            durationDays: Number(plan.duration_days) || 30,
            status: plan.status || 'active'
          }
        });
    } catch (error) {
      console.error('Falha ao salvar plano no PostgreSQL:', error);
    }
  }

  // Delete Plan
  public async deletePlan(id: string) {
    if (!this.isReady()) return;
    try {
      await db.delete(schema.plans).where(eq(schema.plans.id, id));
    } catch (error) {
      console.error('Falha ao deletar plano do PostgreSQL:', error);
    }
  }

  // Upsert Charge
  public async upsertCharge(charge: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.charges)
        .values({
          id: charge.id,
          tenantId: charge.tenant_id,
          customerId: charge.customer_id,
          customerName: charge.customer_name,
          appName: charge.app_name || null,
          planName: charge.plan_name || null,
          amount: String(charge.amount || 0),
          dueDate: charge.due_date,
          paidAt: charge.paid_at || null,
          status: charge.status || 'pending',
          paymentMethod: charge.payment_method || null,
          discount: String(charge.discount || 0),
          notes: charge.notes || null,
          registeredBy: charge.registered_by || null,
          createdAt: charge.created_at ? new Date(charge.created_at) : new Date()
        })
        .onConflictDoUpdate({
          target: schema.charges.id,
          set: {
            customerName: charge.customer_name,
            amount: String(charge.amount || 0),
            dueDate: charge.due_date,
            paidAt: charge.paid_at || null,
            status: charge.status || 'pending',
            paymentMethod: charge.payment_method || null,
            discount: String(charge.discount || 0),
            notes: charge.notes || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar cobrança no PostgreSQL:', error);
    }
  }

  // Delete Charge
  public async deleteCharge(id: string) {
    if (!this.isReady()) return;
    try {
      await db.delete(schema.charges).where(eq(schema.charges.id, id));
    } catch (error) {
      console.error('Falha ao deletar cobrança do PostgreSQL:', error);
    }
  }

  // Upsert License
  public async upsertLicense(lic: any) {
    if (!this.isReady()) return;
    try {
      const existing = await db.select().from(schema.licenses).where(
        or(eq(schema.licenses.tenantId, lic.tenant_id), eq(schema.licenses.id, lic.id))
      );
      if (existing.length > 0) {
        await db.update(schema.licenses).set({
          type: lic.type || 'trial',
          status: lic.status || 'active',
          trialExpiresAt: lic.trial_expires_at ? new Date(lic.trial_expires_at) : null,
          activatedAt: lic.activated_at ? new Date(lic.activated_at) : null,
          transactionId: lic.transaction_id || null,
          price: String(lic.price || '199.00')
        }).where(or(eq(schema.licenses.tenantId, lic.tenant_id), eq(schema.licenses.id, lic.id)));
      } else {
        await db.insert(schema.licenses)
          .values({
            id: lic.id,
            tenantId: lic.tenant_id,
            type: lic.type || 'trial',
            status: lic.status || 'active',
            trialStartedAt: lic.trial_started_at ? new Date(lic.trial_started_at) : new Date(),
            trialExpiresAt: lic.trial_expires_at ? new Date(lic.trial_expires_at) : null,
            activatedAt: lic.activated_at ? new Date(lic.activated_at) : null,
            transactionId: lic.transaction_id || null,
            price: String(lic.price || '199.00'),
            createdAt: lic.created_at ? new Date(lic.created_at) : new Date()
          })
          .onConflictDoUpdate({
            target: schema.licenses.id,
            set: {
              type: lic.type || 'trial',
              status: lic.status || 'active',
              trialExpiresAt: lic.trial_expires_at ? new Date(lic.trial_expires_at) : null,
              activatedAt: lic.activated_at ? new Date(lic.activated_at) : null,
              transactionId: lic.transaction_id || null,
              price: String(lic.price || '199.00')
            }
          });
      }
    } catch (error) {
      console.error('Falha ao salvar licença no PostgreSQL:', error);
    }
  }

  // Upsert Payment Transaction
  public async upsertTransaction(tx: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.paymentTransactions)
        .values({
          id: tx.id,
          tenantId: tx.tenant_id,
          mpPreferenceId: tx.mp_preference_id || null,
          mpPaymentId: tx.mp_payment_id || null,
          amount: String(tx.amount || 0),
          status: tx.status || 'pending',
          paymentMethod: tx.payment_method || 'pix',
          qrCode: tx.qr_code || null,
          qrCodeBase64: tx.qr_code_base64 || null,
          ticketUrl: tx.ticket_url || null,
          createdAt: tx.created_at ? new Date(tx.created_at) : new Date(),
          paidAt: tx.paid_at ? new Date(tx.paid_at) : null
        })
        .onConflictDoUpdate({
          target: schema.paymentTransactions.id,
          set: {
            status: tx.status || 'pending',
            mpPaymentId: tx.mp_payment_id || null,
            paidAt: tx.paid_at ? new Date(tx.paid_at) : null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar transação no PostgreSQL:', error);
    }
  }

  // Upsert WhatsApp Instance
  public async upsertWhatsAppInstance(inst: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.whatsappInstances)
        .values({
          id: inst.id,
          tenantId: inst.tenant_id,
          name: inst.name,
          provider: inst.provider || 'evolution',
          apiUrl: inst.api_url || null,
          status: inst.status || 'disconnected',
          phoneNumber: inst.phone_number || null,
          qrCode: inst.qr_code || null,
          lastConnectedAt: inst.last_connected_at ? new Date(inst.last_connected_at) : null,
          errorMessage: inst.error_message || null
        })
        .onConflictDoUpdate({
          target: schema.whatsappInstances.id,
          set: {
            status: inst.status || 'disconnected',
            phoneNumber: inst.phone_number || null,
            qrCode: inst.qr_code || null,
            lastConnectedAt: inst.last_connected_at ? new Date(inst.last_connected_at) : null,
            errorMessage: inst.error_message || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar instância WhatsApp no PostgreSQL:', error);
    }
  }

  // Upsert WhatsApp Automation
  public async upsertWhatsAppAutomation(auto: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.whatsappAutomations)
        .values({
          id: auto.id,
          tenantId: auto.tenant_id,
          isActive: Boolean(auto.is_active),
          sendOneDayBefore: Boolean(auto.send_one_day_before),
          sendOnDueDate: Boolean(auto.send_on_due_date),
          sendAfterDueDate: Boolean(auto.send_after_due_date),
          scheduledTime: auto.scheduled_time || '09:00',
          timezone: auto.timezone || 'America/Sao_Paulo',
          messageIntervalSeconds: Number(auto.message_interval_seconds) || 15,
          rateLimitPerHour: Number(auto.rate_limit_per_hour) || 60,
          instanceId: auto.instance_id || null,
          templateOneDayBefore: auto.template_one_day_before || null,
          templateDueDate: auto.template_due_date || null,
          templateAfterDueDate: auto.template_after_due_date || null
        })
        .onConflictDoUpdate({
          target: schema.whatsappAutomations.id,
          set: {
            isActive: Boolean(auto.is_active),
            sendOneDayBefore: Boolean(auto.send_one_day_before),
            sendOnDueDate: Boolean(auto.send_on_due_date),
            sendAfterDueDate: Boolean(auto.send_after_due_date),
            scheduledTime: auto.scheduled_time || '09:00',
            templateOneDayBefore: auto.template_one_day_before || null,
            templateDueDate: auto.template_due_date || null,
            templateAfterDueDate: auto.template_after_due_date || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar automação WhatsApp no PostgreSQL:', error);
    }
  }

  // Insert WhatsApp Log
  public async insertWhatsAppLog(log: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.whatsappLogs)
        .values({
          id: log.id,
          tenantId: log.tenant_id,
          customerId: log.customer_id,
          customerName: log.customer_name,
          phone: log.phone,
          eventType: log.event_type,
          messageContent: log.message_content,
          status: log.status || 'sent',
          errorReason: log.error_reason || null,
          sentAt: log.sent_at ? new Date(log.sent_at) : new Date()
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Falha ao salvar log WhatsApp no PostgreSQL:', error);
    }
  }

  // Upsert System Settings
  public async upsertSystemSettings(settings: any) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.systemSettings)
        .values({
          id: 'global',
          superAdminPasswordHash: settings.super_admin_password_hash || null,
          lifetimePrice: String(settings.lifetime_price || '199.00'),
          trialDurationHours: Number(settings.trial_duration_hours) || 24,
          mpAccessToken: settings.mp_access_token || null,
          mpWebhookSecret: settings.mp_webhook_secret || null
        })
        .onConflictDoUpdate({
          target: schema.systemSettings.id,
          set: {
            superAdminPasswordHash: settings.super_admin_password_hash || null,
            lifetimePrice: String(settings.lifetime_price || '199.00'),
            trialDurationHours: Number(settings.trial_duration_hours) || 24,
            mpAccessToken: settings.mp_access_token || null,
            mpWebhookSecret: settings.mp_webhook_secret || null
          }
        });
    } catch (error) {
      console.error('Falha ao salvar configurações do sistema no PostgreSQL:', error);
    }
  }

  // Save Used Device Fingerprint
  public async saveFingerprint(fingerprint: string, tenantId?: string) {
    if (!this.isReady()) return;
    try {
      await db.insert(schema.usedDeviceFingerprints)
        .values({
          fingerprint,
          tenantId: tenantId || null
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Falha ao registrar fingerprint no PostgreSQL:', error);
    }
  }
}

export const postgresService = new PostgresService();
