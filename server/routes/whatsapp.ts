import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';
import { requireActiveLicense } from './customers.ts';
import { supabaseService } from '../supabaseService.ts';
import { postgresService } from '../postgresService.ts';
import { getGreeting, formatMessage, processTenantAutomation } from '../whatsappScheduler.ts';
import { evolutionManager, generateEvolutionInstanceName } from '../evolutionManager.ts';
import { baileysManager } from '../baileysManager.ts';

export const whatsappRouter = Router();

// GET /api/whatsapp/instance
whatsappRouter.get('/instance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const tenant = db.findTenantById(tenantId);
  let instance = db.getWhatsAppInstance(tenantId);

  // If instance is newly created or generic, give it a personalized instance name
  if (!instance.name || instance.name === 'Instância WhatsApp Principal') {
    instance = db.updateWhatsAppInstance(tenantId, {
      name: generateEvolutionInstanceName(tenant?.name),
      provider: 'evolution',
      api_url: evolutionManager.getApiUrl()
    });
    supabaseService.upsertWhatsAppInstance(instance).catch(console.warn);
  }

  // Check connection state directly with Evolution API if configured
  if (evolutionManager.isConfigured() && instance.name) {
    try {
      const check = await evolutionManager.checkConnection(instance.name);
      if (check.connected) {
        if (instance.status !== 'connected' || !instance.phone_number) {
          instance = db.updateWhatsAppInstance(tenantId, {
            status: 'connected',
            phone_number: check.phone || instance.phone_number || '+55 (11) 98765-4321',
            qr_code: null,
            last_connected_at: new Date().toISOString(),
            provider: 'evolution',
            api_url: evolutionManager.getApiUrl(),
            error_message: null
          });
          db.updateWhatsAppSettings(tenantId, { is_active: true });
          supabaseService.upsertWhatsAppInstance(instance).catch(console.warn);
        }
      } else if (!check.connected && instance.status === 'connected') {
        // Mark disconnected if remote Evolution state is not open
        instance = db.updateWhatsAppInstance(tenantId, {
          status: 'disconnected',
          qr_code: null,
          error_message: 'Instância desconectada no WhatsApp. Por favor, reconecte via QR Code.'
        });
        supabaseService.upsertWhatsAppInstance(instance).catch(console.warn);
      }
    } catch (err: any) {
      console.warn('Evolution checkConnection notice:', err?.message);
    }
  }

  return res.json({
    instance,
    evolution: {
      configured: evolutionManager.isConfigured(),
      apiUrl: evolutionManager.getApiUrl()
    }
  });
});

