import { db } from './db.ts';
import { supabaseService } from './supabaseService.ts';
import { baileysManager } from './baileysManager.ts';
import { evolutionManager } from './evolutionManager.ts';

// Helper to format greetings based on current time in Brasília
export function getGreeting(): string {
  const brasiliaHour = Number(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false
    }).format(new Date())
  );

  if (brasiliaHour >= 5 && brasiliaHour < 12) {
    return 'Bom dia';
  } else if (brasiliaHour >= 12 && brasiliaHour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

// Format message template with variables
export function formatMessage(
  template: string,
  vars: {
    cliente: string;
    plano: string;
    valor: string;
    vencimento: string;
    empresa: string;
  }
): string {
  const greeting = getGreeting();
  let msg = template
    .replace(/\{nome_cliente\}/g, vars.cliente)
    .replace(/\{nome_plano\}/g, vars.plano)
    .replace(/\{valor\}/g, vars.valor)
    .replace(/\{data_vencimento\}/g, vars.vencimento)
    .replace(/\{nome_empresa\}/g, vars.empresa);

  if (msg.startsWith('Bom dia') || msg.startsWith('Boa tarde') || msg.startsWith('Boa noite')) {
    msg = msg.replace(/^(Bom dia|Boa tarde|Boa noite)/, greeting);
  }

  return msg;
}

// Helper to normalize dates to YYYY-MM-DD format regardless of input (ISO, YYYY-MM-DD, or DD/MM/YYYY)
export function normalizeDateStr(d: string): string {
  if (!d) return '';
  const trimmed = d.split('T')[0].trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return trimmed;
}

// Keep track of which tenant was dispatched in which minute to prevent double-sends in the same minute
const lastDispatchedMinutes = new Map<string, string>();

// Process automated reminders for a single tenant
export async function processTenantAutomation(
  tenantId: string,
  forceManual: boolean = false
): Promise<{ dispatched: number; logs: any[]; message?: string }> {
  const instance = db.getWhatsAppInstance(tenantId);
  const settings = db.getWhatsAppSettings(tenantId);
  const tenant = db.findTenantById(tenantId);
  const companyName = tenant?.name || 'Gestor de Streamings';

  // 1. Check if automation is active
  if (!settings.is_active && !forceManual) {
    return { dispatched: 0, logs: [], message: 'Automação está desativada nas configurações.' };
  }

  // 2. Check if instance is connected
  if (instance.status !== 'connected') {
    if (forceManual) {
      console.warn(`⚠️ [WhatsApp Auto] Tenant "${companyName}" (${tenantId}): Instância "${instance.name}" não está conectada (status: ${instance.status}).`);
    }
    return { dispatched: 0, logs: [], message: 'Instância do WhatsApp não está conectada.' };
  }

  // 2.1 Verify live connection status with Evolution API if configured
  if (evolutionManager.isConfigured() && instance.name) {
    try {
      const check = await evolutionManager.checkConnection(instance.name);
      if (!check.connected) {
        console.warn(`⚠️ [WhatsApp Auto] Tenant "${companyName}" (${tenantId}): Instância "${instance.name}" está desconectada na Evolution API (estado: ${check.state}).`);
        const updated = db.updateWhatsAppInstance(tenantId, {
          status: 'disconnected',
          error_message: 'Instância desconectada no WhatsApp. Por favor, reconecte via QR Code.'
        });
        supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);
        return { dispatched: 0, logs: [], message: 'Instância do WhatsApp desconectada no aparelho.' };
      }
    } catch (checkErr: any) {
      console.warn(`⚠️ [WhatsApp Auto] Erro ao verificar conexão da instância "${instance.name}":`, checkErr?.message);
    }
  }

  // 3. Time check (Horário de Brasília) if not forced manually
  const now = new Date();
  const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  const brasiliaTodayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // YYYY-MM-DD

  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const brasiliaTomorrowStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(tomorrowDate);

  if (!forceManual) {
    const scheduledTime = settings.scheduled_time || '09:00';
    if (scheduledTime !== brasiliaTime) {
      // Not time to dispatch yet
      return { dispatched: 0, logs: [], message: `Aguardando horário configurado (${scheduledTime}). Horário atual em Brasília: ${brasiliaTime}.` };
    }

    const key = `${tenantId}_${brasiliaTodayStr}_${brasiliaTime}`;
    if (lastDispatchedMinutes.get(tenantId) === key) {
      // Already dispatched in this exact minute
      return { dispatched: 0, logs: [], message: 'Varredura já executada neste minuto.' };
    }
    lastDispatchedMinutes.set(tenantId, key);
  }

  console.log(`⏰ [WhatsApp Auto] Executando varredura para "${companyName}" (${tenantId}) às ${brasiliaTime} (Brasília)...`);

  const customers = db.getCustomers(tenantId);
  const charges = db.getCharges(tenantId);
  const existingLogs = db.getWhatsAppLogs(tenantId);

  if (customers.length === 0) {
    console.log(`ℹ️ [WhatsApp Auto] Tenant "${companyName}" não possui clientes cadastrados na aba Clientes. Nenhum envio necessário.`);
    return {
      dispatched: 0,
      logs: [],
      message: 'Nenhum cliente cadastrado no sistema para envio de lembretes.'
    };
  }

  let dispatchedCount = 0;
  const newLogs: any[] = [];
  const skipReasons: string[] = [];
  let lastFailureError: string | null = null;

  for (const customer of customers) {
    if (!customer.phone || customer.status === 'inactive') continue;

    const rawPhone = customer.whatsapp || customer.phone;
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) continue;

    // Determine pending charge or use customer's direct due_date
    const pendingCharges = charges.filter(
      (c) => c.customer_id === customer.id && c.status !== 'paid' && c.status !== 'cancelled'
    );

    // Build items to evaluate: prioritize customer's direct due_date, and also evaluate any specific pending charges
    const itemsToEvaluate: Array<{ due_date: string; plan_name?: string; amount: number | string }> = [];

    if (customer.due_date) {
      itemsToEvaluate.push({
        due_date: customer.due_date,
        plan_name: customer.plan_name || (pendingCharges[0]?.plan_name) || 'Plano de Assinatura',
        amount: customer.monthly_fee || (pendingCharges[0]?.amount) || 25
      });
    }

    if (pendingCharges.length > 0) {
      for (const ch of pendingCharges) {
        if (!customer.due_date || normalizeDateStr(ch.due_date) !== normalizeDateStr(customer.due_date)) {
          itemsToEvaluate.push({
            due_date: ch.due_date,
            plan_name: ch.plan_name,
            amount: ch.amount
          });
        }
      }
    }

    for (const item of itemsToEvaluate) {
      const normalizedDueDate = normalizeDateStr(item.due_date);
      let eventType: 'one_day_before' | 'due_date' | 'after_due_date' | null = null;
      let template = '';

      if (normalizedDueDate === brasiliaTomorrowStr) {
        if (settings.send_one_day_before) {
          eventType = 'one_day_before';
          template = settings.template_one_day_before;
        } else {
          skipReasons.push(`${customer.full_name}: Vencimento amanhã (${normalizedDueDate}), mas '1 Dia Antes' está desativado.`);
        }
      } else if (normalizedDueDate === brasiliaTodayStr) {
        if (settings.send_on_due_date) {
          eventType = 'due_date';
          template = settings.template_due_date;
        } else {
          skipReasons.push(`${customer.full_name}: Vencimento hoje (${normalizedDueDate}), mas 'No Dia do Vencimento' está desativado.`);
        }
      } else if (normalizedDueDate && normalizedDueDate < brasiliaTodayStr) {
        if (settings.send_after_due_date) {
          eventType = 'after_due_date';
          template = settings.template_after_due_date;
        } else {
          skipReasons.push(`${customer.full_name}: Vencimento atrasado (${normalizedDueDate}), mas 'Atrasados' está desativado.`);
        }
      } else if (normalizedDueDate) {
        skipReasons.push(`${customer.full_name}: Vencimento em ${normalizedDueDate} (não vence hoje nem amanhã).`);
      }

      if (!eventType || !template) continue;

      // Idempotency check: Don't send duplicate message for same customer, event type and date
      const alreadySent = existingLogs.some(
        (l) => l.customer_id === customer.id && l.event_type === eventType && (l.sent_at || '').startsWith(brasiliaTodayStr)
      );

      if (alreadySent && !forceManual) {
        console.log(`⏭️ [WhatsApp Auto] Lembrete ${eventType} já foi enviado hoje para ${customer.full_name}. Pulando.`);
        skipReasons.push(`${customer.full_name}: Lembrete de ${eventType === 'one_day_before' ? '1 dia antes' : eventType === 'due_date' ? 'vencimento hoje' : 'atrasado'} já foi enviado hoje.`);
        continue;
      }

      const formattedDueDate = new Date(normalizedDueDate + 'T12:00:00').toLocaleDateString('pt-BR');
      const formattedValue = `R$ ${Number(item.amount || 25).toFixed(2).replace('.', ',')}`;

      const messageContent = formatMessage(template, {
        cliente: customer.full_name,
        plano: item.plan_name || 'Plano de Assinatura',
        valor: formattedValue,
        vencimento: formattedDueDate,
        empresa: companyName
      });

      // Dispatch via Evolution API (or Baileys fallback)
      let sendSuccess = false;
      try {
        if (evolutionManager.isConfigured() && instance.name) {
          console.log(`📡 [WhatsApp Auto] Enviando via Evolution API para ${cleanPhone} (instância: ${instance.name})...`);
          await evolutionManager.sendMessage(instance.name, cleanPhone, messageContent);
          sendSuccess = true;
        } else {
          console.log(`📡 [WhatsApp Auto] Enviando via Baileys para ${cleanPhone}...`);
          await baileysManager.sendDirectMessage(tenantId, cleanPhone, messageContent);
          sendSuccess = true;
        }
      } catch (sendErr: any) {
        lastFailureError = sendErr?.message || 'Erro ao enviar mensagem pelo WhatsApp';
        console.error(`❌ [WhatsApp Auto] Erro no envio para ${cleanPhone}:`, sendErr?.message);
        if (sendErr?.isDisconnected || sendErr?.message?.includes('desconectada') || sendErr?.message?.includes('Connection Closed')) {
          const updated = db.updateWhatsAppInstance(tenantId, {
            status: 'disconnected',
            error_message: 'Instância desconectada no WhatsApp. Por favor, reconecte via QR Code.'
          });
          supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);
          console.warn(`⚠️ [WhatsApp Auto] Interrompendo disparos do tenant "${companyName}" pois a instância está desconectada.`);
          break;
        }
      }

      if (sendSuccess) {
        const log = db.logWhatsAppMessage({
          id: `log_${Date.now()}_${dispatchedCount}`,
          tenant_id: tenantId,
          customer_id: customer.id,
          customer_name: customer.full_name,
          phone: cleanPhone,
          event_type: eventType,
          message_content: messageContent,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

        // Synchronize log to Supabase
        supabaseService.insertWhatsAppLog(log).catch(console.warn);

        newLogs.push(log);
        dispatchedCount++;

        console.log(`✅ [WhatsApp Auto] Mensagem enviada para ${customer.full_name} (${cleanPhone})!`);
      } else {
        const log = db.logWhatsAppMessage({
          id: `log_${Date.now()}_fail_${Math.random().toString(36).substring(2, 6)}`,
          tenant_id: tenantId,
          customer_id: customer.id,
          customer_name: customer.full_name,
          phone: cleanPhone,
          event_type: eventType,
          message_content: messageContent,
          status: 'failed',
          sent_at: new Date().toISOString()
        });
        supabaseService.insertWhatsAppLog(log).catch(console.warn);
      }
    }
  }

  console.log(`📊 [WhatsApp Auto] Varredura finalizada para "${companyName}": ${dispatchedCount} mensagem(ns) disparada(s).`);

  let finalMessage = `${dispatchedCount} lembrete(s) disparado(s) com sucesso.`;
  if (dispatchedCount === 0) {
    if (lastFailureError) {
      finalMessage = `Não foi possível enviar: ${lastFailureError}`;
    } else if (skipReasons.length > 0) {
      finalMessage = `Nenhum lembrete a disparar: ${skipReasons.join(' | ')}`;
    } else {
      finalMessage = `Varredura concluída: nenhum cliente com vencimento para notificar (Hoje: ${brasiliaTodayStr}, Amanhã: ${brasiliaTomorrowStr}).`;
    }
  }

  return {
    dispatched: dispatchedCount,
    logs: newLogs,
    message: finalMessage
  };
}

