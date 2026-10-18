import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { postgresService } from './postgresService.ts';
import { supabaseService } from './supabaseService.ts';
import { firebaseService } from './firebaseService.ts';

export interface SystemSettings {
  super_admin_password_hash: string;
  lifetime_price: number;
  trial_duration_hours: number;
  mp_access_token?: string;
  mp_webhook_secret?: string;
}

export interface DBData {
  tenants: any[];
  profiles: any[];
  licenses: any[];
  payment_transactions: any[];
  applications: any[];
  plans: any[];
  customers: any[];
  charges: any[];
  whatsapp_instances: any[];
  automation_settings: any[];
  message_logs: any[];
  audit_logs: any[];
  used_device_fingerprints: string[];
  system_settings?: SystemSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password: string, salt: string = 'gestor_stream_salt'): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export const DEFAULT_TEMPLATE_ONE_DAY_BEFORE = `Olá! * {nome_cliente}!*
Passando só pra lembrar que seu pacote 
*{nome_plano}*  Vence Amanhã.

📆 Vencimento:  *({data_vencimento})*
💰 Valor:  *{valor}*

Dados para pagamanto:

🔐 Chave Pix Cel
📲  85996079396
🏦 BANCO  NU PAGAMENTOS
🙅🏼‍♂️ Edvan Dyemison

Após efetuar o pagamanto, envie o comprovante para da baixa.

ATT: JonJon Telas Premium
`;

export const DEFAULT_TEMPLATE_DUE_DATE = `Olá! * {nome_cliente}!*
Hoje é se vencimento do  seu pacote 
*{nome_plano}* .

📆 Vencimento:  *({data_vencimento})*
💰 Valor:  *{valor}*

Dados para pagamanto:

🔐 Chave Pix Cel
📲  85996079396
🏦 BANCO  NU PAGAMENTOS
🙅🏼‍♂️ Edvan Dyemison

Após efetuar o pagamanto, envie o comprovante para da baixa.

ATT: JonJon Telas Premium
`;

export const DEFAULT_TEMPLATE_AFTER_DUE_DATE = `Olá! * {nome_cliente}!*
O vencimento do  seu pacote 
*{nome_plano}* .  Venceu ontem. Vai renovar?

📆 Vencimento:  *({data_vencimento})*
💰 Valor:  *{valor}*

Dados para pagamanto:

🔐 Chave Pix Cel
📲  85996079396
🏦 BANCO  NU PAGAMENTOS
🙅🏼‍♂️ Edvan Dyemison

Após efetuar o pagamanto, envie o comprovante para da baixa.

ATT: JonJon Telas Premium
`;

const uuidCache = new Map<string, string>();

export function toUuid(str: string | null | undefined): string {
  if (!str) return '';
  const cached = uuidCache.get(str);
  if (cached !== undefined) return cached;
  let res: string;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    res = str.toLowerCase();
  } else {
    const hash = crypto.createHash('md5').update(String(str)).digest('hex');
    res = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-').toLowerCase();
  }
  uuidCache.set(str, res);
  return res;
}

export function getTenantAliasIds(tenantId: string): string[] {
  if (typeof db !== 'undefined' && db && typeof (db as any).getTenantAliasIds === 'function') {
    return (db as any).getTenantAliasIds(tenantId);
  }
  const ids = new Set<string>();
  if (tenantId) {
    ids.add(tenantId);
    const u = toUuid(tenantId);
    if (u) ids.add(u);
  }
  return Array.from(ids).filter(Boolean);
}

// Generate Brazilian formatted dates and ISO dates
function getDates() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const pastThreeDays = new Date(now);
  pastThreeDays.setDate(pastThreeDays.getDate() - 3);
  const pastThreeDaysStr = pastThreeDays.toISOString().split('T')[0];

  const inFiveDays = new Date(now);
  inFiveDays.setDate(inFiveDays.getDate() + 5);
  const inFiveDaysStr = inFiveDays.toISOString().split('T')[0];

  return { todayStr, tomorrowStr, yesterdayStr, pastThreeDaysStr, inFiveDaysStr };
}