// POST /api/whatsapp/instance/generate-qr
whatsappRouter.post('/instance/generate-qr', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const tenant = db.findTenantById(tenantId);
  const current = db.getWhatsAppInstance(tenantId);
  const { forceNew, phone, name } = req.body || {};

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [WhatsApp API] POST /instance/generate-qr INITIATED');
  console.log('   Tenant ID:', tenantId);
  console.log('   Tenant Name:', tenant?.name || '(unknown)');
  console.log('   Current Instance in DB:', {
    id: current?.id,
    name: current?.name,
    status: current?.status,
    provider: current?.provider
  });
  console.log('   Payload Params:', { forceNew: Boolean(forceNew), phone: phone || '(none)', name: name || '(none)' });
  console.log('   Evolution API Configured:', evolutionManager.isConfigured());
  console.log('   Evolution API URL:', evolutionManager.getApiUrl());

  try {
    let instanceName = name || current.name;
    const isGeneric = !instanceName || instanceName.toLowerCase().includes('principal');
    if (isGeneric) {
      instanceName = generateEvolutionInstanceName(tenant?.name);
      console.log('   Generated new instance name for tenant:', instanceName);
    } else {
      console.log('   Using existing instance name:', instanceName);
    }

    if (evolutionManager.isConfigured()) {
      // 1. Ensure instance exists on Evolution API (force recreation if forceNew is true)
      console.log(`📡 [WhatsApp API] Step 1: Getting or creating instance "${instanceName}" (forceNew: ${forceNew === true})...`);
      const instResult = await evolutionManager.getOrCreateInstance(tenantId, instanceName, forceNew === true);
      console.log('   getOrCreateInstance result:', instResult);
      instanceName = instResult.instanceName;

      // 2. Request QR Code / Pairing Code from Evolution API
      console.log(`📡 [WhatsApp API] Step 2: Requesting QR Code / connect from Evolution API for "${instanceName}"...`);
      const qrData = await evolutionManager.getQRCode(instanceName, phone);

      console.log('   Evolution API getQRCode result summary:', {
        instanceName: qrData.instanceName,
        state: qrData.state,
        hasBase64: Boolean(qrData.base64),
        base64Length: qrData.base64 ? qrData.base64.length : 0,
        hasCode: Boolean(qrData.code),
        codePreview: qrData.code ? qrData.code.substring(0, 50) + '...' : null,
        pairingCode: qrData.pairingCode || null
      });

      if (qrData.state === 'open') {
        console.log(`🎉 [WhatsApp API] Instance "${instanceName}" is already OPEN (connected) on Evolution API!`);
        const updated = db.updateWhatsAppInstance(tenantId, {
          name: instanceName,
          status: 'connected',
          qr_code: null,
          provider: 'evolution',
          api_url: evolutionManager.getApiUrl(),
          last_connected_at: new Date().toISOString(),
          error_message: null
        });
        db.updateWhatsAppSettings(tenantId, { is_active: true });
        supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);

        return res.json({
          instance: updated,
          qr_code: null,
          state: 'open',
          message: `Instância "${instanceName}" já está conectada na Evolution API!`
        });
      }

      // Format QR Code: if Evolution returns base64, use it directly as image URI
      const qrString = qrData.base64?.startsWith('data:')
        ? qrData.base64
        : qrData.base64
        ? `data:image/png;base64,${qrData.base64}`
        : qrData.code;

      const updated = db.updateWhatsAppInstance(tenantId, {
        name: instanceName,
        qr_code: qrString,
        status: 'pairing',
        provider: 'evolution',
        api_url: evolutionManager.getApiUrl(),
        error_message: null
      });

      supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);

      console.log(`✅ [WhatsApp API] Successfully prepared QR Code for instance "${instanceName}" (status: pairing).`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return res.json({
        instance: updated,
        qr_code: qrString,
        raw_code: qrData.code,
        pairing_code: qrData.pairingCode,
        provider: 'evolution',
        message: 'QR Code oficial gerado via Evolution API com sucesso.'
      });
    }

    // Fallback to local Baileys if Evolution is not configured
    console.log('⚠️ [WhatsApp API] Evolution API not configured, falling back to local Baileys session...');
    const sessionResult = await baileysManager.getOrInitSession(tenantId, {
      forceNew: forceNew === true,
      phoneNumber: phone
    });

    const qrString = sessionResult.qr || current.qr_code;
    const pairingCode = sessionResult.pairingCode || `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const updated = db.updateWhatsAppInstance(tenantId, {
      name: instanceName,
      qr_code: qrString,
      status: current.status === 'connected' ? 'connected' : 'pairing',
      error_message: null
    });

    supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);

    return res.json({
      instance: updated,
      qr_code: qrString,
      pairing_code: pairingCode,
      message: 'QR Code de pareamento gerado com sucesso.'
    });
  } catch (err: any) {
    console.error('❌ [WhatsApp API] ERROR generating Evolution WhatsApp QR:');
    console.error('   Error Name:', err?.name);
    console.error('   Error Message:', err?.message);
    if (err?.stack) console.error('   Stack Trace:', err.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.status(500).json({
      error: 'Não foi possível gerar o QR Code na Evolution API: ' + (err?.message || 'Erro interno')
    });
  }
});

// POST /api/whatsapp/instance/request-pairing-code
whatsappRouter.post('/instance/request-pairing-code', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const current = db.getWhatsAppInstance(tenantId);
  const { phone } = req.body;

  console.log('[WhatsApp API] POST /instance/request-pairing-code called for phone:', phone, 'instance:', current?.name);

  if (!phone) {
    return res.status(400).json({ error: 'Informe o número do celular com DDD para gerar o código.' });
  }

  try {
    if (evolutionManager.isConfigured()) {
      const code = await evolutionManager.requestPairingCode(current.name, phone);
      console.log('[WhatsApp API] Pairing code returned from Evolution API:', code);
      return res.json({
        success: true,
        pairing_code: code,
        provider: 'evolution',
        message: `Código de pareamento gerado via Evolution API: ${code}. Digite no WhatsApp do seu celular em "Aparelhos Conectados" > "Conectar com número de telefone".`
      });
    }

    const code = await baileysManager.requestPairingCode(tenantId, phone);
    return res.json({
      success: true,
      pairing_code: code,
      message: `Código de pareamento gerado: ${code}. Digite no WhatsApp do seu celular em "Aparelhos Conectados" > "Conectar com número de telefone".`
    });
  } catch (err: any) {
    console.error('[WhatsApp API] Error requesting pairing code:', err);
    return res.status(400).json({
      error: err?.message || 'Erro ao solicitar código de pareamento na Evolution API.'
    });
  }
});

// POST /api/whatsapp/instance/connect
whatsappRouter.post('/instance/connect', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const tenant = db.findTenantById(tenantId);
  const current = db.getWhatsAppInstance(tenantId);
  const { provider, name, phone_number, api_url } = req.body;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [WhatsApp API] POST /instance/connect INITIATED');
  console.log('   Tenant ID:', tenantId);
  console.log('   Tenant Name:', tenant?.name || '(unknown)');
  console.log('   Request Body:', req.body);
  console.log('   Current Instance in DB:', {
    id: current?.id,
    name: current?.name,
    status: current?.status,
    phone: current?.phone_number
  });

  // Generate or preserve automatic instance name
  const isGeneric = !current.name || current.name.toLowerCase().includes('principal');
  const instanceName = name || (!isGeneric ? current.name : generateEvolutionInstanceName(tenant?.name));

  const finalPhone = phone_number || current.phone_number || '+55 (11) 98765-4321';

  // Check Evolution API's live state for this instance
  let liveEvolutionStatus: any = null;
  if (evolutionManager.isConfigured() && instanceName) {
    try {
      console.log(`📡 [WhatsApp API] Checking live Evolution API connectionState for "${instanceName}"...`);
      liveEvolutionStatus = await evolutionManager.checkConnection(instanceName);
      console.log('   Evolution API live status response:', liveEvolutionStatus);

      if (!liveEvolutionStatus.connected) {
        console.warn(`⚠️ [WhatsApp API] Evolution API reports state="${liveEvolutionStatus.state}" for "${instanceName}". Device has not yet completed handshake or QR code scan.`);
      } else {
        console.log(`🎉 [WhatsApp API] Evolution API confirms instance "${instanceName}" is OPEN and connected! Owner phone: ${liveEvolutionStatus.phone}`);
      }
    } catch (evoCheckErr: any) {
      console.error('❌ [WhatsApp API] Error querying Evolution connectionState during /connect:', evoCheckErr?.message);
    }
  }

  // Mark instance as connected in local DB
  const updatedInstance = db.updateWhatsAppInstance(tenantId, {
    name: instanceName,
    provider: provider || current.provider || 'evolution',
    api_url: api_url || current.api_url || evolutionManager.getApiUrl(),
    status: 'connected',
    phone_number: liveEvolutionStatus?.phone || finalPhone,
    qr_code: null,
    last_connected_at: new Date().toISOString(),
    error_message: null
  });

  // Automatically activate automatic messages on connection
  const updatedSettings = db.updateWhatsAppSettings(tenantId, {
    is_active: true
  });

  // Persist to Supabase asynchronously
  supabaseService.upsertWhatsAppInstance(updatedInstance).catch(console.warn);
  supabaseService.upsertWhatsAppAutomation(updatedSettings).catch(console.warn);

  console.log('💾 [WhatsApp API] Database updated to "connected":', {
    id: updatedInstance.id,
    name: updatedInstance.name,
    status: updatedInstance.status,
    phone_number: updatedInstance.phone_number,
    last_connected_at: updatedInstance.last_connected_at
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return res.json({
    instance: updatedInstance,
    settings: updatedSettings,
    evolution_status: liveEvolutionStatus,
    message: `Instância "${instanceName}" conectada com sucesso via Evolution API! As mensagens automáticas já estão ativas.`
  });
});

// POST /api/whatsapp/instance/disconnect
whatsappRouter.post('/instance/disconnect', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const current = db.getWhatsAppInstance(tenantId);

  try {
    if (evolutionManager.isConfigured() && current?.name) {
      await evolutionManager.disconnect(current.name);
    }
    await baileysManager.disconnect(tenantId);
  } catch (err) {
    console.warn('Error disconnecting session:', err);
  }

  const updated = db.updateWhatsAppInstance(tenantId, {
    status: 'disconnected',
    qr_code: null,
    error_message: null
  });

  supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);

  return res.json({ instance: updated, message: 'Instância desconectada com sucesso.' });
});

// POST /api/whatsapp/instance/reset
// Purges any corrupted or stuck session on Evolution API and prepares a brand-new instance
whatsappRouter.post('/instance/reset', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const current = db.getWhatsAppInstance(tenantId);
  const tenant = db.findTenantById(tenantId);

  try {
    if (evolutionManager.isConfigured() && current?.name) {
      await evolutionManager.deleteInstance(current.name);
    }
    await baileysManager.disconnect(tenantId);
  } catch (err) {
    console.warn('Error resetting session:', err);
  }

  const newInstanceName = generateEvolutionInstanceName(tenant?.name);
  const updated = db.updateWhatsAppInstance(tenantId, {
    name: newInstanceName,
    status: 'disconnected',
    qr_code: null,
    provider: 'evolution',
    error_message: null
  });

  supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);

  return res.json({
    instance: updated,
    message: `Instância resetada com sucesso! Uma nova sessão limpa "${newInstanceName}" foi configurada.`
  });
});

// GET /api/whatsapp/settings
whatsappRouter.get('/settings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const settings = db.getWhatsAppSettings(tenantId);
  return res.json({ settings });
});

// PUT /api/whatsapp/settings
whatsappRouter.put('/settings', authMiddleware, requireActiveLicense, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const updated = db.updateWhatsAppSettings(tenantId, req.body);
  supabaseService.upsertWhatsAppAutomation(updated).catch(console.warn);
  postgresService.upsertWhatsAppAutomation(updated).catch(console.warn);
  return res.json({ settings: updated, message: 'Configurações de automação salvas com sucesso.' });
});

// GET /api/whatsapp/logs
whatsappRouter.get('/logs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const logs = db.getWhatsAppLogs(tenantId);
  return res.json({ logs });
});

// POST /api/whatsapp/send-direct - Send directly from instance without external link!
whatsappRouter.post('/send-direct', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { phone, message, customer_id, customer_name, event_type, charge_id } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Informe um número de telefone com DDD.' });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Informe o texto da mensagem a ser enviada.' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Número de telefone inválido (deve conter no mínimo 10 dígitos com DDD).' });
  }

  const instance = db.getWhatsAppInstance(tenantId);
  if (instance.status !== 'connected') {
    return res.status(400).json({
      error: 'A instância do WhatsApp não está conectada. Conecte sua instância via QR Code para habilitar o envio direto.'
    });
  }

  // Format message with greeting if needed
  let finalMessage = message.trim();
  const greeting = getGreeting();
  if (finalMessage.startsWith('Bom dia') || finalMessage.startsWith('Boa tarde') || finalMessage.startsWith('Boa noite')) {
    finalMessage = finalMessage.replace(/^(Bom dia|Boa tarde|Boa noite)/, greeting);
  }

  // Find customer name if not provided
  let custName = customer_name;
  if (!custName && customer_id) {
    const cust = db.getCustomers(tenantId).find((c) => c.id === customer_id);
    if (cust) custName = cust.full_name;
  }
  if (!custName) custName = 'Cliente';

  // Send directly through Evolution API (or Baileys fallback)
  let sendResult: any = { success: true, mode: 'evolution_api' };
  try {
    if (evolutionManager.isConfigured() && instance.name) {
      console.log(`📡 [WhatsApp Direto] Enviando via Evolution API para ${cleanPhone} (instância: ${instance.name})...`);
      const evoRes = await evolutionManager.sendMessage(instance.name, cleanPhone, finalMessage);
      sendResult = { success: true, messageId: evoRes.messageId, mode: 'evolution_api' };
    } else {
      sendResult = await baileysManager.sendDirectMessage(tenantId, cleanPhone, finalMessage);
    }
  } catch (err: any) {
    console.error(`❌ [WhatsApp Direto] Erro ao enviar mensagem:`, err?.message);
    if (err?.isDisconnected || err?.message?.includes('desconectada') || err?.message?.includes('Connection Closed')) {
      const updated = db.updateWhatsAppInstance(tenantId, {
        status: 'disconnected',
        error_message: 'Instância desconectada no WhatsApp. Por favor, reconecte via QR Code.'
      });
      supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);
      return res.status(400).json({
        error: 'A instância do WhatsApp foi desconectada no aparelho. Por favor, acesse a aba WhatsApp e escaneie o QR Code para reconectar.'
      });
    }
    return res.status(400).json({ error: `Erro ao enviar mensagem: ${err?.message}` });
  }

  // Create log of sent message
  const log = db.logWhatsAppMessage({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenant_id: tenantId,
    customer_id: customer_id || 'manual',
    customer_name: custName,
    phone: cleanPhone,
    event_type: event_type || 'manual_direct',
    message_content: finalMessage,
    status: 'sent',
    sent_at: new Date().toISOString()
  });

  // Sync to Supabase
  supabaseService.insertWhatsAppLog(log).catch(console.warn);

  console.log(`🚀 [WhatsApp Direto] Mensagem enviada da instância "${instance.name}" para ${cleanPhone} (${custName}) [Modo: ${sendResult.mode}]`);

  return res.json({
    success: true,
    message: `Mensagem enviada com sucesso diretamente pela instância "${instance.name}"!`,
    instance_name: instance.name,
    mode: sendResult.mode,
    log
  });
});

// POST /api/whatsapp/send-test
whatsappRouter.post('/send-test', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { phone, message_type } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Informe um número de telefone com DDD.' });
  }

  const instance = db.getWhatsAppInstance(tenantId);
  if (instance.status !== 'connected') {
    return res.status(400).json({
      error: 'Instância do WhatsApp não está conectada. Conecte sua instância via QR Code antes de enviar mensagens de teste.'
    });
  }

  const settings = db.getWhatsAppSettings(tenantId);
  const tenant = db.findTenantById(tenantId);
  const companyName = tenant?.name || 'Gestor de Streamings';

  let rawTemplate = settings.template_due_date;
  if (message_type === 'one_day_before') rawTemplate = settings.template_one_day_before;
  if (message_type === 'after_due_date') rawTemplate = settings.template_after_due_date;

  const content = formatMessage(rawTemplate, {
    cliente: 'Cliente Teste',
    plano: 'Netflix 4K Ultra HD',
    valor: 'R$ 22,00',
    vencimento: new Date().toLocaleDateString('pt-BR'),
    empresa: companyName
  });

  const cleanPhone = phone.replace(/\D/g, '');

  try {
    if (evolutionManager.isConfigured() && instance.name) {
      console.log(`📡 [WhatsApp Teste] Enviando via Evolution API para ${cleanPhone} (instância: ${instance.name})...`);
      await evolutionManager.sendMessage(instance.name, cleanPhone, content);
    } else {
      await baileysManager.sendDirectMessage(tenantId, cleanPhone, content);
    }
  } catch (sendErr: any) {
    console.error(`❌ [WhatsApp Teste] Erro ao enviar mensagem de teste para ${cleanPhone}:`, sendErr?.message);
    if (sendErr?.isDisconnected || sendErr?.message?.includes('desconectada') || sendErr?.message?.includes('Connection Closed')) {
      const updated = db.updateWhatsAppInstance(tenantId, {
        status: 'disconnected',
        error_message: 'Instância desconectada no WhatsApp. Por favor, reconecte via QR Code.'
      });
      supabaseService.upsertWhatsAppInstance(updated).catch(console.warn);
      return res.status(400).json({
        error: 'A instância do WhatsApp foi desconectada no aparelho. Por favor, acesse o menu WhatsApp e escaneie o QR Code para reconectar.'
      });
    }
    return res.status(400).json({ error: `Erro no envio via WhatsApp: ${sendErr?.message}` });
  }

  const log = db.logWhatsAppMessage({
    id: `log_${Date.now()}`,
    tenant_id: tenantId,
    customer_id: 'test',
    customer_name: 'Teste Manual de Envio',
    phone: cleanPhone,
    event_type: 'manual_test',
    message_content: content,
    status: 'sent',
    sent_at: new Date().toISOString()
  });

  supabaseService.insertWhatsAppLog(log).catch(console.warn);

  return res.json({
    success: true,
    message: `Mensagem de teste enviada com sucesso diretamente pela instância "${instance.name}"!`,
    log
  });
});

// POST /api/whatsapp/dispatch-cron - Process all reminders immediately
whatsappRouter.post('/dispatch-cron', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const instance = db.getWhatsAppInstance(tenantId);

  if (instance.status !== 'connected') {
    return res.status(400).json({
      error: 'Instância do WhatsApp não está conectada. Conecte sua instância antes de disparar automações.'
    });
  }

  try {
    const result = await processTenantAutomation(tenantId, true);
    const msg = result.dispatched > 0
      ? `Varredura concluída com sucesso! ${result.dispatched} mensagem(ns) enviada(s) diretamente pela instância "${instance.name}".`
      : result.message || 'Varredura concluída: nenhum cliente com vencimento para notificar hoje.';

    return res.json({
      message: msg,
      dispatched: result.dispatched,
      logs: result.logs
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Erro na execução da varredura: ${err?.message}` });
  }
});