// Background scheduler runner
let schedulerInterval: NodeJS.Timeout | null = null;

export function startWhatsAppScheduler() {
  if (schedulerInterval) return;

  console.log('⏰ [WhatsApp Scheduler] Serviço de envio automático inicializado (Checagem minuto a minuto ativa)');

  // Run initial check after 10 seconds
  setTimeout(async () => {
    try {
      await runAllTenantsAutomation();
    } catch (e: any) {
      console.warn('[WhatsApp Scheduler] Erro na execução inicial:', e?.message);
    }
  }, 10000);

  // Run every 45 SECONDS to reliably catch scheduled minutes without busy looping
  schedulerInterval = setInterval(async () => {
    try {
      await runAllTenantsAutomation();
    } catch (e: any) {
      console.warn('[WhatsApp Scheduler] Erro na execução periódica:', e?.message);
    }
  }, 45 * 1000);
}

export async function runAllTenantsAutomation(forceManual: boolean = false) {
  const tenants = db.getAllTenants();
  for (const tenant of tenants) {
    try {
      if (!forceManual) {
        const settings = db.getWhatsAppSettings(tenant.id);
        if (!settings || !settings.is_active) continue;
      }
      await processTenantAutomation(tenant.id, forceManual);
    } catch (err: any) {
      console.warn(`[WhatsApp Scheduler] Erro ao processar tenant ${tenant.id}:`, err?.message);
    }
  }
}