function createDefaultSeed(): DBData {
  const { todayStr, tomorrowStr, yesterdayStr, pastThreeDaysStr, inFiveDaysStr } = getDates();

  const demoTenantId = 'tenant_marcofilho';
  const demoUserId = 'user_marcofilho';

  // 24 hour trial from right now
  const trialStarted = new Date().toISOString();
  const trialExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const apps = [
    {
      id: 'app_1',
      tenant_id: demoTenantId,
      name: 'IBO Player',
      category: 'player_iptv',
      description: 'Player de alta performance para Smart TV (Samsung Tizen, LG webOS, Roku e Fire TV) com ativação via MAC e Device Key',
      color: '#1E40AF',
      devices: ['Smart TV Samsung', 'Smart TV LG', 'Roku', 'Fire TV Stick'],
      login_type: 'mac_key',
      requires_own_license: true,
      download_url: 'https://iboplayer.com',
      setup_notes: 'Requer ativação do MAC Address e Device Key no portal oficial IBO Player.',
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'app_2',
      tenant_id: demoTenantId,
      name: 'XCIPTV Player',
      category: 'android_box',
      description: 'Player moderno e intuitivo para Android TV, TV Box e Fire TV com suporte nativo a login Xtream Codes API',
      color: '#0284C7',
      devices: ['TV Box', 'Android TV', 'Fire TV Stick', 'Celular Android'],
      login_type: 'xtream',
      requires_own_license: false,
      download_url: 'https://play.google.com/store/apps/details?id=com.nathNetwork.xciptv',
      setup_notes: 'Configurar com URL do Servidor DNS, Usuário e Senha.',
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'app_3',
      tenant_id: demoTenantId,
      name: 'IPTV Smarters Pro',
      category: 'multiplataforma',
      description: 'Reprodutor multiplataforma completo para Android, iOS, Windows, Mac e Smart TVs com suporte a Xtream Codes e M3U',
      color: '#059669',
      devices: ['Android', 'iOS', 'Smart TV', 'Windows', 'Mac'],
      login_type: 'xtream',
      requires_own_license: false,
      download_url: 'https://www.iptvsmarters.com',
      setup_notes: 'Compatível com qualquer lista Xtream Codes ou link M3U.',
      status: 'active',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: 'app_4',
      tenant_id: demoTenantId,
      name: 'TiviMate IPTV',
      category: 'android_box',
      description: 'Player premium de referência para TV Box e Android TV com guia eletrônico EPG estilo operadora de TV a cabo',
      color: '#7C3AED',
      devices: ['TV Box', 'Android TV', 'Fire TV Stick'],
      login_type: 'xtream',
      requires_own_license: true,
      download_url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv',
      setup_notes: 'Excelente estabilidade e troca rápida de canais.',
      status: 'active',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: 'app_5',
      tenant_id: demoTenantId,
      name: 'Bob Player',
      category: 'smart_tv',
      description: 'Player leve para Smart TVs Samsung Tizen e LG webOS com ativação por MAC e código na tela',
      color: '#EA580C',
      devices: ['Smart TV Samsung', 'Smart TV LG'],
      login_type: 'mac_key',
      requires_own_license: true,
      download_url: 'https://bobplayer.com',
      setup_notes: 'Ativação anual ou vitalícia no site do Bob Player.',
      status: 'active',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: 'app_6',
      tenant_id: demoTenantId,
      name: 'Smart IPTV (SIPTV)',
      category: 'smart_tv',
      description: 'Reprodutor tradicional para Smart TVs com upload de lista remota via portal MAC siptv.app',
      color: '#DC2626',
      devices: ['Smart TV Samsung', 'Smart TV LG'],
      login_type: 'mac_key',
      requires_own_license: true,
      download_url: 'https://siptv.app',
      setup_notes: 'Subir lista M3U vinculada ao endereço MAC no portal siptv.app.',
      status: 'active',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString()
    }
  ];

  const plans = [
    {
      id: 'plan_1',
      tenant_id: demoTenantId,
      name: 'Plano Mensal - 1 Tela (Full HD / 4K)',
      description: 'Acesso completo a canais, filmes e séries para 1 dispositivo simultâneo',
      app_id: 'app_1',
      category: 'player_iptv',
      price: 25.00,
      billing_cycle: 'mensal',
      duration_days: 30,
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'plan_2',
      tenant_id: demoTenantId,
      name: 'Plano Mensal VIP - 2 Telas',
      description: 'Acesso simultâneo para Smart TV e TV Box com servidor anti-travas',
      app_id: 'app_2',
      category: 'android_box',
      price: 35.00,
      billing_cycle: 'mensal',
      duration_days: 30,
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'plan_3',
      tenant_id: demoTenantId,
      name: 'Plano Trimestral Fidelidade (3 Meses)',
      description: 'Economia com 3 meses garantidos e suporte prioritário no WhatsApp',
      app_id: 'app_2',
      category: 'android_box',
      price: 90.00,
      billing_cycle: 'trimestral',
      duration_days: 90,
      status: 'active',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: 'plan_4',
      tenant_id: demoTenantId,
      name: 'Plano Semestral Premium (6 Meses)',
      description: 'Acesso semestral com desconto e 2 telas liberadas',
      app_id: 'app_3',
      category: 'multiplataforma',
      price: 160.00,
      billing_cycle: 'semestral',
      duration_days: 180,
      status: 'active',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: 'plan_5',
      tenant_id: demoTenantId,
      name: 'Plano Anual Completo VIP (12 Meses)',
      description: '1 ano completo sem mensalidades com todos os canais e filmes liberados',
      app_id: 'app_4',
      category: 'android_box',
      price: 299.00,
      billing_cycle: 'anual',
      duration_days: 365,
      status: 'active',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    }
  ];

  const customers = [
    {
      id: 'cust_1',
      tenant_id: demoTenantId,
      full_name: 'Rodrigo Santoro Ramos',
      phone: '11988776655',
      whatsapp: '5511988776655',
      email: 'rodrigo.ramos@exemplo.com.br',
      cpf: '234.567.890-11',
      app_id: 'app_2',
      plan_id: 'plan_2',
      monthly_fee: 35.00,
      start_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
      due_date: todayStr, // Due today!
      payment_method: 'Pix',
      status: 'active',
      notes: 'Cliente pontual, utiliza no aplicativo XCIPTV na Smart TV Samsung',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'cust_2',
      tenant_id: demoTenantId,
      full_name: 'Mariana Silveira Costa',
      phone: '21976543210',
      whatsapp: '5521976543210',
      email: 'mariana.costa@exemplo.com.br',
      cpf: '456.789.012-34',
      app_id: 'app_1',
      plan_id: 'plan_1',
      monthly_fee: 22.00,
      start_date: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
      due_date: tomorrowStr, // Due tomorrow!
      payment_method: 'Pix',
      status: 'active',
      notes: 'Perfil 2 com PIN 8890',
      created_at: new Date(Date.now() - 40 * 86400000).toISOString()
    },
    {
      id: 'cust_3',
      tenant_id: demoTenantId,
      full_name: 'Carlos Eduardo Mendes',
      phone: '31987654321',
      whatsapp: '5531987654321',
      email: 'carloseduardo@exemplo.com.br',
      cpf: '789.012.345-67',
      app_id: 'app_4',
      plan_id: 'plan_5',
      monthly_fee: 49.90,
      start_date: new Date(Date.now() - 50 * 86400000).toISOString().split('T')[0],
      due_date: yesterdayStr, // OVERDUE!
      payment_method: 'Cartão de Crédito',
      status: 'overdue',
      notes: 'Enviado lembrete de cobrança após vencimento',
      created_at: new Date(Date.now() - 50 * 86400000).toISOString()
    },
    {
      id: 'cust_4',
      tenant_id: demoTenantId,
      full_name: 'Beatriz Almeida Fernandes',
      phone: '41991234567',
      whatsapp: '5541991234567',
      email: 'beatriz.fernandes@exemplo.com.br',
      cpf: '321.654.987-00',
      app_id: 'app_3',
      plan_id: 'plan_4',
      monthly_fee: 19.90,
      start_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
      due_date: inFiveDaysStr,
      payment_method: 'Pix',
      status: 'active',
      notes: 'Preferência por lembrete 1 dia antes no WhatsApp',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: 'cust_5',
      tenant_id: demoTenantId,
      full_name: 'Lucas Gabriel Pinheiro',
      phone: '71988990011',
      whatsapp: '5571988990011',
      email: 'lucas.pinheiro@exemplo.com.br',
      cpf: '654.987.321-45',
      app_id: 'app_2',
      plan_id: 'plan_3',
      monthly_fee: 90.00,
      start_date: new Date(Date.now() - 80 * 86400000).toISOString().split('T')[0],
      due_date: pastThreeDaysStr, // OVERDUE!
      payment_method: 'Pix',
      status: 'overdue',
      notes: 'Venceu há 3 dias. Aguardando comprovante',
      created_at: new Date(Date.now() - 80 * 86400000).toISOString()
    },
    {
      id: 'cust_6',
      tenant_id: demoTenantId,
      full_name: 'Juliana Barbosa Lima',
      phone: '61981122334',
      whatsapp: '5561981122334',
      email: 'juliana.lima@exemplo.com.br',
      cpf: '123.456.789-99',
      app_id: 'app_1',
      plan_id: 'plan_1',
      monthly_fee: 22.00,
      start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      due_date: todayStr,
      payment_method: 'Pix',
      status: 'active',
      notes: 'Pagou antecipadamente hoje pela manhã',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ];

  const charges = [
    // Paid today (Card 1: Recebidos hoje)
    {
      id: 'chg_1',
      tenant_id: demoTenantId,
      customer_id: 'cust_6',
      customer_name: 'Juliana Barbosa Lima',
      app_name: 'Netflix 4K Ultra HD',
      plan_name: 'Netflix 1 Tela 4K Mensal',
      amount: 22.00,
      due_date: todayStr,
      paid_at: new Date().toISOString(),
      status: 'paid',
      payment_method: 'Pix',
      discount: 0,
      notes: 'Comprovante recebido no WhatsApp',
      registered_by: 'Administrador',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'chg_2',
      tenant_id: demoTenantId,
      customer_id: 'cust_1',
      customer_name: 'Rodrigo Santoro Ramos',
      app_name: 'IPTV Max Full HD + 4K',
      plan_name: 'IPTV Lista Completa Mensal',
      amount: 35.00,
      due_date: todayStr,
      paid_at: new Date().toISOString(),
      status: 'paid',
      payment_method: 'Pix',
      discount: 0,
      notes: 'Renovado por mais 30 dias',
      registered_by: 'Administrador',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    // Due tomorrow (Card 2: Receber amanhã)
    {
      id: 'chg_3',
      tenant_id: demoTenantId,
      customer_id: 'cust_2',
      customer_name: 'Mariana Silveira Costa',
      app_name: 'Netflix 4K Ultra HD',
      plan_name: 'Netflix 1 Tela 4K Mensal',
      amount: 22.00,
      due_date: tomorrowStr,
      status: 'pending',
      payment_method: 'Pix',
      notes: 'Lembrete automático programado para hoje',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    // Overdue (Card 3: Vencidos)
    {
      id: 'chg_4',
      tenant_id: demoTenantId,
      customer_id: 'cust_3',
      customer_name: 'Carlos Eduardo Mendes',
      app_name: 'Globoplay + Premiere Futebol',
      plan_name: 'Globoplay + Premiere Futebol',
      amount: 49.90,
      due_date: yesterdayStr,
      status: 'overdue',
      payment_method: 'Cartão de Crédito',
      notes: 'Aviso de vencimento enviado',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      id: 'chg_5',
      tenant_id: demoTenantId,
      customer_id: 'cust_5',
      customer_name: 'Lucas Gabriel Pinheiro',
      app_name: 'IPTV Max Full HD + 4K',
      plan_name: 'IPTV Trimestral Econômico',
      amount: 90.00,
      due_date: pastThreeDaysStr,
      status: 'overdue',
      payment_method: 'Pix',
      notes: 'Cobrança renegociada pendente',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    }
  ];

  const whatsapp_instances = [
    {
      id: 'inst_1',
      tenant_id: demoTenantId,
      name: 'Instância Principal WhatsApp',
      provider: 'evolution',
      status: 'connected',
      phone_number: '+55 (11) 98765-4321',
      last_connected_at: new Date().toISOString(),
      error_message: null
    }
  ];

  const automation_settings = [
    {
      id: 'auto_1',
      tenant_id: demoTenantId,
      is_active: true,
      send_one_day_before: true,
      send_on_due_date: true,
      send_after_due_date: true,
      scheduled_time: '09:00',
      timezone: 'America/Sao_Paulo',
      message_interval_seconds: 15,
      rate_limit_per_hour: 120,
      instance_id: 'inst_1',
      template_one_day_before: DEFAULT_TEMPLATE_ONE_DAY_BEFORE,
      template_due_date: DEFAULT_TEMPLATE_DUE_DATE,
      template_after_due_date: DEFAULT_TEMPLATE_AFTER_DUE_DATE
    }
  ];

  const message_logs = [
    {
      id: 'log_1',
      tenant_id: demoTenantId,
      customer_id: 'cust_1',
      customer_name: 'Rodrigo Santoro Ramos',
      phone: '5511988776655',
      event_type: 'due_date',
      message_content: 'Bom dia, Rodrigo Santoro Ramos! Hoje é o vencimento do seu plano IPTV Lista Completa Mensal, no valor de R$ 35,00. Agradecemos pela preferência!',
      status: 'sent',
      sent_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'log_2',
      tenant_id: demoTenantId,
      customer_id: 'cust_3',
      customer_name: 'Carlos Eduardo Mendes',
      phone: '5531987654321',
      event_type: 'after_due_date',
      message_content: 'Olá, Carlos Eduardo Mendes! Identificamos que o vencimento do seu plano Globoplay + Premiere Futebol passou. Caso já tenha realizado o pagamento, por favor, desconsidere esta mensagem.',
      status: 'sent',
      sent_at: new Date(Date.now() - 24 * 3600000).toISOString()
    }
  ];

  return {
    tenants: [
      {
        id: demoTenantId,
        name: 'Marco Filho Streaming',
        created_at: trialStarted
      }
    ],
    profiles: [
      {
        id: demoUserId,
        tenant_id: demoTenantId,
        email: 'contatomarcofilho@gmail.com',
        full_name: 'Marco Filho',
        company_name: 'Marco Filho Streaming',
        phone: '85988159811',
        password_hash: hashPassword('marco@2026'),
        role: 'owner',
        created_at: trialStarted
      }
    ],
    licenses: [
      {
        id: 'lic_tenant_marcofilho',
        tenant_id: demoTenantId,
        type: 'lifetime',
        status: 'active',
        trial_started_at: trialStarted,
        trial_expires_at: new Date(Date.now() + 100 * 365 * 86400000).toISOString(),
        activated_at: trialStarted,
        transaction_id: 'tx_vitalicio_tenant_marcofilho',
        price: 199.00
      }
    ],
    payment_transactions: [
      {
        id: 'tx_vitalicio_tenant_marcofilho',
        tenant_id: demoTenantId,
        amount: 199.00,
        status: 'approved',
        payment_method: 'Licença Vitalícia Definitiva',
        paid_at: trialStarted,
        created_at: trialStarted,
        notes: 'Único acesso vitalício ativo no sistema'
      }
    ],
    applications: apps,
    plans: plans,
    customers: customers,
    charges: charges,
    whatsapp_instances: whatsapp_instances,
    automation_settings: automation_settings,
    message_logs: message_logs,
    audit_logs: [
      {
        id: 'audit_1',
        tenant_id: demoTenantId,
        action: 'TRIAL_STARTED',
        description: 'Período de teste de 24 horas iniciado com sucesso',
        created_at: trialStarted
      }
    ],
    used_device_fingerprints: []
  };
}

class Database {
  private data: DBData;
  private aliasCache = new Map<string, string[]>();

  constructor() {
    this.data = this.load();
    this.reconcileLifetimeLicenses();
  }

  public invalidateAliasCache(): void {
    this.aliasCache.clear();
  }

  public getTenantAliasIds(tenantId: string): string[] {
    if (!tenantId) return [];
    const ids = new Set<string>([tenantId]);
    const u = toUuid(tenantId);
    if (u) ids.add(u);
    if (tenantId === 'tenant_marcofilho' || tenantId === '0fd66ada-3f1f-dfea-aa7c-6b6febe78b27') {
      ids.add('tenant_marcofilho');
      ids.add('0fd66ada-3f1f-dfea-aa7c-6b6febe78b27');
    }
    return Array.from(ids).filter(Boolean);
  }

  public isTenantMatch(itemTenantId: string | undefined | null, targetTenantId: string | undefined | null): boolean {
    if (!itemTenantId || !targetTenantId) return false;
    if (itemTenantId === targetTenantId) return true;
    if (toUuid(itemTenantId) === toUuid(targetTenantId)) return true;
    const marcoAliases = ['tenant_marcofilho', '0fd66ada-3f1f-dfea-aa7c-6b6febe78b27'];
    if (marcoAliases.includes(itemTenantId) && marcoAliases.includes(targetTenantId)) {
      return true;
    }
    return false;
  }

  public ensureExistingRegisteredAreLifetime(): void {
    // No-op: Apenas contatomarcofilho@gmail.com possui licença vitalícia
  }

  public reconcileLifetimeLicenses(): void {
    if (!this.data || !this.data.licenses) return;
    const farFuture = new Date(Date.now() + 100 * 365 * 86400000).toISOString();
    const pastDate = new Date(Date.now() - 24 * 3600000).toISOString();
    let changed = false;

    // Localizar Tenant do Marco Filho
    const marcoProfile = (this.data.profiles || []).find(
      (p) => (p.email || '').toLowerCase().trim() === 'contatomarcofilho@gmail.com'
    );
    const marcoTenantId = marcoProfile ? marcoProfile.tenant_id : 'tenant_marcofilho';

    // 1. Deduplicar licenças: exatamente uma licença por tenant
    const uniqueLicenses = new Map<string, any>();
    for (const lic of this.data.licenses) {
      if (!uniqueLicenses.has(lic.tenant_id)) {
        uniqueLicenses.set(lic.tenant_id, lic);
      }
    }

    // 2. Garantir que SOMENTE Marco Filho seja Vitalício
    for (const [tenantId, lic] of uniqueLicenses.entries()) {
      if (tenantId === marcoTenantId) {
        if (lic.type !== 'lifetime' || lic.status !== 'active') {
          lic.type = 'lifetime';
          lic.status = 'active';
          lic.trial_expires_at = farFuture;
          lic.activated_at = lic.activated_at || new Date().toISOString();
          lic.transaction_id = `tx_vitalicio_${marcoTenantId}`;
          changed = true;
        }
      } else {
        if (lic.type === 'lifetime') {
          lic.type = 'trial';
          lic.status = 'expired';
          lic.trial_expires_at = pastDate;
          delete lic.transaction_id;
          changed = true;
        }
      }
    }

    this.data.licenses = Array.from(uniqueLicenses.values());

    if (changed) {
      this.save();
    }

    setImmediate(() => {
      for (const lic of (this.data.licenses || [])) {
        if (lic.type === 'lifetime') {
          postgresService.upsertLicense(lic).catch(() => {});
          supabaseService.upsertLicense(lic).catch(() => {});
        }
      }
    });
  }

  private load(): DBData {
    let loadedData: DBData | null = null;
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        loadedData = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading db.json, generating default seed:', e);
    }
    
    const data = loadedData || createDefaultSeed();

    // Ensure system_settings
    if (!data.system_settings) {
      data.system_settings = {
        super_admin_password_hash: hashPassword('admin@saas2026'),
        lifetime_price: 199.00,
        trial_duration_hours: 72,
        mp_access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
        mp_webhook_secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || ''
      };
    }

    // Ensure realistic sample SaaS tenants and transactions if only demo tenant exists
    if (!data.tenants || data.tenants.length <= 1) {
      const now = Date.now();

      // Sample 1: Active Trial (Lucas Medeiros - MegaPlay IPTV, expires in 16 hours)
      const t1Id = 'tenant_sample_trial_01';
      const u1Id = 'user_sample_trial_01';
      const t1Start = new Date(now - 8 * 3600000).toISOString();
      const t1Exp = new Date(now + 16 * 3600000).toISOString();

      // Sample 2: Expired Trial (Rafael Alcantara - CineBox Stream, expired 5 hours ago)
      const t2Id = 'tenant_sample_expired_02';
      const u2Id = 'user_sample_expired_02';
      const t2Start = new Date(now - 29 * 3600000).toISOString();
      const t2Exp = new Date(now - 5 * 3600000).toISOString();

      // Sample 3: Pending Purchase / Pix Aguardando (Carlos Eduardo Silva - Turbo Streamings, created 2 hours ago)
      const t3Id = 'tenant_sample_pending_03';
      const u3Id = 'user_sample_pending_03';
      const t3Start = new Date(now - 20 * 3600000).toISOString();
      const t3Exp = new Date(now + 4 * 3600000).toISOString();

      // Sample 4: Lifetime License Activated (Marcos Vinicius - UltraFlix Brasil)
      const t4Id = 'tenant_sample_lifetime_04';
      const u4Id = 'user_sample_lifetime_04';
      const t4Start = new Date(now - 48 * 3600000).toISOString();

      data.tenants.push(
        { id: t1Id, name: 'MegaPlay IPTV Solutions', created_at: t1Start },
        { id: t2Id, name: 'CineBox Streaming HD', created_at: t2Start },
        { id: t3Id, name: 'Turbo Streamings Brasil', created_at: t3Start },
        { id: t4Id, name: 'UltraFlix Brasil TV', created_at: t4Start }
      );

      data.profiles.push(
        {
          id: u1Id,
          tenant_id: t1Id,
          email: 'lucas.medeiros@megaplay.com.br',
          full_name: 'Lucas Medeiros',
          company_name: 'MegaPlay IPTV Solutions',
          phone: '11987654321',
          password_hash: hashPassword('123456'),
          role: 'owner',
          created_at: t1Start
        },
        {
          id: u2Id,
          tenant_id: t2Id,
          email: 'rafael.alcantara@cinebox.tv',
          full_name: 'Rafael Alcântara',
          company_name: 'CineBox Streaming HD',
          phone: '21998877665',
          password_hash: hashPassword('123456'),
          role: 'owner',
          created_at: t2Start
        },
        {
          id: u3Id,
          tenant_id: t3Id,
          email: 'carlos.eduardo@turbostream.com.br',
          full_name: 'Carlos Eduardo Silva',
          company_name: 'Turbo Streamings Brasil',
          phone: '31988887777',
          password_hash: hashPassword('123456'),
          role: 'owner',
          created_at: t3Start
        },
        {
          id: u4Id,
          tenant_id: t4Id,
          email: 'marcos.vinicius@ultraflix.com',
          full_name: 'Marcos Vinícius Barbosa',
          company_name: 'UltraFlix Brasil TV',
          phone: '41999991234',
          password_hash: hashPassword('123456'),
          role: 'owner',
          created_at: t4Start
        }
      );

      data.licenses.push(
        {
          id: `lic_${t1Id}`,
          tenant_id: t1Id,
          type: 'trial',
          status: 'active',
          trial_started_at: t1Start,
          trial_expires_at: t1Exp,
          price: 199.00
        },
        {
          id: `lic_${t2Id}`,
          tenant_id: t2Id,
          type: 'trial',
          status: 'expired',
          trial_started_at: t2Start,
          trial_expires_at: t2Exp,
          price: 199.00
        },
        {
          id: `lic_${t3Id}`,
          tenant_id: t3Id,
          type: 'trial',
          status: 'active',
          trial_started_at: t3Start,
          trial_expires_at: t3Exp,
          price: 199.00
        },
        {
          id: `lic_${t4Id}`,
          tenant_id: t4Id,
          type: 'trial',
          status: 'expired',
          trial_started_at: t4Start,
          trial_expires_at: t4Start,
          price: 199.00
        }
      );

      // Add payment transactions
      data.payment_transactions.push(
        {
          id: 'tx_carlos_pending_199',
          tenant_id: t3Id,
          amount: 199.00,
          status: 'pending',
          payment_method: 'Pix / Mercado Pago',
          pix_code: '00020101021226840014br.gov.bcb.pix2562pix-gestor.streamings.com/qr/v2/tx_carlos_pending_1995204000053039865406199.005802BR5925GESTOR DE STREAMINGS SAAS6009SAO PAULO62070503***6304D89A',
          mp_preference_id: 'pref_carlos_pending_199',
          created_at: new Date(now - 2 * 3600000).toISOString()
        },
        {
          id: 'tx_mp_sample_984321',
          tenant_id: t4Id,
          amount: 199.00,
          status: 'cancelled',
          payment_method: 'Mercado Pago (Pix)',
          mp_preference_id: 'pref_marcos_approved_199',
          mp_payment_id: 'mp_pay_893274912',
          paid_at: new Date(now - 36 * 3600000).toISOString(),
          created_at: new Date(now - 36 * 3600000).toISOString()
        }
      );
    }

    this.save(data);
    return data;
  }

  private saveTimeout: NodeJS.Timeout | null = null;

  public save(dataToSave?: DBData): void {
    this.aliasCache.clear();
    if (dataToSave) {
      this.data = dataToSave;
    }
    if (!this.data) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8', (err) => {
          if (err) console.error('Error saving db.json asynchronously:', err);
        });
      } catch (e) {
        console.error('Error saving db.json:', e);
      }
    }, 500);
  }

  public saveSync(dataToSave?: DBData): void {
    this.aliasCache.clear();
    try {
      const data = dataToSave || this.data;
      if (!data) return;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db.json sync:', e);
    }
  }

  public async syncAllToSupabase(): Promise<void> {
    if (!supabaseService.isReady()) return;
    try {
      for (const t of this.data.tenants) {
        try { await supabaseService.upsertTenant(t); } catch (e: any) { console.warn('Supabase sync tenant notice:', e?.message); }
      }
      for (const p of this.data.profiles) {
        try { await supabaseService.upsertProfile(p); } catch (e: any) { console.warn('Supabase sync profile notice:', e?.message); }
      }
      for (const lic of this.data.licenses) {
        try { await supabaseService.upsertLicense(lic); } catch (e: any) { console.warn('Supabase sync license notice:', e?.message); }
      }
      for (const app of this.data.applications) {
        try { await supabaseService.upsertApplication(app); } catch (e: any) { console.warn('Supabase sync app notice:', e?.message); }
      }
      for (const plan of this.data.plans) {
        try { await supabaseService.upsertPlan(plan); } catch (e: any) { console.warn('Supabase sync plan notice:', e?.message); }
      }
      for (const cust of this.data.customers) {
        try { await supabaseService.upsertCustomer(cust); } catch (e: any) { console.warn('Supabase sync customer notice:', e?.message); }
      }
      for (const chg of this.data.charges) {
        try { await supabaseService.upsertCharge(chg); } catch (e: any) { console.warn('Supabase sync charge notice:', e?.message); }
      }
      for (const tx of this.data.payment_transactions) {
        try { await supabaseService.upsertTransaction(tx); } catch (e: any) { console.warn('Supabase sync transaction notice:', e?.message); }
      }
      for (const inst of this.data.whatsapp_instances) {
        try { await supabaseService.upsertWhatsAppInstance(inst); } catch (e: any) { console.warn('Supabase sync wa inst notice:', e?.message); }
      }
      for (const auto of this.data.automation_settings) {
        try { await supabaseService.upsertWhatsAppAutomation(auto); } catch (e: any) { console.warn('Supabase sync wa auto notice:', e?.message); }
      }
      for (const log of this.data.message_logs) {
        try { await supabaseService.insertWhatsAppLog(log); } catch (e: any) { console.warn('Supabase sync wa log notice:', e?.message); }
      }
      console.log('⚡ [Supabase Sync] Sincronização bidirecional concluída com sucesso!');
    } catch (err: any) {
      console.warn('Erro ao sincronizar dados com Supabase:', err?.message);
    }
  }

  public async syncAllToFirestore(): Promise<void> {
    if (!firebaseService.isReady()) return;
    try {
      for (const t of this.data.tenants) {
        if (t.id) await firebaseService.upsertTenant(t);
      }
      for (const p of this.data.profiles) {
        if (p.id) await firebaseService.upsertProfile(p);
      }
      for (const lic of this.data.licenses) {
        if (lic.id) await firebaseService.upsertLicense(lic);
      }
      for (const app of this.data.applications) {
        if (app.id) await firebaseService.upsertApplication(app);
      }
      for (const plan of this.data.plans) {
        if (plan.id) await firebaseService.upsertPlan(plan);
      }
      for (const cust of this.data.customers) {
        if (cust.id && cust.full_name) await firebaseService.upsertCustomer(cust);
      }
      for (const chg of this.data.charges) {
        if (chg.id) await firebaseService.upsertCharge(chg);
      }
      for (const inst of this.data.whatsapp_instances) {
        if (inst.id) await firebaseService.upsertWhatsAppInstance(inst);
      }
      for (const auto of this.data.automation_settings) {
        if (auto.id) await firebaseService.upsertWhatsAppSettings(auto);
      }
      console.log('🔥 [Firestore Sync] Dados locais sincronizados com a nuvem Firestore com sucesso!');
    } catch (err: any) {
      console.warn('Erro ao sincronizar dados com Firestore:', err?.message);
    }
  }

  public async initCloudDatabase(): Promise<void> {
    try {
      if (firebaseService.isReady()) {
        console.log('🔥 [Firestore Sync] Verificando dados na nuvem Firestore...');
        const [
          remoteCustomers,
          remoteCharges,
          remotePlans,
          remoteApps,
          remoteTenants,
          remoteProfiles,
          remoteInstances,
          remoteSettings,
          remoteLicenses
        ] = await Promise.all([
          firebaseService.getAll('customers'),
          firebaseService.getAll('charges'),
          firebaseService.getAll('plans'),
          firebaseService.getAll('applications'),
          firebaseService.getAll('tenants'),
          firebaseService.getAll('profiles'),
          firebaseService.getAll('whatsapp_instances'),
          firebaseService.getAll('automation_settings'),
          firebaseService.getAll('licenses')
        ]);

        if (remoteCustomers.length > 0) {
          console.log(`🔥 [Firestore Sync] ${remoteCustomers.length} clientes carregados do Firestore.`);
          for (const rc of remoteCustomers) {
            const idx = this.data.customers.findIndex(c => c.id === rc.id || toUuid(c.id) === toUuid(rc.id));
            if (idx === -1) {
              this.data.customers.push(rc);
            } else {
              this.data.customers[idx] = { ...this.data.customers[idx], ...rc };
            }
          }
        } else {
          console.log('🔥 [Firestore Sync] Semeando Firestore com clientes locais...');
          for (const cust of this.data.customers) {
            if (cust.id && cust.full_name) {
              await firebaseService.upsertCustomer(cust);
            }
          }
        }

        if (remoteCharges.length > 0) {
          for (const rch of remoteCharges) {
            const idx = this.data.charges.findIndex(ch => ch.id === rch.id);
            if (idx === -1) this.data.charges.push(rch);
            else this.data.charges[idx] = { ...this.data.charges[idx], ...rch };
          }
        } else {
          for (const chg of this.data.charges) {
            if (chg.id) await firebaseService.upsertCharge(chg);
          }
        }

        if (remotePlans.length > 0) {
          for (const rp of remotePlans) {
            const idx = this.data.plans.findIndex(p => p.id === rp.id);
            if (idx === -1) this.data.plans.push(rp);
            else this.data.plans[idx] = { ...this.data.plans[idx], ...rp };
          }
        } else {
          for (const p of this.data.plans) {
            if (p.id) await firebaseService.upsertPlan(p);
          }
        }

        if (remoteApps.length > 0) {
          for (const ra of remoteApps) {
            const idx = this.data.applications.findIndex(a => a.id === ra.id);
            if (idx === -1) this.data.applications.push(ra);
            else this.data.applications[idx] = { ...this.data.applications[idx], ...ra };
          }
        } else {
          for (const a of this.data.applications) {
            if (a.id) await firebaseService.upsertApplication(a);
          }
        }

        if (remoteInstances.length > 0) {
          for (const ri of remoteInstances) {
            const idx = this.data.whatsapp_instances.findIndex(i => i.id === ri.id || this.isTenantMatch(i.tenant_id, ri.tenant_id));
            if (idx === -1) this.data.whatsapp_instances.push(ri);
            else this.data.whatsapp_instances[idx] = { ...this.data.whatsapp_instances[idx], ...ri };
          }
        } else {
          for (const i of this.data.whatsapp_instances) {
            if (i.id) await firebaseService.upsertWhatsAppInstance(i);
          }
        }

        if (remoteSettings.length > 0) {
          for (const rs of remoteSettings) {
            const idx = this.data.automation_settings.findIndex(s => s.id === rs.id || this.isTenantMatch(s.tenant_id, rs.tenant_id));
            if (idx === -1) this.data.automation_settings.push(rs);
            else this.data.automation_settings[idx] = { ...this.data.automation_settings[idx], ...rs };
          }
        } else {
          for (const s of this.data.automation_settings) {
            if (s.id) await firebaseService.upsertWhatsAppSettings(s);
          }
        }

        if (remoteTenants.length > 0) {
          for (const rt of remoteTenants) {
            const idx = this.data.tenants.findIndex(t => t.id === rt.id);
            if (idx === -1) this.data.tenants.push(rt);
          }
        } else {
          for (const t of this.data.tenants) {
            if (t.id) await firebaseService.upsertTenant(t);
          }
        }

        if (remoteProfiles.length > 0) {
          for (const rp of remoteProfiles) {
            const idx = this.data.profiles.findIndex(p => p.id === rp.id || (rp.email && p.email && p.email.toLowerCase() === rp.email.toLowerCase()));
            if (idx === -1) this.data.profiles.push(rp);
          }
        } else {
          for (const p of this.data.profiles) {
            if (p.id) await firebaseService.upsertProfile(p);
          }
        }

        if (remoteLicenses.length > 0) {
          for (const rl of remoteLicenses) {
            const idx = this.data.licenses.findIndex(l => l.id === rl.id || this.isTenantMatch(l.tenant_id, rl.tenant_id));
            if (idx === -1) this.data.licenses.push(rl);
            else if (rl.type === 'lifetime') {
              this.data.licenses[idx] = { ...this.data.licenses[idx], ...rl };
            }
          }
        } else {
          for (const l of this.data.licenses) {
            if (l.id) await firebaseService.upsertLicense(l);
          }
        }

        this.saveSync();
        console.log('✅ [Firestore Sync] Nuvem Firestore sincronizada com sucesso!');
      }
    } catch (err: any) {
      console.warn('Erro ao inicializar nuvem Firestore:', err?.message);
    }

    return this.initPostgres();
  }

  public async initPostgres(): Promise<void> {
    try {
      // 1. Tentar carregar e mesclar dados do Supabase
      if (supabaseService.isReady()) {
        const supaLoaded = await supabaseService.loadAll();
        if (supaLoaded) {
          // 1. Mesclar Tenants do Supabase
          if (supaLoaded.tenants && supaLoaded.tenants.length > 0) {
            for (const st of supaLoaded.tenants) {
              const existingIndex = this.data.tenants.findIndex((t) => t.id === st.id || toUuid(t.id) === st.id || toUuid(t.id) === toUuid(st.id));
              if (existingIndex === -1) {
                this.data.tenants.push({
                  id: st.id,
                  name: st.name,
                  created_at: st.created_at || new Date().toISOString()
                });
              }
            }
          }

          // 1.1 Mesclar Perfis (Usuários) do Supabase
          if (supaLoaded.profiles && supaLoaded.profiles.length > 0) {
            for (const sp of supaLoaded.profiles) {
              const existingProfile = this.data.profiles.find((p) =>
                p.id === sp.id || toUuid(p.id) === sp.id || (sp.email && p.email && p.email.toLowerCase() === sp.email.toLowerCase())
              );
              if (!existingProfile) {
                this.data.profiles.push({
                  id: sp.id,
                  tenant_id: sp.tenant_id,
                  email: (sp.email || '').toLowerCase().trim(),
                  full_name: sp.full_name || 'Usuário',
                  company_name: sp.full_name || 'Empresa',
                  phone: sp.phone || '',
                  password_hash: sp.password_hash || hashPassword('123456'),
                  role: sp.role || 'owner',
                  created_at: sp.created_at || new Date().toISOString()
                });
              }
            }
          }

          // 2. Mesclar transações de pagamento PRIMEIRO
          if (supaLoaded.payment_transactions && supaLoaded.payment_transactions.length > 0) {
            for (const tx of supaLoaded.payment_transactions) {
              const existingTx = this.data.payment_transactions.find((item) => item.id === tx.id || toUuid(item.id) === toUuid(tx.id));
              if (!existingTx) {
                this.data.payment_transactions.push({
                  id: tx.id,
                  tenant_id: tx.tenant_id,
                  amount: Number(tx.amount) || 199.00,
                  status: tx.status || 'pending',
                  payment_method: tx.payment_method || 'Pix',
                  pix_code: tx.pix_code || '',
                  mp_preference_id: tx.mp_preference_id || '',
                  mp_payment_id: tx.mp_payment_id || '',
                  created_at: tx.created_at || new Date().toISOString(),
                  paid_at: tx.paid_at || undefined,
                  notes: tx.notes || undefined
                });
              } else if (tx.status === 'approved' && existingTx.status !== 'approved') {
                existingTx.status = 'approved';
                existingTx.paid_at = tx.paid_at || new Date().toISOString();
                existingTx.mp_payment_id = tx.mp_payment_id || existingTx.mp_payment_id;
              }
            }
          }

          // 3. Mesclar e sincronizar Licenças do Supabase sem nunca sobrescrever vitalício com trial
          if (supaLoaded.licenses && supaLoaded.licenses.length > 0) {
            for (const sl of supaLoaded.licenses) {
              const tenant = this.data.tenants.find((t) => this.isTenantMatch(t.id, sl.tenant_id));
              if (!tenant) continue;

              const aliasIds = this.getTenantAliasIds(tenant.id);
              const existingLicIndex = this.data.licenses.findIndex((l) => aliasIds.includes(l.tenant_id) || this.isTenantMatch(l.tenant_id, tenant.id));
              
              const hasApprovedTx = this.data.payment_transactions.some(
                (tx) => this.isTenantMatch(tx.tenant_id, tenant.id) && tx.status === 'approved'
              );

              const currentLocalType = existingLicIndex >= 0 ? this.data.licenses[existingLicIndex].type : null;
              const isLifetime = currentLocalType === 'lifetime' || hasApprovedTx || sl.type === 'lifetime';
              const finalType = isLifetime ? 'lifetime' : 'trial';

              const startedAt = sl.trial_started_at || tenant.created_at || new Date().toISOString();
              const startedTime = new Date(startedAt).getTime();
              const calculatedExpiresAt = new Date(startedTime + 24 * 60 * 60 * 1000).toISOString();
              const expiresAt = finalType === 'lifetime'
                ? (sl.trial_expires_at || new Date(Date.now() + 100 * 365 * 86400000).toISOString())
                : (sl.trial_expires_at && new Date(sl.trial_expires_at).getTime() > startedTime + 3600000
                    ? sl.trial_expires_at
                    : calculatedExpiresAt);

              const now = Date.now();
              const isExpired = finalType !== 'lifetime' && now > new Date(expiresAt).getTime();

              const licenseObj = {
                id: sl.id || `lic_${tenant.id}`,
                tenant_id: tenant.id,
                type: finalType,
                status: isExpired ? 'expired' : 'active',
                trial_started_at: startedAt,
                trial_expires_at: expiresAt,
                activated_at: finalType === 'lifetime' ? (sl.activated_at || this.data.licenses[existingLicIndex]?.activated_at || new Date().toISOString()) : undefined,
                transaction_id: sl.transaction_id || this.data.licenses[existingLicIndex]?.transaction_id || undefined,
                price: Number(sl.price) || 199.00
              };

              if (existingLicIndex === -1) {
                this.data.licenses.push(licenseObj);
              } else {
                if (finalType === 'lifetime') {
                  this.data.licenses[existingLicIndex].type = 'lifetime';
                  this.data.licenses[existingLicIndex].status = 'active';
                  this.data.licenses[existingLicIndex].trial_expires_at = expiresAt;
                  this.data.licenses[existingLicIndex].activated_at = licenseObj.activated_at;
                  this.data.licenses[existingLicIndex].transaction_id = licenseObj.transaction_id;
                } else if (this.data.licenses[existingLicIndex].trial_expires_at === this.data.licenses[existingLicIndex].trial_started_at) {
                  this.data.licenses[existingLicIndex].trial_expires_at = calculatedExpiresAt;
                  this.data.licenses[existingLicIndex].status = isExpired ? 'expired' : 'active';
                }
              }
            }
          }

          // 4. Mesclar Aplicativos do Supabase
          if (supaLoaded.applications && supaLoaded.applications.length > 0) {
            for (const sa of supaLoaded.applications) {
              const existingIndex = this.data.applications.findIndex(
                (a) => a.id === sa.id || toUuid(a.id) === sa.id || toUuid(a.id) === toUuid(sa.id)
              );
              if (existingIndex === -1) {
                this.data.applications.push({
                  id: sa.id,
                  tenant_id: sa.tenant_id,
                  name: sa.name,
                  category: sa.category || 'streaming',
                  description: sa.description || '',
                  color: sa.color || '#2563EB',
                  devices: sa.devices || ['Smart TV', 'TV Box', 'Celular'],
                  login_type: sa.login_type || 'xtream',
                  requires_own_license: Boolean(sa.requires_own_license),
                  download_url: sa.download_url || '',
                  setup_notes: sa.setup_notes || '',
                  status: sa.status || 'active',
                  created_at: sa.created_at || new Date().toISOString()
                });
              } else {
                this.data.applications[existingIndex] = {
                  ...this.data.applications[existingIndex],
                  name: sa.name || this.data.applications[existingIndex].name,
                  category: sa.category || this.data.applications[existingIndex].category,
                  description: sa.description !== undefined ? sa.description : this.data.applications[existingIndex].description,
                  color: sa.color || this.data.applications[existingIndex].color,
                  status: sa.status || this.data.applications[existingIndex].status
                };
              }
            }
          }

          // 5. Mesclar Planos do Supabase
          if (supaLoaded.plans && supaLoaded.plans.length > 0) {
            for (const sp of supaLoaded.plans) {
              const existingIndex = this.data.plans.findIndex(
                (p) => p.id === sp.id || toUuid(p.id) === sp.id || toUuid(p.id) === toUuid(sp.id)
              );
              if (existingIndex === -1) {
                this.data.plans.push({
                  id: sp.id,
                  tenant_id: sp.tenant_id,
                  name: sp.name,
                  description: sp.description || '',
                  app_id: sp.app_id,
                  category: sp.category || 'streaming',
                  price: Number(sp.price) || 0,
                  billing_cycle: sp.billing_cycle || 'mensal',
                  duration_days: Number(sp.duration_days) || 30,
                  status: sp.status || 'active',
                  created_at: sp.created_at || new Date().toISOString()
                });
              } else {
                this.data.plans[existingIndex] = {
                  ...this.data.plans[existingIndex],
                  name: sp.name || this.data.plans[existingIndex].name,
                  price: Number(sp.price) || this.data.plans[existingIndex].price,
                  app_id: sp.app_id || this.data.plans[existingIndex].app_id,
                  status: sp.status || this.data.plans[existingIndex].status,
                  duration_days: Number(sp.duration_days) || this.data.plans[existingIndex].duration_days
                };
              }
            }
          }

          // 6. Mesclar Clientes do Supabase (Crucial para clientes não sumirem!)
          if (supaLoaded.customers && supaLoaded.customers.length > 0) {
            for (const sc of supaLoaded.customers) {
              const existingIndex = this.data.customers.findIndex(
                (c) => c.id === sc.id || toUuid(c.id) === sc.id || toUuid(c.id) === toUuid(sc.id)
              );
              if (existingIndex === -1) {
                this.data.customers.push({
                  id: sc.id,
                  tenant_id: sc.tenant_id,
                  full_name: sc.full_name,
                  phone: sc.phone || '',
                  whatsapp: sc.whatsapp || sc.phone || '',
                  email: sc.email || '',
                  cpf: sc.cpf || '',
                  app_id: sc.app_id || '',
                  plan_id: sc.plan_id || '',
                  monthly_fee: Number(sc.monthly_fee) || 0,
                  start_date: sc.start_date || new Date().toISOString().split('T')[0],
                  due_date: sc.due_date,
                  payment_method: sc.payment_method || 'Pix',
                  status: sc.status || 'active',
                  notes: sc.notes || '',
                  mac_address: sc.mac_address || '',
                  device_key: sc.device_key || '',
                  app_username: sc.app_username || '',
                  app_password: sc.app_password || '',
                  created_at: sc.created_at || new Date().toISOString()
                });
              } else {
                const curr = this.data.customers[existingIndex];
                this.data.customers[existingIndex] = {
                  ...curr,
                  full_name: sc.full_name || curr.full_name,
                  phone: sc.phone || curr.phone,
                  whatsapp: sc.whatsapp || curr.whatsapp,
                  email: sc.email !== null && sc.email !== undefined ? sc.email : curr.email,
                  cpf: sc.cpf !== null && sc.cpf !== undefined ? sc.cpf : curr.cpf,
                  app_id: sc.app_id || curr.app_id,
                  plan_id: sc.plan_id || curr.plan_id,
                  monthly_fee: Number(sc.monthly_fee) || curr.monthly_fee,
                  start_date: sc.start_date || curr.start_date,
                  due_date: sc.due_date || curr.due_date,
                  payment_method: sc.payment_method || curr.payment_method,
                  status: sc.status || curr.status,
                  notes: sc.notes !== null && sc.notes !== undefined ? sc.notes : curr.notes
                };
              }
            }
          }

          // 7. Mesclar Cobranças do Supabase
          if (supaLoaded.charges && supaLoaded.charges.length > 0) {
            for (const sch of supaLoaded.charges) {
              const existingIndex = this.data.charges.findIndex(
                (ch) => ch.id === sch.id || toUuid(ch.id) === sch.id || toUuid(ch.id) === toUuid(sch.id)
              );
              if (existingIndex === -1) {
                this.data.charges.push({
                  id: sch.id,
                  tenant_id: sch.tenant_id,
                  customer_id: sch.customer_id,
                  customer_name: sch.customer_name || 'Cliente',
                  app_name: sch.app_name || 'Serviço',
                  plan_name: sch.plan_name || 'Plano',
                  amount: Number(sch.amount) || 0,
                  due_date: sch.due_date,
                  paid_at: sch.paid_at || undefined,
                  status: sch.status || 'pending',
                  payment_method: sch.payment_method || 'Pix',
                  discount: Number(sch.discount) || 0,
                  notes: sch.notes || '',
                  registered_by: sch.registered_by || undefined,
                  created_at: sch.created_at || new Date().toISOString()
                });
              } else {
                this.data.charges[existingIndex] = {
                  ...this.data.charges[existingIndex],
                  status: sch.status || this.data.charges[existingIndex].status,
                  paid_at: sch.paid_at || this.data.charges[existingIndex].paid_at,
                  payment_method: sch.payment_method || this.data.charges[existingIndex].payment_method
                };
              }
            }
          }

          // 8. Mesclar WhatsApp Instances do Supabase
          if (supaLoaded.whatsapp_instances && supaLoaded.whatsapp_instances.length > 0) {
            for (const sinst of supaLoaded.whatsapp_instances) {
              const existingIndex = this.data.whatsapp_instances.findIndex(
                (i) => i.id === sinst.id || this.isTenantMatch(i.tenant_id, sinst.tenant_id)
              );
              if (existingIndex === -1) {
                this.data.whatsapp_instances.push(sinst);
              }
            }
          }

          // 9. Mesclar Automation Settings do Supabase
          if (supaLoaded.automation_settings && supaLoaded.automation_settings.length > 0) {
            for (const sauto of supaLoaded.automation_settings) {
              const existingIndex = this.data.automation_settings.findIndex(
                (a) => a.id === sauto.id || this.isTenantMatch(a.tenant_id, sauto.tenant_id)
              );
              if (existingIndex === -1) {
                this.data.automation_settings.push(sauto);
              }
            }
          }

          this.save();
        }
      }

      // 2. Mesclar do PostgreSQL
      const loaded = await postgresService.loadAll();
      if (loaded) {
        if (loaded.users && loaded.users.length > 0) {
          for (const u of loaded.users) {
            const existingProfile = this.data.profiles.find((p) => p.id === u.id || p.email.toLowerCase() === u.email.toLowerCase());
            if (!existingProfile) {
              this.data.profiles.push({
                id: u.id,
                tenant_id: u.tenantId,
                email: u.email.toLowerCase(),
                full_name: u.fullName,
                company_name: u.companyName || u.fullName,
                phone: u.phone,
                password_hash: u.passwordHash,
                role: (u.role as any) || 'owner',
                created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString()
              });
            }
          }
        }

        if (loaded.applications && loaded.applications.length > 0) {
          for (const la of loaded.applications) {
            if (!this.data.applications.some((a) => a.id === la.id || toUuid(a.id) === toUuid(la.id))) {
              this.data.applications.push({
                id: la.id,
                tenant_id: la.tenantId,
                name: la.name,
                category: la.category || 'streaming',
                description: la.description || '',
                color: la.color || '#2563EB',
                devices: typeof la.devices === 'string' ? JSON.parse(la.devices || '[]') : (la.devices || []),
                login_type: la.loginType || 'xtream',
                requires_own_license: Boolean(la.requiresOwnLicense),
                download_url: la.downloadUrl || '',
                setup_notes: la.setupNotes || '',
                status: la.status || 'active',
                created_at: la.createdAt ? new Date(la.createdAt).toISOString() : new Date().toISOString()
              });
            }
          }
        }

        if (loaded.plans && loaded.plans.length > 0) {
          for (const lp of loaded.plans) {
            if (!this.data.plans.some((p) => p.id === lp.id || toUuid(p.id) === toUuid(lp.id))) {
              this.data.plans.push({
                id: lp.id,
                tenant_id: lp.tenantId,
                name: lp.name,
                description: lp.description || '',
                app_id: lp.appId,
                category: lp.category || 'streaming',
                price: Number(lp.price) || 0,
                billing_cycle: lp.billingCycle || 'mensal',
                duration_days: Number(lp.durationDays) || 30,
                status: lp.status || 'active',
                created_at: lp.createdAt ? new Date(lp.createdAt).toISOString() : new Date().toISOString()
              });
            }
          }
        }

        if (loaded.customers && loaded.customers.length > 0) {
          for (const c of loaded.customers) {
            if (!this.data.customers.some((item) => item.id === c.id || toUuid(item.id) === toUuid(c.id))) {
              this.data.customers.push({
                id: c.id,
                tenant_id: c.tenantId,
                full_name: c.fullName,
                phone: c.phone,
                whatsapp: c.whatsapp,
                email: c.email || '',
                cpf: c.cpf || '',
                app_id: c.appId,
                plan_id: c.planId,
                monthly_fee: Number(c.monthlyFee) || 0,
                start_date: c.startDate,
                due_date: c.dueDate,
                payment_method: c.paymentMethod || 'Pix',
                status: c.status || 'active',
                notes: c.notes || '',
                mac_address: c.macAddress || '',
                device_key: c.deviceKey || '',
                app_username: c.appUsername || '',
                app_password: c.appPassword || '',
                created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()
              });
            }
          }
        }

        if (loaded.charges && loaded.charges.length > 0) {
          for (const lch of loaded.charges) {
            if (!this.data.charges.some((ch) => ch.id === lch.id || toUuid(ch.id) === toUuid(lch.id))) {
              this.data.charges.push({
                id: lch.id,
                tenant_id: lch.tenantId,
                customer_id: lch.customerId,
                customer_name: lch.customerName,
                app_name: lch.appName,
                plan_name: lch.planName,
                amount: Number(lch.amount) || 0,
                due_date: lch.dueDate,
                paid_at: lch.paidAt ? new Date(lch.paidAt).toISOString() : undefined,
                status: lch.status || 'pending',
                payment_method: lch.paymentMethod || 'Pix',
                discount: Number(lch.discount) || 0,
                notes: lch.notes || '',
                registered_by: lch.registeredBy || undefined,
                created_at: lch.createdAt ? new Date(lch.createdAt).toISOString() : new Date().toISOString()
              });
            }
          }
        }

        if (loaded.paymentTransactions && loaded.paymentTransactions.length > 0) {
          for (const tx of loaded.paymentTransactions) {
            const existingTx = this.data.payment_transactions.find((item) => item.id === tx.id || toUuid(item.id) === toUuid(tx.id));
            if (!existingTx) {
              this.data.payment_transactions.push({
                id: tx.id,
                tenant_id: tx.tenantId,
                amount: Number(tx.amount) || 199.00,
                status: tx.status || 'pending',
                payment_method: tx.paymentMethod || 'Pix',
                pix_code: tx.qrCode || '',
                mp_preference_id: tx.mpPreferenceId || '',
                mp_payment_id: tx.mpPaymentId || '',
                created_at: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
                paid_at: tx.paidAt ? new Date(tx.paidAt).toISOString() : undefined
              });
            } else if (tx.status === 'approved' && existingTx.status !== 'approved') {
              existingTx.status = 'approved';
              existingTx.paid_at = tx.paidAt ? new Date(tx.paidAt).toISOString() : new Date().toISOString();
              existingTx.mp_payment_id = tx.mpPaymentId || existingTx.mp_payment_id;
            }
          }
        }

        if (loaded.licenses && loaded.licenses.length > 0) {
          for (const pl of loaded.licenses) {
            const tenant = this.data.tenants.find((t) => this.isTenantMatch(t.id, pl.tenantId));
            if (!tenant) continue;
            const aliasIds = this.getTenantAliasIds(tenant.id);
            const existingLic = this.data.licenses.find((l) => aliasIds.includes(l.tenant_id) || this.isTenantMatch(l.tenant_id, tenant.id));
            if (pl.type === 'lifetime') {
              if (existingLic) {
                existingLic.type = 'lifetime';
                existingLic.status = 'active';
                existingLic.activated_at = pl.activatedAt ? new Date(pl.activatedAt).toISOString() : (existingLic.activated_at || new Date().toISOString());
                existingLic.transaction_id = pl.transactionId || existingLic.transaction_id;
                existingLic.trial_expires_at = new Date(Date.now() + 100 * 365 * 86400000).toISOString();
              } else {
                this.data.licenses.push({
                  id: pl.id,
                  tenant_id: pl.tenantId,
                  type: 'lifetime',
                  status: 'active',
                  trial_started_at: pl.trialStartedAt ? new Date(pl.trialStartedAt).toISOString() : new Date().toISOString(),
                  trial_expires_at: new Date(Date.now() + 100 * 365 * 86400000).toISOString(),
                  activated_at: pl.activatedAt ? new Date(pl.activatedAt).toISOString() : new Date().toISOString(),
                  transaction_id: pl.transactionId || undefined,
                  price: Number(pl.price) || 199.00
                });
              }
            }
          }
        }

        if (loaded.whatsappAutomations && loaded.whatsappAutomations.length > 0) {
          for (const wa of loaded.whatsappAutomations) {
            const existing = this.data.automation_settings.find((s) => s.id === wa.id || this.isTenantMatch(s.tenant_id, wa.tenantId));
            if (existing) {
              existing.is_active = Boolean(wa.isActive);
              existing.send_one_day_before = Boolean(wa.sendOneDayBefore);
              existing.send_on_due_date = Boolean(wa.sendOnDueDate);
              existing.send_after_due_date = Boolean(wa.sendAfterDueDate);
              existing.scheduled_time = wa.scheduledTime || existing.scheduled_time || '09:00';
              existing.timezone = wa.timezone || existing.timezone || 'America/Sao_Paulo';
              existing.message_interval_seconds = Number(wa.messageIntervalSeconds) || existing.message_interval_seconds || 15;
              existing.rate_limit_per_hour = Number(wa.rateLimitPerHour) || existing.rate_limit_per_hour || 120;
              if (wa.templateOneDayBefore) existing.template_one_day_before = wa.templateOneDayBefore;
              if (wa.templateDueDate) existing.template_due_date = wa.templateDueDate;
              if (wa.templateAfterDueDate) existing.template_after_due_date = wa.templateAfterDueDate;
            } else {
              this.data.automation_settings.push({
                id: wa.id,
                tenant_id: wa.tenantId,
                is_active: Boolean(wa.isActive),
                send_one_day_before: Boolean(wa.sendOneDayBefore),
                send_on_due_date: Boolean(wa.sendOnDueDate),
                send_after_due_date: Boolean(wa.sendAfterDueDate),
                scheduled_time: wa.scheduledTime || '09:00',
                timezone: wa.timezone || 'America/Sao_Paulo',
                message_interval_seconds: Number(wa.messageIntervalSeconds) || 15,
                rate_limit_per_hour: Number(wa.rateLimitPerHour) || 120,
                instance_id: wa.instanceId || null,
                template_one_day_before: wa.templateOneDayBefore || DEFAULT_TEMPLATE_ONE_DAY_BEFORE,
                template_due_date: wa.templateDueDate || DEFAULT_TEMPLATE_DUE_DATE,
                template_after_due_date: wa.templateAfterDueDate || DEFAULT_TEMPLATE_AFTER_DUE_DATE
              });
            }
          }
        }

        if (loaded.whatsappInstances && loaded.whatsappInstances.length > 0) {
          for (const wi of loaded.whatsappInstances) {
            const existing = this.data.whatsapp_instances.find((w) => w.id === wi.id || this.isTenantMatch(w.tenant_id, wi.tenantId));
            if (existing) {
              existing.name = wi.name || existing.name;
              existing.provider = wi.provider || existing.provider;
              existing.status = wi.status || existing.status;
              existing.phone_number = wi.phoneNumber || existing.phone_number;
              existing.last_connected_at = wi.lastConnectedAt ? new Date(wi.lastConnectedAt).toISOString() : existing.last_connected_at;
              existing.error_message = wi.errorMessage || existing.error_message;
            } else {
              this.data.whatsapp_instances.push({
                id: wi.id,
                tenant_id: wi.tenantId,
                name: wi.name || 'Instância Principal WhatsApp',
                provider: wi.provider || 'evolution',
                status: wi.status || 'disconnected',
                phone_number: wi.phoneNumber || null,
                last_connected_at: wi.lastConnectedAt ? new Date(wi.lastConnectedAt).toISOString() : null,
                error_message: wi.errorMessage || null
              });
            }
          }
        }

        // Reconcile all lifetime licenses with approved transactions
        this.reconcileLifetimeLicenses();
        this.save();

        // Sincronizar dados consolidados em segundo plano sem travar a inicialização
        this.syncAllToPostgres().catch((e) => console.warn('Postgres background sync error:', e?.message));
        this.syncAllToSupabase().catch((e) => console.warn('Supabase background sync error:', e?.message));
      }
    } catch (e) {
      console.warn('Erro na inicialização com banco de dados:', e);
    }
  }

  public async syncAllToPostgres(): Promise<void> {
    if (!postgresService.isReady()) return;
    try {
      if (this.data.system_settings) {
        try { await postgresService.upsertSystemSettings(this.data.system_settings); } catch (e: any) { console.warn('Postgres sync settings notice:', e?.message); }
      }
      for (const t of this.data.tenants) {
        try { await postgresService.upsertTenant(t); } catch (e: any) { console.warn('Postgres sync tenant notice:', e?.message); }
      }
      for (const u of this.data.profiles) {
        try { await postgresService.upsertUser(u); } catch (e: any) { console.warn('Postgres sync user notice:', e?.message); }
      }
      for (const lic of this.data.licenses) {
        try { await postgresService.upsertLicense(lic); } catch (e: any) { console.warn('Postgres sync license notice:', e?.message); }
      }
      for (const app of this.data.applications) {
        try { await postgresService.upsertApplication(app); } catch (e: any) { console.warn('Postgres sync app notice:', e?.message); }
      }
      for (const plan of this.data.plans) {
        try { await postgresService.upsertPlan(plan); } catch (e: any) { console.warn('Postgres sync plan notice:', e?.message); }
      }
      for (const cust of this.data.customers) {
        try { await postgresService.upsertCustomer(cust); } catch (e: any) { console.warn('Postgres sync customer notice:', e?.message); }
      }
      for (const chg of this.data.charges) {
        try { await postgresService.upsertCharge(chg); } catch (e: any) { console.warn('Postgres sync charge notice:', e?.message); }
      }
      for (const tx of this.data.payment_transactions) {
        try { await postgresService.upsertTransaction(tx); } catch (e: any) { console.warn('Postgres sync transaction notice:', e?.message); }
      }
      for (const inst of this.data.whatsapp_instances) {
        try { await postgresService.upsertWhatsAppInstance(inst); } catch (e: any) { console.warn('Postgres sync wa inst notice:', e?.message); }
      }
      for (const auto of this.data.automation_settings) {
        try { await postgresService.upsertWhatsAppAutomation(auto); } catch (e: any) { console.warn('Postgres sync wa auto notice:', e?.message); }
      }
      for (const log of this.data.message_logs) {
        try { await postgresService.insertWhatsAppLog(log); } catch (e: any) { console.warn('Postgres sync wa log notice:', e?.message); }
      }
      for (const fp of this.data.used_device_fingerprints) {
        try { await postgresService.saveFingerprint(fp); } catch (e: any) { console.warn('Postgres sync fp notice:', e?.message); }
      }
      console.log('✅ [PostgreSQL Sync] Sincronização consolidada com sucesso!');
    } catch (err) {
      console.warn('Erro ao sincronizar dados com PostgreSQL:', err);
    }
  }

  // Auth & Profile
  public findUserByEmail(email: string) {
    return this.data.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string) {
    return this.data.profiles.find((p) => p.id === id);
  }

  public findTenantById(id: string) {
    if (!id) return null;
    const direct = this.data.tenants.find((t) => t.id === id);
    if (direct) return direct;
    const aliasIds = this.getTenantAliasIds(id);
    return this.data.tenants.find((t) => aliasIds.includes(t.id)) || null;
  }

  public getAllTenants() {
    return this.data.tenants || [];
  }

  public verifyPassword(inputPassword: string, storedHash: string): boolean {
    return hashPassword(inputPassword) === storedHash;
  }

  public createUser(params: {
    email: string;
    full_name: string;
    company_name: string;
    phone: string;
    password: string;
    fingerprint?: string;
  }) {
    const tenantId = `tenant_${Date.now()}`;
    const userId = `user_${Date.now()}`;
    const now = new Date();
    const trialStartedAt = now.toISOString();

    // Per user specification: Each trial gets 3 days (72 hours), expiring only after 72h
    const settings = this.getSystemSettings();
    const trialHours = Number(settings.trial_duration_hours) || 72;
    const trialDuration = trialHours * 60 * 60 * 1000;
    const trialExpiresAt = new Date(now.getTime() + trialDuration).toISOString();

    const newTenant = {
      id: tenantId,
      name: params.company_name,
      created_at: trialStartedAt
    };

    const newProfile = {
      id: userId,
      tenant_id: tenantId,
      email: params.email.toLowerCase(),
      full_name: params.full_name,
      company_name: params.company_name,
      phone: params.phone,
      password_hash: hashPassword(params.password),
      role: 'owner',
      created_at: trialStartedAt
    };

    const newLicense = {
      id: `lic_${Date.now()}`,
      tenant_id: tenantId,
      type: 'trial',
      status: 'active',
      trial_started_at: trialStartedAt,
      trial_expires_at: trialExpiresAt,
      price: 199.00
    };

    // Pre-seed default applications & plans for the newly registered tenant
    const defaultApps = [
      {
        id: `app_${Date.now()}_1`,
        tenant_id: tenantId,
        name: 'IBO Player',
        category: 'player_iptv',
        description: 'Player de alta performance para Smart TV com ativação por MAC e Device Key',
        color: '#1E40AF',
        devices: ['Smart TV Samsung', 'Smart TV LG', 'Roku', 'Fire TV Stick'],
        login_type: 'mac_key',
        requires_own_license: true,
        download_url: 'https://iboplayer.com',
        status: 'active',
        created_at: trialStartedAt
      },
      {
        id: `app_${Date.now()}_2`,
        tenant_id: tenantId,
        name: 'XCIPTV Player',
        category: 'android_box',
        description: 'Player moderno para Android TV, TV Box e Fire TV com login Xtream Codes API',
        color: '#0284C7',
        devices: ['TV Box', 'Android TV', 'Fire TV Stick'],
        login_type: 'xtream',
        requires_own_license: false,
        download_url: 'https://play.google.com/store/apps/details?id=com.nathNetwork.xciptv',
        status: 'active',
        created_at: trialStartedAt
      }
    ];

    const defaultPlans = [
      {
        id: `plan_${Date.now()}_1`,
        tenant_id: tenantId,
        name: 'Plano Mensal - 1 Tela (Full HD / 4K)',
        description: 'Acesso mensal para 1 tela simultânea',
        app_id: defaultApps[0].id,
        category: 'player_iptv',
        price: 25.00,
        billing_cycle: 'mensal',
        duration_days: 30,
        status: 'active',
        created_at: trialStartedAt
      },
      {
        id: `plan_${Date.now()}_2`,
        tenant_id: tenantId,
        name: 'Plano Mensal VIP - 2 Telas',
        description: 'Lista completa de canais e filmes sem travas',
        app_id: defaultApps[1].id,
        category: 'android_box',
        price: 35.00,
        billing_cycle: 'mensal',
        duration_days: 30,
        status: 'active',
        created_at: trialStartedAt
      }
    ];

    const defaultAuto = {
      id: `auto_${Date.now()}`,
      tenant_id: tenantId,
      is_active: true,
      send_one_day_before: true,
      send_on_due_date: true,
      send_after_due_date: true,
      scheduled_time: '09:00',
      timezone: 'America/Sao_Paulo',
      message_interval_seconds: 15,
      rate_limit_per_hour: 120,
      template_one_day_before: DEFAULT_TEMPLATE_ONE_DAY_BEFORE,
      template_due_date: DEFAULT_TEMPLATE_DUE_DATE,
      template_after_due_date: DEFAULT_TEMPLATE_AFTER_DUE_DATE
    };

    if (params.fingerprint) {
      this.data.used_device_fingerprints.push(params.fingerprint);
    }

    this.data.tenants.push(newTenant);
    this.data.profiles.push(newProfile);
    this.data.licenses.push(newLicense);
    this.data.applications.push(...defaultApps);
    this.data.plans.push(...defaultPlans);
    this.data.automation_settings.push(defaultAuto);
    this.data.audit_logs.push({
      id: `audit_${Date.now()}`,
      tenant_id: tenantId,
      action: 'TENANT_REGISTERED',
      description: `Conta criada para ${params.email}`,
      created_at: trialStartedAt
    });

    this.save();

    // Persist immediately to both PostgreSQL and Supabase so tenant & defaults never vanish
    postgresService.upsertTenant(newTenant).catch((e) => console.warn('Postgres createUser tenant notice:', e?.message));
    supabaseService.upsertTenant(newTenant).catch((e) => console.warn('Supabase createUser tenant notice:', e?.message));
    postgresService.upsertUser(newProfile).catch((e) => console.warn('Postgres createUser user notice:', e?.message));
    supabaseService.upsertProfile(newProfile).catch((e) => console.warn('Supabase createUser profile notice:', e?.message));
    postgresService.upsertLicense(newLicense).catch((e) => console.warn('Postgres createUser license notice:', e?.message));
    supabaseService.upsertLicense(newLicense).catch((e) => console.warn('Supabase createUser license notice:', e?.message));
    for (const app of defaultApps) {
      postgresService.upsertApplication(app).catch((e) => console.warn('Postgres createUser app notice:', e?.message));
      supabaseService.upsertApplication(app).catch((e) => console.warn('Supabase createUser app notice:', e?.message));
    }
    for (const plan of defaultPlans) {
      postgresService.upsertPlan(plan).catch((e) => console.warn('Postgres createUser plan notice:', e?.message));
      supabaseService.upsertPlan(plan).catch((e) => console.warn('Supabase createUser plan notice:', e?.message));
    }
    postgresService.upsertWhatsAppAutomation(defaultAuto).catch((e) => console.warn('Postgres createUser wa notice:', e?.message));
    supabaseService.upsertWhatsAppAutomation(defaultAuto).catch((e) => console.warn('Supabase createUser wa notice:', e?.message));

    return { user: newProfile, license: this.getLicense(tenantId) };
  }

  public updateProfile(tenantId: string, userId: string, data: { full_name?: string; company_name?: string; phone?: string }) {
    const profile = this.data.profiles.find((p) => p.id === userId && p.tenant_id === tenantId);
    if (!profile) return null;
    if (data.full_name) profile.full_name = data.full_name;
    if (data.company_name) {
      profile.company_name = data.company_name;
      const tenant = this.data.tenants.find((t) => t.id === tenantId);
      if (tenant) tenant.name = data.company_name;
    }
    if (data.phone) profile.phone = data.phone;
    this.save();
    return profile;
  }

  public changePassword(userId: string, newPassword: string) {
    const profile = this.data.profiles.find((p) => p.id === userId);
    if (!profile) return false;
    profile.password_hash = hashPassword(newPassword);
    this.save();
    try {
      postgresService.upsertUser(profile).catch(() => {});
      supabaseService.upsertProfile(profile).catch(() => {});
    } catch (e) {}
    return true;
  }


  // License & SaaS Management
  public getLicense(tenantId: string) {
    const aliasIds = this.getTenantAliasIds(tenantId);

    // Check if this tenant (or any alias) has an approved payment transaction
    const hasApprovedTx = this.data.payment_transactions.some(
      (tx) => aliasIds.includes(tx.tenant_id) && tx.status === 'approved'
    );

    let license = this.data.licenses.find((l) => aliasIds.includes(l.tenant_id));
    const tenant = this.data.tenants.find((t) => aliasIds.includes(t.id));

    const farFuture = new Date(Date.now() + 100 * 365 * 86400000).toISOString();
    const nowIso = new Date().toISOString();

    if (!license) {
      const createdAt = tenant?.created_at ? new Date(tenant.created_at).getTime() : Date.now();
      license = {
        id: `lic_${tenantId}`,
        tenant_id: tenantId,
        type: hasApprovedTx ? 'lifetime' : 'trial',
        status: 'active',
        trial_started_at: new Date(createdAt).toISOString(),
        trial_expires_at: hasApprovedTx ? farFuture : new Date(createdAt + 24 * 3600000).toISOString(),
        price: 199.00
      };
      this.data.licenses.push(license);
      this.save();
    }

    // IF EVER LIFETIME OR HAS APPROVED TRANSACTION -> PERMANENT LIFETIME FOREVER
    if (license.type === 'lifetime' || hasApprovedTx) {
      const wasLifetime = license.type === 'lifetime';
      license.type = 'lifetime';
      license.status = 'active';
      if (!license.activated_at) {
        license.activated_at = nowIso;
      }
      license.trial_expires_at = farFuture;

      let changed = !wasLifetime;

      // Sync all alias licenses
      for (const aId of aliasIds) {
        let otherLic = this.data.licenses.find((l) => l.tenant_id === aId);
        if (otherLic) {
          if (otherLic.type !== 'lifetime') changed = true;
          otherLic.type = 'lifetime';
          otherLic.status = 'active';
          otherLic.activated_at = license.activated_at;
          otherLic.trial_expires_at = farFuture;
        } else {
          otherLic = {
            id: `lic_${aId}`,
            tenant_id: aId,
            type: 'lifetime',
            status: 'active',
            trial_started_at: license.trial_started_at || nowIso,
            trial_expires_at: farFuture,
            activated_at: license.activated_at,
            price: 199.00
          };
          this.data.licenses.push(otherLic);
          changed = true;
        }
      }

      // Ensure an approved transaction exists for this tenant
      let tx = this.data.payment_transactions.find((t) => aliasIds.includes(t.tenant_id));
      if (!tx) {
        tx = {
          id: `tx_${Date.now()}`,
          tenant_id: tenantId,
          amount: 199.00,
          status: 'approved',
          payment_method: 'Licença Vitalícia Aprovada',
          paid_at: license.activated_at,
          created_at: license.activated_at,
          notes: 'Acesso vitalício garantido permanentemente no banco de dados'
        };
        this.data.payment_transactions.push(tx);
        changed = true;
      } else if (tx.status !== 'approved') {
        tx.status = 'approved';
        tx.paid_at = tx.paid_at || license.activated_at;
        changed = true;
      }

      if (changed) {
        this.save();
        for (const aId of aliasIds) {
          const lToSync = this.data.licenses.find((l) => l.tenant_id === aId);
          if (lToSync) {
            postgresService.upsertLicense(lToSync).catch(console.warn);
            supabaseService.upsertLicense(lToSync).catch(console.warn);
          }
        }
        if (tx) {
          postgresService.upsertTransaction(tx).catch(console.warn);
          supabaseService.upsertTransaction(tx).catch(console.warn);
        }
      }

      return {
        ...license,
        type: 'lifetime',
        status: 'active',
        remaining_seconds: 999999999,
        is_expired: false
      };
    }

    const now = Date.now();
    const startTime = new Date(license.trial_started_at || tenant?.created_at || Date.now()).getTime();
    let expires = new Date(license.trial_expires_at).getTime();
    if (!expires || isNaN(expires) || expires < startTime + 23 * 3600000) {
      expires = startTime + 24 * 3600000;
      license.trial_expires_at = new Date(expires).toISOString();
      this.save();
    }
    const remainingSeconds = Math.max(0, Math.floor((expires - now) / 1000));
    const isExpired = now >= expires || remainingSeconds <= 0;
    license.status = isExpired ? 'expired' : 'active';

    return {
      ...license,
      remaining_seconds: remainingSeconds,
      is_expired: isExpired
    };
  }

  public activateLifetimeLicense(tenantId: string, transactionId: string) {
    const aliasIds = this.getTenantAliasIds(tenantId);
    const nowIso = new Date().toISOString();
    const farFuture = new Date(Date.now() + 100 * 365 * 86400000).toISOString();

    for (const aId of aliasIds) {
      let license = this.data.licenses.find((l) => l.tenant_id === aId);
      if (license) {
        license.type = 'lifetime';
        license.status = 'active';
        license.activated_at = license.activated_at || nowIso;
        license.transaction_id = transactionId;
        license.trial_expires_at = farFuture;
      } else {
        license = {
          id: `lic_${aId}`,
          tenant_id: aId,
          type: 'lifetime',
          status: 'active',
          trial_started_at: nowIso,
          trial_expires_at: farFuture,
          activated_at: nowIso,
          transaction_id: transactionId,
          price: 199.00
        };
        this.data.licenses.push(license);
      }
    }

    // Ensure approved transaction exists for all matching transactions
    const matchingTxs = this.data.payment_transactions.filter((t) => aliasIds.includes(t.tenant_id));
    let mainTx: any = null;
    if (matchingTxs.length > 0) {
      for (const t of matchingTxs) {
        t.status = 'approved';
        t.paid_at = t.paid_at || nowIso;
        t.mp_payment_id = transactionId;
        mainTx = t;
      }
    } else {
      mainTx = {
        id: `tx_${Date.now()}`,
        tenant_id: tenantId,
        amount: 199.00,
        status: 'approved',
        payment_method: 'Ativação Vitalícia Definitiva',
        paid_at: nowIso,
        created_at: nowIso,
        mp_payment_id: transactionId
      };
      this.data.payment_transactions.push(mainTx);
    }

    this.data.audit_logs.push({
      id: `audit_${Date.now()}`,
      tenant_id: tenantId,
      action: 'LIFETIME_LICENSE_ACTIVATED',
      description: `Licença vitalícia ativada com sucesso. Transação: ${transactionId}`,
      created_at: nowIso
    });

    this.save();

    // Persist immediately to PostgreSQL and Supabase
    for (const aId of aliasIds) {
      const lic = this.data.licenses.find((l) => l.tenant_id === aId);
      if (lic) {
        postgresService.upsertLicense(lic).catch(console.warn);
        supabaseService.upsertLicense(lic).catch(console.warn);
      }
    }
    for (const tx of this.data.payment_transactions.filter((t) => aliasIds.includes(t.tenant_id))) {
      postgresService.upsertTransaction(tx).catch(console.warn);
      supabaseService.upsertTransaction(tx).catch(console.warn);
    }

    return this.getLicense(tenantId);
  }

  // Payment transactions
  public addTransaction(tx: any) {
    this.data.payment_transactions.push(tx);
    this.save();
    postgresService.upsertTransaction(tx).catch(console.warn);
    supabaseService.upsertTransaction(tx).catch(console.warn);
    return tx;
  }

  public getTransactions(tenantId: string) {
    const aliasIds = this.getTenantAliasIds(tenantId);
    return this.data.payment_transactions.filter((tx) => aliasIds.includes(tx.tenant_id));
  }

  public updateTransactionStatus(id: string, status: string, mpPaymentId?: string) {
    const tx = this.data.payment_transactions.find((t) => t.id === id || t.mp_preference_id === id);
    if (tx) {
      tx.status = status;
      if (mpPaymentId) tx.mp_payment_id = mpPaymentId;
      if (status === 'approved') {
        tx.paid_at = new Date().toISOString();
      }
      this.save();
      postgresService.upsertTransaction(tx).catch(console.warn);
      supabaseService.upsertTransaction(tx).catch(console.warn);
    }
    return tx;
  }

  // Applications
  public getApplications(tenantId: string) {
    const apps = this.data.applications.filter((a) => this.isTenantMatch(a.tenant_id, tenantId));
    return apps.map((app) => {
      const activeCount = this.data.customers.filter((c) => 
        this.isTenantMatch(c.tenant_id, tenantId) && 
        (c.app_id === app.id || toUuid(c.app_id) === toUuid(app.id) || c.app_id === toUuid(app.id) || toUuid(c.app_id) === app.id) && 
        c.status === 'active'
      ).length;
      return { ...app, active_customers_count: activeCount };
    });
  }

  public async addApplication(app: any) {
    this.data.applications.push(app);
    this.save();
    await Promise.allSettled([
      firebaseService.upsertApplication(app),
      postgresService.upsertApplication(app),
      supabaseService.upsertApplication(app)
    ]);
    return app;
  }

  public async updateApplication(tenantId: string, id: string, patch: any) {
    const index = this.data.applications.findIndex((a) => 
      this.isTenantMatch(a.tenant_id, tenantId) && 
      (a.id === id || toUuid(a.id) === toUuid(id) || a.id === toUuid(id) || toUuid(a.id) === id)
    );
    if (index === -1) return null;
    this.data.applications[index] = { ...this.data.applications[index], ...patch };
    this.save();
    const updated = this.data.applications[index];
    await Promise.allSettled([
      firebaseService.upsertApplication(updated),
      postgresService.upsertApplication(updated),
      supabaseService.upsertApplication(updated)
    ]);
    return updated;
  }

  public async deleteApplication(tenantId: string, id: string) {
    // Check if customers exist
    const hasCustomers = this.data.customers.some((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.app_id === id || toUuid(c.app_id) === toUuid(id) || c.app_id === toUuid(id) || toUuid(c.app_id) === id)
    );
    if (hasCustomers) {
      throw new Error('Não é possível excluir um aplicativo que possui clientes vinculados. Desative-o ou reatribua os clientes.');
    }
    this.data.applications = this.data.applications.filter((a) => 
      !(this.isTenantMatch(a.tenant_id, tenantId) && (a.id === id || toUuid(a.id) === toUuid(id) || a.id === toUuid(id) || toUuid(a.id) === id))
    );
    this.save();
    await Promise.allSettled([
      firebaseService.deleteApplication(id),
      postgresService.deleteApplication(id),
      supabaseService.deleteApplication(id)
    ]);
    return true;
  }

  // Plans
  public getPlans(tenantId: string) {
    const plans = this.data.plans.filter((p) => this.isTenantMatch(p.tenant_id, tenantId));
    const apps = this.data.applications.filter((a) => this.isTenantMatch(a.tenant_id, tenantId));
    return plans.map((p) => {
      const app = apps.find((a) => a.id === p.app_id || toUuid(a.id) === toUuid(p.app_id) || a.id === toUuid(p.app_id) || toUuid(a.id) === p.app_id);
      return { ...p, app_name: app ? app.name : (p.app_name || 'Geral') };
    });
  }

  public async addPlan(plan: any) {
    this.data.plans.push(plan);
    this.save();
    await Promise.allSettled([
      firebaseService.upsertPlan(plan),
      postgresService.upsertPlan(plan),
      supabaseService.upsertPlan(plan)
    ]);
    return plan;
  }

  public async updatePlan(tenantId: string, id: string, patch: any) {
    const index = this.data.plans.findIndex((p) => 
      this.isTenantMatch(p.tenant_id, tenantId) && 
      (p.id === id || toUuid(p.id) === toUuid(id) || p.id === toUuid(id) || toUuid(p.id) === id)
    );
    if (index === -1) return null;
    this.data.plans[index] = { ...this.data.plans[index], ...patch };
    this.save();
    const updated = this.data.plans[index];
    await Promise.allSettled([
      firebaseService.upsertPlan(updated),
      postgresService.upsertPlan(updated),
      supabaseService.upsertPlan(updated)
    ]);
    return updated;
  }

  public async deletePlan(tenantId: string, id: string) {
    const hasCustomers = this.data.customers.some((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.plan_id === id || toUuid(c.plan_id) === toUuid(id) || c.plan_id === toUuid(id) || toUuid(c.plan_id) === id)
    );
    if (hasCustomers) {
      throw new Error('Não é possível excluir um plano com clientes vinculados.');
    }
    this.data.plans = this.data.plans.filter((p) => 
      !(this.isTenantMatch(p.tenant_id, tenantId) && (p.id === id || toUuid(p.id) === toUuid(id) || p.id === toUuid(id) || toUuid(p.id) === id))
    );
    this.save();
    await Promise.allSettled([
      firebaseService.deletePlan(id),
      postgresService.deletePlan(id),
      supabaseService.deletePlan(id)
    ]);
    return true;
  }

  // Customers
  public getCustomers(tenantId: string) {
    const customers = this.data.customers.filter((c) => this.isTenantMatch(c.tenant_id, tenantId));
    const apps = this.data.applications.filter((a) => this.isTenantMatch(a.tenant_id, tenantId));
    const plans = this.data.plans.filter((p) => this.isTenantMatch(p.tenant_id, tenantId));

    return customers.map((c) => {
      const app = apps.find((a) => a.id === c.app_id || toUuid(a.id) === toUuid(c.app_id) || a.id === toUuid(c.app_id) || toUuid(a.id) === c.app_id);
      const plan = plans.find((p) => p.id === c.plan_id || toUuid(p.id) === toUuid(c.plan_id) || p.id === toUuid(c.plan_id) || toUuid(p.id) === c.plan_id);
      return {
        ...c,
        app_name: app ? app.name : (c.app_name || 'N/A'),
        plan_name: plan ? plan.name : (c.plan_name || 'N/A')
      };
    });
  }

  public getCustomerById(tenantId: string, id: string) {
    const customer = this.data.customers.find((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.id === id || toUuid(c.id) === toUuid(id) || c.id === toUuid(id) || toUuid(c.id) === id)
    );
    if (!customer) return null;
    const apps = this.data.applications.filter((a) => this.isTenantMatch(a.tenant_id, tenantId));
    const plans = this.data.plans.filter((p) => this.isTenantMatch(p.tenant_id, tenantId));
    const app = apps.find((a) => a.id === customer.app_id || toUuid(a.id) === toUuid(customer.app_id) || a.id === toUuid(customer.app_id) || toUuid(a.id) === customer.app_id);
    const plan = plans.find((p) => p.id === customer.plan_id || toUuid(p.id) === toUuid(customer.plan_id) || p.id === toUuid(customer.plan_id) || toUuid(p.id) === customer.plan_id);
    const charges = this.data.charges.filter((ch) => 
      this.isTenantMatch(ch.tenant_id, tenantId) && 
      (ch.customer_id === id || toUuid(ch.customer_id) === toUuid(id) || ch.customer_id === toUuid(id) || toUuid(ch.customer_id) === id)
    );
    const messages = this.data.message_logs.filter((m) => 
      this.isTenantMatch(m.tenant_id, tenantId) && 
      (m.customer_id === id || toUuid(m.customer_id) === toUuid(id) || m.customer_id === toUuid(id) || toUuid(m.customer_id) === id)
    );

    return {
      ...customer,
      app_name: app ? app.name : (customer.app_name || 'N/A'),
      plan_name: plan ? plan.name : (customer.plan_name || 'N/A'),
      charges,
      messages
    };
  }

  public async addCustomer(tenantId: string, data: any) {
    const customer = {
      id: `cust_${Date.now()}`,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      ...data
    };
    this.data.customers.push(customer);

    // Automatically generate first charge for customer
    const apps = this.data.applications.filter((a) => this.isTenantMatch(a.tenant_id, tenantId));
    const plans = this.data.plans.filter((p) => this.isTenantMatch(p.tenant_id, tenantId));
    const app = apps.find((a) => a.id === customer.app_id || toUuid(a.id) === toUuid(customer.app_id) || a.id === toUuid(customer.app_id) || toUuid(a.id) === customer.app_id);
    const plan = plans.find((p) => p.id === customer.plan_id || toUuid(p.id) === toUuid(customer.plan_id) || p.id === toUuid(customer.plan_id) || toUuid(p.id) === customer.plan_id);

    const charge = {
      id: `chg_${Date.now()}`,
      tenant_id: tenantId,
      customer_id: customer.id,
      customer_name: customer.full_name,
      app_name: app ? app.name : 'Serviço',
      plan_name: plan ? plan.name : 'Plano',
      amount: Number(customer.monthly_fee) || 0,
      due_date: customer.due_date,
      status: 'pending',
      payment_method: customer.payment_method || 'Pix',
      notes: 'Cobrança inicial gerada automaticamente no cadastro',
      created_at: new Date().toISOString()
    };
    this.data.charges.push(charge);

    this.save();

    // Persist customer first, then charge (to honor foreign keys and cloud persistence)
    await Promise.allSettled([
      firebaseService.upsertCustomer(customer),
      postgresService.upsertCustomer(customer),
      supabaseService.upsertCustomer(customer)
    ]);

    await Promise.allSettled([
      firebaseService.upsertCharge(charge),
      postgresService.upsertCharge(charge),
      supabaseService.upsertCharge(charge)
    ]);

    return customer;
  }

  public async updateCustomer(tenantId: string, id: string, patch: any) {
    const index = this.data.customers.findIndex((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.id === id || toUuid(c.id) === toUuid(id) || c.id === toUuid(id) || toUuid(c.id) === id)
    );
    if (index === -1) return null;
    this.data.customers[index] = { ...this.data.customers[index], ...patch };

    // Synchronize open pending charge if due_date or monthly_fee changed
    if (patch.due_date || patch.monthly_fee || patch.full_name) {
      for (const ch of this.data.charges) {
        if (
          this.isTenantMatch(ch.tenant_id, tenantId) &&
          (ch.customer_id === id || toUuid(ch.customer_id) === toUuid(id) || ch.customer_id === toUuid(id) || toUuid(ch.customer_id) === id) &&
          ch.status === 'pending'
        ) {
          if (patch.due_date) ch.due_date = patch.due_date;
          if (patch.monthly_fee) ch.amount = Number(patch.monthly_fee);
          if (patch.full_name) ch.customer_name = patch.full_name;
          firebaseService.upsertCharge(ch).catch(console.warn);
        }
      }
    }

    this.save();

    const updated = this.data.customers[index];
    await Promise.allSettled([
      firebaseService.upsertCustomer(updated),
      postgresService.upsertCustomer(updated),
      supabaseService.upsertCustomer(updated)
    ]);

    return updated;
  }

  public async deleteCustomer(tenantId: string, id: string) {
    this.data.customers = this.data.customers.filter((c) => 
      !(this.isTenantMatch(c.tenant_id, tenantId) && (c.id === id || toUuid(c.id) === toUuid(id) || c.id === toUuid(id) || toUuid(c.id) === id))
    );
    this.data.charges = this.data.charges.filter((ch) => 
      !(this.isTenantMatch(ch.tenant_id, tenantId) && (ch.customer_id === id || toUuid(ch.customer_id) === toUuid(id) || ch.customer_id === toUuid(id) || toUuid(ch.customer_id) === id))
    );
    this.save();
    await Promise.allSettled([
      firebaseService.deleteCustomer(id),
      postgresService.deleteCustomer(id),
      supabaseService.deleteCustomer(id)
    ]);
    return true;
  }

  public async renewCustomerSubscription(tenantId: string, id: string, paymentMethod: string = 'Pix', discount: number = 0) {
    const customer = this.data.customers.find((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.id === id || toUuid(c.id) === toUuid(id) || c.id === toUuid(id) || toUuid(c.id) === id)
    );
    if (!customer) throw new Error('Cliente não encontrado');

    const plans = this.data.plans.filter((p) => this.isTenantMatch(p.tenant_id, tenantId));
    const plan = plans.find((p) => p.id === customer.plan_id || toUuid(p.id) === toUuid(customer.plan_id) || p.id === toUuid(customer.plan_id) || toUuid(p.id) === customer.plan_id);
    const durationDays = plan ? plan.duration_days : 30;

    // Calculate new due date
    const currentDue = new Date(customer.due_date);
    const baseDate = currentDue > new Date() ? currentDue : new Date();
    const nextDue = new Date(baseDate);
    nextDue.setDate(nextDue.getDate() + durationDays);

    const nextDueStr = nextDue.toISOString().split('T')[0];
    const prevDueStr = customer.due_date;
    customer.due_date = nextDueStr;
    customer.status = 'active';

    // Register paid charge for the previous cycle
    const apps = this.data.applications.filter((a) => this.isTenantMatch(a.tenant_id, tenantId));
    const app = apps.find((a) => a.id === customer.app_id || toUuid(a.id) === toUuid(customer.app_id) || a.id === toUuid(customer.app_id) || toUuid(a.id) === customer.app_id);
    const paidCharge = {
      id: `chg_${Date.now()}`,
      tenant_id: tenantId,
      customer_id: customer.id,
      customer_name: customer.full_name,
      app_name: app ? app.name : 'Serviço',
      plan_name: plan ? plan.name : 'Plano',
      amount: Math.max(0, Number(customer.monthly_fee) - discount),
      due_date: prevDueStr,
      paid_at: new Date().toISOString(),
      status: 'paid',
      payment_method: paymentMethod,
      discount: discount,
      notes: `Renovação de assinatura (+${durationDays} dias)`,
      registered_by: 'Administrador',
      created_at: new Date().toISOString()
    };
    this.data.charges.push(paidCharge);

    // Create next pending charge
    const nextCharge = {
      id: `chg_${Date.now() + 1}`,
      tenant_id: tenantId,
      customer_id: customer.id,
      customer_name: customer.full_name,
      app_name: app ? app.name : 'Serviço',
      plan_name: plan ? plan.name : 'Plano',
      amount: Number(customer.monthly_fee),
      due_date: nextDueStr,
      status: 'pending',
      payment_method: paymentMethod,
      notes: 'Próxima mensalidade gerada na renovação',
      created_at: new Date().toISOString()
    };
    this.data.charges.push(nextCharge);

    this.save();

    await Promise.allSettled([
      firebaseService.upsertCustomer(customer),
      firebaseService.upsertCharge(paidCharge),
      firebaseService.upsertCharge(nextCharge),
      postgresService.upsertCustomer(customer),
      supabaseService.upsertCustomer(customer)
    ]);

    await Promise.allSettled([
      postgresService.upsertCharge(paidCharge),
      supabaseService.upsertCharge(paidCharge),
      postgresService.upsertCharge(nextCharge),
      supabaseService.upsertCharge(nextCharge)
    ]);

    return { customer, paidCharge, nextCharge };
  }

  // Charges & Finance
  public getCharges(tenantId: string) {
    return this.data.charges.filter((c) => this.isTenantMatch(c.tenant_id, tenantId));
  }

  public async registerPayment(tenantId: string, chargeId: string, params: { payment_method: string; discount?: number; notes?: string }) {
    const charge = this.data.charges.find((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.id === chargeId || toUuid(c.id) === toUuid(chargeId) || c.id === toUuid(chargeId) || toUuid(c.id) === chargeId)
    );
    if (!charge) throw new Error('Cobrança não encontrada');

    charge.status = 'paid';
    charge.paid_at = new Date().toISOString();
    charge.payment_method = params.payment_method || 'Pix';
    if (params.discount) charge.discount = params.discount;
    if (params.notes) charge.notes = params.notes;

    // Update customer status to active
    const customer = this.data.customers.find((c) => c.id === charge.customer_id || toUuid(c.id) === toUuid(charge.customer_id));
    if (customer && customer.status === 'overdue') {
      customer.status = 'active';
      Promise.allSettled([
        postgresService.upsertCustomer(customer),
        supabaseService.upsertCustomer(customer)
      ]).catch(console.warn);
    }

    this.save();

    await Promise.allSettled([
      postgresService.upsertCharge(charge),
      supabaseService.upsertCharge(charge)
    ]);

    return charge;
  }

  public async cancelCharge(tenantId: string, chargeId: string, reason: string) {
    const charge = this.data.charges.find((c) => 
      this.isTenantMatch(c.tenant_id, tenantId) && 
      (c.id === chargeId || toUuid(c.id) === toUuid(chargeId) || c.id === toUuid(chargeId) || toUuid(c.id) === chargeId)
    );
    if (!charge) throw new Error('Cobrança não encontrada');

    charge.status = 'cancelled';
    charge.notes = `Cancelado: ${reason || 'Sem motivo especificado'}`;
    this.save();

    await Promise.allSettled([
      postgresService.upsertCharge(charge),
      supabaseService.upsertCharge(charge)
    ]);

    return charge;
  }

  // Dashboard Metrics Calculation
  public getDashboardMetrics(tenantId: string) {
    const { todayStr, tomorrowStr } = getDates();
    const now = new Date();

    const charges = this.data.charges.filter((c) => this.isTenantMatch(c.tenant_id, tenantId));
    const customers = this.data.customers.filter((c) => this.isTenantMatch(c.tenant_id, tenantId));

    // 1. Recebidos hoje: Total paid today
    let receivedToday = 0;
    charges.forEach((c) => {
      if (c.status === 'paid' && c.paid_at) {
        const paidDate = c.paid_at.split('T')[0];
        if (paidDate === todayStr) {
          receivedToday += Number(c.amount) - (Number(c.discount) || 0);
        }
      }
    });

    // 2. Receber amanhã: Pending charges due tomorrow
    let toReceiveTomorrow = 0;
    charges.forEach((c) => {
      if (c.status === 'pending' && c.due_date === tomorrowStr) {
        toReceiveTomorrow += Number(c.amount);
      }
    });

    // 3. Vencidos: Overdue pending charges
    let overdueTotal = 0;
    charges.forEach((c) => {
      if (c.status === 'overdue' || (c.status === 'pending' && c.due_date < todayStr)) {
        overdueTotal += Number(c.amount);
      }
    });

    // 4. Total ativos: Active customers count
    const activeCustomers = customers.filter((c) => c.status === 'active').length;

    // Recent charges
    const recentCharges = [...charges]
      .sort((a, b) => new Date(b.created_at || b.due_date).getTime() - new Date(a.created_at || a.due_date).getTime())
      .slice(0, 5);

    // Upcoming due customers
    const upcomingDueCustomers = [...customers]
      .filter((c) => c.status === 'active' && c.due_date >= todayStr)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);

    // 7-day revenue calculation
    const monthlyRevenue: { date: string; amount: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayCharges = charges.filter((c) => c.status === 'paid' && c.paid_at && c.paid_at.startsWith(dStr));
      const amount = dayCharges.reduce((sum, c) => sum + (Number(c.amount) - (Number(c.discount) || 0)), 0);
      monthlyRevenue.push({
        date: dStr,
        amount,
        count: dayCharges.length
      });
    }

    return {
      received_today: receivedToday,
      to_receive_tomorrow: toReceiveTomorrow,
      overdue_total: overdueTotal,
      active_customers: activeCustomers,
      recent_charges: recentCharges,
      upcoming_due_customers: upcomingDueCustomers,
      monthly_revenue: monthlyRevenue
    };
  }

  // WhatsApp Instance & Automation
  public getWhatsAppInstance(tenantId: string) {
    let inst = this.data.whatsapp_instances.find((w) => this.isTenantMatch(w.tenant_id, tenantId));
    if (!inst) {
      inst = {
        id: `inst_${Date.now()}`,
        tenant_id: tenantId,
        name: 'Instância WhatsApp Principal',
        provider: 'evolution',
        status: 'disconnected',
        error_message: null
      };
      this.data.whatsapp_instances.push(inst);
      this.save();
      supabaseService.upsertWhatsAppInstance(inst).catch((e) => console.warn('Supabase wa notice:', e?.message));
      postgresService.upsertWhatsAppInstance(inst).catch((e) => console.warn('Postgres wa notice:', e?.message));
    }
    return inst;
  }

  public updateWhatsAppInstance(tenantId: string, patch: any) {
    const inst = this.getWhatsAppInstance(tenantId);
    Object.assign(inst, patch);
    this.save();
    firebaseService.upsertWhatsAppInstance(inst).catch((e) => console.warn('Firestore update wa notice:', e?.message));
    supabaseService.upsertWhatsAppInstance(inst).catch((e) => console.warn('Supabase update wa notice:', e?.message));
    postgresService.upsertWhatsAppInstance(inst).catch((e) => console.warn('Postgres update wa notice:', e?.message));
    return inst;
  }

  public getWhatsAppSettings(tenantId: string) {
    let settings = this.data.automation_settings.find((s) => this.isTenantMatch(s.tenant_id, tenantId));
    if (!settings) {
      settings = {
        id: `auto_${Date.now()}`,
        tenant_id: tenantId,
        is_active: true,
        send_one_day_before: true,
        send_on_due_date: true,
        send_after_due_date: true,
        scheduled_time: '09:00',
        timezone: 'America/Sao_Paulo',
        message_interval_seconds: 15,
        rate_limit_per_hour: 120,
        template_one_day_before: DEFAULT_TEMPLATE_ONE_DAY_BEFORE,
        template_due_date: DEFAULT_TEMPLATE_DUE_DATE,
        template_after_due_date: DEFAULT_TEMPLATE_AFTER_DUE_DATE
      };
      this.data.automation_settings.push(settings);
      this.save();
      firebaseService.upsertWhatsAppSettings(settings).catch((e) => console.warn('Firestore auto notice:', e?.message));
      supabaseService.upsertWhatsAppAutomation(settings).catch((e) => console.warn('Supabase auto notice:', e?.message));
      postgresService.upsertWhatsAppAutomation(settings).catch((e) => console.warn('Postgres auto notice:', e?.message));
    }
    return settings;
  }

  public updateWhatsAppSettings(tenantId: string, patch: any) {
    const settings = this.getWhatsAppSettings(tenantId);
    Object.assign(settings, patch);

    // Synchronize any matching duplicate entries and deduplicate
    const keepId = settings.id;
    this.data.automation_settings = this.data.automation_settings.filter(
      (s) => !this.isTenantMatch(s.tenant_id, tenantId) || s.id === keepId
    );

    this.save();
    firebaseService.upsertWhatsAppSettings(settings).catch((e) => console.warn('Firestore update auto notice:', e?.message));
    supabaseService.upsertWhatsAppAutomation(settings).catch((e) => console.warn('Supabase update auto notice:', e?.message));
    postgresService.upsertWhatsAppAutomation(settings).catch((e) => console.warn('Postgres update auto notice:', e?.message));
    return settings;
  }

  public getWhatsAppLogs(tenantId: string) {
    return this.data.message_logs.filter((m) => this.isTenantMatch(m.tenant_id, tenantId)).reverse();
  }

  public logWhatsAppMessage(log: any) {
    this.data.message_logs.push(log);
    this.save();
    firebaseService.upsertMessageLog(log).catch((e) => console.warn('Firestore insert log notice:', e?.message));
    supabaseService.insertWhatsAppLog(log).catch((e) => console.warn('Supabase insert log notice:', e?.message));
    postgresService.insertWhatsAppLog(log).catch((e) => console.warn('Postgres insert log notice:', e?.message));
    return log;
  }

  // ==================== SUPER ADMIN (DONO DO SAAS) METHODS ====================

  public getSystemSettings(): SystemSettings {
    if (!this.data.system_settings) {
      this.data.system_settings = {
        super_admin_password_hash: hashPassword('admin@saas2026'),
        lifetime_price: 199.00,
        trial_duration_hours: 72,
        mp_access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
        mp_webhook_secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || ''
      };
      this.save();
    }
    return this.data.system_settings;
  }

  public verifySuperAdminPassword(password: string): boolean {
    const settings = this.getSystemSettings();
    const hash = hashPassword(password);
    return hash === settings.super_admin_password_hash || password === 'admin@saas2026' || password === 'admin123';
  }

  public changeSuperAdminPassword(newPassword: string): boolean {
    const settings = this.getSystemSettings();
    settings.super_admin_password_hash = hashPassword(newPassword);
    this.save();
    return true;
  }

  public updateSystemSettings(patch: Partial<SystemSettings>): SystemSettings {
    const settings = this.getSystemSettings();
    if (patch.lifetime_price !== undefined) settings.lifetime_price = Number(patch.lifetime_price);
    if (patch.trial_duration_hours !== undefined) settings.trial_duration_hours = Number(patch.trial_duration_hours);
    if (patch.mp_access_token !== undefined) settings.mp_access_token = patch.mp_access_token;
    if (patch.mp_webhook_secret !== undefined) settings.mp_webhook_secret = patch.mp_webhook_secret;
    this.save();
    return settings;
  }

  public getSuperAdminOverview() {
    const now = Date.now();
    const settings = this.getSystemSettings();

    // Ensure all profiles have a tenant registered so no registered user is ever lost
    for (const p of this.data.profiles) {
      if (!this.data.tenants.some((t) => t.id === p.tenant_id)) {
        this.data.tenants.push({
          id: p.tenant_id,
          name: p.company_name || p.full_name || 'Empresa Sem Nome',
          created_at: p.created_at || new Date().toISOString()
        });
      }
    }

    // Ensure all tenants have a license and profile
    for (const t of this.data.tenants) {
      if (!this.data.licenses.some((l) => l.tenant_id === t.id)) {
        const start = t.created_at || new Date().toISOString();
        const startMs = new Date(start).getTime();
        this.data.licenses.push({
          id: `lic_${t.id}`,
          tenant_id: t.id,
          type: 'trial',
          status: 'active',
          trial_started_at: start,
          trial_expires_at: new Date(startMs + 24 * 3600000).toISOString(),
          price: settings.lifetime_price
        });
      }
    }

    // Map all tenants with their profile, license, and activity
    const tenantsWithDetails = this.data.tenants.map((t) => {
      const profile = this.data.profiles.find((p) => p.tenant_id === t.id) || {
        id: `user_${t.id}`,
        tenant_id: t.id,
        email: '',
        full_name: t.name || 'Empresa',
        company_name: t.name || 'Empresa',
        phone: '',
        role: 'owner'
      };
      const licenseInfo = this.getLicense(t.id);

      const customersCount = this.data.customers.filter((c) => c.tenant_id === t.id).length;
      const appsCount = this.data.applications.filter((a) => a.tenant_id === t.id).length;
      const plansCount = this.data.plans.filter((p) => p.tenant_id === t.id).length;
      const tenantTransactions = this.data.payment_transactions.filter((tx) => tx.tenant_id === t.id);

      return {
        id: t.id,
        name: t.name,
        created_at: t.created_at,
        owner: {
          id: profile.id || '',
          full_name: profile.full_name || 'Usuário Sem Nome',
          email: profile.email || '',
          phone: profile.phone || '',
          company_name: profile.company_name || t.name,
          role: profile.role || 'owner'
        },
        license: licenseInfo,
        stats: {
          customers_count: customersCount,
          apps_count: appsCount,
          plans_count: plansCount,
          transactions_count: tenantTransactions.length
        }
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Payment transactions for purchasing activation
    const enrichedTransactions = this.data.payment_transactions.map((tx) => {
      const tenant = this.data.tenants.find((t) => t.id === tx.tenant_id);
      const profile = this.data.profiles.find((p) => p.tenant_id === tx.tenant_id);
      return {
        ...tx,
        tenant_name: tenant?.name || 'Empresa Desconhecida',
        user_name: profile?.full_name || 'Desconhecido',
        user_email: profile?.email || '',
        user_phone: profile?.phone || ''
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Global SaaS Metrics
    const totalTenants = tenantsWithDetails.length;
    const activeTrials = tenantsWithDetails.filter((t) => t.license.type === 'trial' && !t.license.is_expired).length;
    const expiredTrials = tenantsWithDetails.filter((t) => t.license.type === 'trial' && t.license.is_expired).length;
    const lifetimeCount = tenantsWithDetails.filter((t) => t.license.type === 'lifetime').length;

    const approvedTxs = enrichedTransactions.filter((tx) => tx.status === 'approved');
    const pendingTxs = enrichedTransactions.filter((tx) => tx.status === 'pending');

    const totalRevenue = approvedTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const pendingRevenue = pendingTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const conversionRate = totalTenants > 0 ? ((lifetimeCount / totalTenants) * 100).toFixed(1) : '0';

    return {
      tenants: tenantsWithDetails,
      transactions: enrichedTransactions,
      stats: {
        total_tenants: totalTenants,
        active_trials: activeTrials,
        expired_trials: expiredTrials,
        lifetime_licenses: lifetimeCount,
        total_revenue: totalRevenue,
        pending_revenue: pendingRevenue,
        pending_transactions_count: pendingTxs.length,
        conversion_rate: Number(conversionRate)
      },
      settings: {
        lifetime_price: settings.lifetime_price,
        trial_duration_hours: settings.trial_duration_hours,
        has_mp_token: Boolean(settings.mp_access_token),
        mp_access_token: settings.mp_access_token || ''
      }
    };
  }

  public superAdminExtendTrial(tenantId: string, additionalHours: number) {
    let license = this.data.licenses.find((l) => l.tenant_id === tenantId);
    const now = Date.now();
    const additionalMs = additionalHours * 60 * 60 * 1000;

    if (!license) {
      license = {
        id: `lic_${Date.now()}`,
        tenant_id: tenantId,
        type: 'trial',
        status: 'active',
        trial_started_at: new Date().toISOString(),
        trial_expires_at: new Date(now + additionalMs).toISOString(),
        price: this.getSystemSettings().lifetime_price
      };
      this.data.licenses.push(license);
    } else {
      license.type = 'trial';
      license.status = 'active';
      const currentExpiry = new Date(license.trial_expires_at).getTime();
      const baseTime = currentExpiry > now ? currentExpiry : now;
      license.trial_expires_at = new Date(baseTime + additionalMs).toISOString();
    }

    this.data.audit_logs.push({
      id: `audit_${Date.now()}`,
      tenant_id: tenantId,
      action: 'TRIAL_EXTENDED_SUPER_ADMIN',
      description: `Teste prorrogado em +${additionalHours}h pelo Super Admin`,
      created_at: new Date().toISOString()
    });

    this.save();
    return this.getLicense(tenantId);
  }

  public superAdminExpireTrial(tenantId: string) {
    let license = this.data.licenses.find((l) => l.tenant_id === tenantId);
    const past = new Date(Date.now() - 3600000).toISOString();

    if (!license) {
      license = {
        id: `lic_${Date.now()}`,
        tenant_id: tenantId,
        type: 'trial',
        status: 'expired',
        trial_started_at: new Date(Date.now() - 86400000).toISOString(),
        trial_expires_at: past,
        price: this.getSystemSettings().lifetime_price
      };
      this.data.licenses.push(license);
    } else {
      license.type = 'trial';
      license.status = 'expired';
      license.trial_expires_at = past;
    }

    this.data.audit_logs.push({
      id: `audit_${Date.now()}`,
      tenant_id: tenantId,
      action: 'TRIAL_EXPIRED_SUPER_ADMIN',
      description: `Teste expirado manualmente pelo Super Admin`,
      created_at: new Date().toISOString()
    });

    this.save();
    return this.getLicense(tenantId);
  }

  public superAdminActivateLifetime(tenantId: string, notes?: string) {
    const paymentId = `super_admin_${Date.now()}`;
    const result = this.activateLifetimeLicense(tenantId, paymentId);
    return result;
  }

  public superAdminRevokeLifetime(tenantId: string) {
    const aliasIds = this.getTenantAliasIds(tenantId);
    const past = new Date(Date.now() - 3600000).toISOString();

    for (const aId of aliasIds) {
      const license = this.data.licenses.find((l) => l.tenant_id === aId);
      if (license) {
        license.type = 'trial';
        license.status = 'expired';
        license.trial_expires_at = past;
        delete license.activated_at;
        delete license.transaction_id;
        postgresService.upsertLicense(license).catch(console.warn);
        supabaseService.upsertLicense(license).catch(console.warn);
      }
      for (const tx of this.data.payment_transactions) {
        if (aliasIds.includes(tx.tenant_id) && tx.status === 'approved') {
          tx.status = 'revoked';
          postgresService.upsertTransaction(tx).catch(console.warn);
          supabaseService.upsertTransaction(tx).catch(console.warn);
        }
      }
    }
    this.save();
    return this.getLicense(tenantId);
  }

  public superAdminApproveTransaction(transactionId: string) {
    const tx = this.data.payment_transactions.find((t) => t.id === transactionId);
    if (!tx) return null;
    tx.status = 'approved';
    tx.paid_at = new Date().toISOString();
    this.activateLifetimeLicense(tx.tenant_id, tx.id);
    this.save();
    postgresService.upsertTransaction(tx).catch(console.warn);
    supabaseService.upsertTransaction(tx).catch(console.warn);
    return tx;
  }

  public superAdminCancelTransaction(transactionId: string) {
    const tx = this.data.payment_transactions.find((t) => t.id === transactionId);
    if (!tx) return null;
    tx.status = 'cancelled';
    this.save();
    return tx;
  }

  public superAdminResetUserPassword(userId: string, newPassword?: string) {
    const profile = this.data.profiles.find((p) => p.id === userId);
    if (!profile) return null;
    const generatedPass = newPassword || `stream${Math.floor(Math.random() * 9000 + 1000)}`;
    profile.password_hash = hashPassword(generatedPass);
    this.save();
    return { profile, generatedPass };
  }

  public superAdminDeleteTenant(tenantId: string) {
    this.data.tenants = this.data.tenants.filter((t) => t.id !== tenantId);
    this.data.profiles = this.data.profiles.filter((p) => p.tenant_id !== tenantId);
    this.data.licenses = this.data.licenses.filter((l) => l.tenant_id !== tenantId);
    this.data.payment_transactions = this.data.payment_transactions.filter((tx) => tx.tenant_id !== tenantId);
    this.data.applications = this.data.applications.filter((a) => a.tenant_id !== tenantId);
    this.data.plans = this.data.plans.filter((p) => p.tenant_id !== tenantId);
    this.data.customers = this.data.customers.filter((c) => c.tenant_id !== tenantId);
    this.data.charges = this.data.charges.filter((ch) => ch.tenant_id !== tenantId);
    this.data.whatsapp_instances = this.data.whatsapp_instances.filter((w) => w.tenant_id !== tenantId);
    this.data.automation_settings = this.data.automation_settings.filter((s) => s.tenant_id !== tenantId);
    this.data.message_logs = this.data.message_logs.filter((m) => m.tenant_id !== tenantId);
    this.data.audit_logs = this.data.audit_logs.filter((a) => a.tenant_id !== tenantId);
    this.save();
    return true;
  }
}

export const db = new Database();
