import { db } from './db.ts';
import { supabaseService } from './supabaseService.ts';

export interface EvolutionQRResult {
  instanceName: string;
  base64?: string;
  code?: string;
  pairingCode?: string;
  state: 'connecting' | 'open' | 'close';
}

export function generateEvolutionInstanceName(tenantName?: string): string {
  const clean = (tenantName || 'gestor')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 12);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `gestor_${clean}_${suffix}`;
}

export class EvolutionManager {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = (process.env.WHATSAPP_API_URL || 'https://api.doratec.site').replace(/\/+$/, '');
    this.apiKey = process.env.WHATSAPP_API_KEY || '1003be981b063ae8c3146ba09557a56245312581afb4891d36c316281665eb28';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  private getHeaders(): Record<string, string> {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * List all instances on Evolution API server
   */
  public async fetchInstances(): Promise<any[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(`${this.apiUrl}/instance/fetchInstances`, {
        headers: { 'apikey': this.apiKey }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.warn('Evolution fetchInstances error:', err?.message);
      return [];
    }
  }

  /**
   * Delete an instance on Evolution API
   */
  public async deleteInstance(instanceName: string): Promise<boolean> {
    if (!this.isConfigured() || !instanceName) return true;
    try {
      const res = await fetch(`${this.apiUrl}/instance/delete/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
        headers: { 'apikey': this.apiKey }
      });
      return res.ok;
    } catch (err: any) {
      console.warn(`Evolution delete error for ${instanceName}:`, err?.message);
      return false;
    }
  }

  /**
   * Restart an instance on Evolution API
   */
  public async restartInstance(instanceName: string): Promise<boolean> {
    if (!this.isConfigured() || !instanceName) return false;
    try {
      const res = await fetch(`${this.apiUrl}/instance/restart/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        headers: { 'apikey': this.apiKey }
      });
      return res.ok;
    } catch (err: any) {
      console.warn(`Evolution restart error for ${instanceName}:`, err?.message);
      return false;
    }
  }

  /**
   * Get or create instance for a tenant on Evolution API
   */
  public async getOrCreateInstance(
    tenantId: string,
    customName?: string,
    forceNew: boolean = false
  ): Promise<{ instanceName: string; created: boolean; existingState?: string }> {
    const current = db.getWhatsAppInstance(tenantId);
    const tenant = db.findTenantById(tenantId);

    // List remote instances
    const remoteInstances = await this.fetchInstances();

    // Determine target instance name
    let instanceName = customName || current.name;
    const isGeneric = !instanceName || instanceName.toLowerCase().includes('principal');

    if (forceNew) {
      // If forceNew was requested, delete existing instance if it was stuck
      if (instanceName && !isGeneric) {
        await this.deleteInstance(instanceName);
      }
      // Generate a fresh unique instance name
      instanceName = generateEvolutionInstanceName(tenant?.name);
    } else if (isGeneric) {
      // Check if remote already has an instance matching this tenant
      const foundMatch = remoteInstances.find((r) => r.name.toLowerCase().includes(tenantId.toLowerCase()));
      if (foundMatch) {
        instanceName = foundMatch.name;
      } else {
        instanceName = generateEvolutionInstanceName(tenant?.name);
      }
    }

    // Check if instance already exists on Evolution API
    const remoteInstance = remoteInstances.find((r) => r.name === instanceName);

    if (remoteInstance && !forceNew) {
      return {
        instanceName,
        created: false,
        existingState: remoteInstance.connectionStatus
      };
    }

    // Create new instance on Evolution API
    try {
      const createRes = await fetch(`${this.apiUrl}/instance/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.warn(`Evolution create instance returned ${createRes.status}:`, errorText);
      }

      return { instanceName, created: true };
    } catch (err: any) {
      console.error('Error creating Evolution instance:', err?.message);
      return { instanceName, created: false };
    }
  }

  /**
   * Request QR Code or Pairing Code from Evolution API
   */
  public async getQRCode(instanceName: string, phoneNumber?: string): Promise<EvolutionQRResult> {
    if (!this.isConfigured()) {
      throw new Error('Evolution API não configurada no servidor (WHATSAPP_API_URL/WHATSAPP_API_KEY).');
    }

    let url = `${this.apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
    if (phoneNumber) {
      const clean = phoneNumber.replace(/\D/g, '');
      if (clean.length >= 10) {
        url += `?number=${clean.startsWith('55') ? clean : '55' + clean}`;
      }
    }

    try {
      console.log(`[EvolutionManager] Calling Evolution API: GET ${url}`);
      const res = await fetch(url, {
        headers: { 'apikey': this.apiKey }
      });

      console.log(`[EvolutionManager] Evolution API GET /instance/connect response status: ${res.status} (${res.statusText})`);

      let data: any;
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error(`[EvolutionManager] Failed to parse JSON from Evolution API: ${rawText}`);
        throw new Error(`Evolution API HTTP ${res.status}: ${rawText}`);
      }

      if (!res.ok || data.error || (data.response && data.response.message)) {
        console.error(`[EvolutionManager] Evolution API returned error/warning for "${instanceName}":`, {
          status: res.status,
          error: data.error,
          message: data.message,
          response: data.response
        });
      } else {
        console.log(`[EvolutionManager] Evolution API returned connect data for "${instanceName}":`, {
          status: res.status,
          state: data.instance?.state || data.state,
          hasBase64: Boolean(data.base64),
          base64Length: data.base64 ? data.base64.length : 0,
          hasCode: Boolean(data.code),
          count: data.count,
          pairingCode: data.pairingCode
        });
      }

      // If already connected
      if (data.instance?.state === 'open' || data.state === 'open') {
        console.log(`[EvolutionManager] Instance "${instanceName}" is in state 'open'.`);
        return {
          instanceName,
          state: 'open'
        };
      }

      return {
        instanceName,
        base64: data.base64,
        code: data.code,
        pairingCode: data.pairingCode,
        state: 'connecting'
      };
    } catch (err: any) {
      console.error(`[EvolutionManager] Error getting Evolution QR for "${instanceName}":`, err?.message);
      throw new Error(`Erro ao conectar com Evolution API: ${err?.message}`);
    }
  }

  /**
   * Request 8-digit Pairing Code via phone number
   */
  public async requestPairingCode(instanceName: string, phoneNumber: string): Promise<string> {
    const clean = phoneNumber.replace(/\D/g, '');
    const finalNumber = clean.startsWith('55') ? clean : `55${clean}`;

    console.log(`[EvolutionManager] Requesting pairing code for "${instanceName}" with number "${finalNumber}"...`);
    const qrResult = await this.getQRCode(instanceName, finalNumber);
    if (qrResult.pairingCode) {
      console.log(`[EvolutionManager] Pairing code obtained: ${qrResult.pairingCode}`);
      return qrResult.pairingCode;
    }

    throw new Error('Código de pareamento não retornado pela Evolution API. Verifique o número informado.');
  }

  /**
   * Check connection state on Evolution API
   */
  public async checkConnection(instanceName: string): Promise<{
    connected: boolean;
    state: string;
    phone?: string;
    profileName?: string;
    profilePicUrl?: string;
    raw?: any;
  }> {
    if (!this.isConfigured()) {
      return { connected: false, state: 'unconfigured' };
    }

    try {
      const url = `${this.apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
      const res = await fetch(url, {
        headers: { 'apikey': this.apiKey }
      });

      if (!res.ok) {
        console.warn(`[EvolutionManager] connectionState returned HTTP ${res.status} (${res.statusText}) for "${instanceName}"`);
        return { connected: false, state: 'close' };
      }

      const data = await res.json();
      const state = data.instance?.state || data.state || 'close';
      console.log(`[EvolutionManager] connectionState for "${instanceName}": state="${state}"`, data);

      if (state === 'open') {
        // Fetch instance details to obtain owner number and name
        const remoteInstances = await this.fetchInstances();
        const found = remoteInstances.find((r) => r.name === instanceName);

        let formattedPhone = '';
        if (found?.ownerJid) {
          const rawDigits = found.ownerJid.split('@')[0].split(':')[0].replace(/\D/g, '');
          formattedPhone = rawDigits.startsWith('55')
            ? `+55 (${rawDigits.substring(2, 4)}) ${rawDigits.substring(4, 9)}-${rawDigits.substring(9)}`
            : `+${rawDigits}`;
        }

        return {
          connected: true,
          state: 'open',
          phone: formattedPhone,
          profileName: found?.profileName || undefined,
          profilePicUrl: found?.profilePicUrl || undefined,
          raw: data
        };
      }

      return {
        connected: false,
        state,
        raw: data
      };
    } catch (err: any) {
      console.warn(`Error checking connection state for ${instanceName}:`, err?.message);
      return { connected: false, state: 'error' };
    }
  }

  /**
   * Send WhatsApp message via Evolution API
   */
  public async sendMessage(
    instanceName: string,
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; response?: any }> {
    if (!this.isConfigured()) {
      throw new Error('Evolution API não configurada.');
    }

    let clean = phone.replace(/\D/g, '');
    if ((clean.length === 10 || clean.length === 11) && !clean.startsWith('55')) {
      clean = `55${clean}`;
    }

    const res = await fetch(`${this.apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        number: clean,
        text: message,
        delay: 1200
      })
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      console.warn(`Evolution sendMessage error [${res.status}]:`, data);

      let rawMsg = '';
      if (typeof data?.response?.message === 'string') {
        rawMsg = data.response.message;
      } else if (Array.isArray(data?.response?.message)) {
        const flat = Array.isArray(data.response.message[0]) ? data.response.message.flat() : data.response.message;
        rawMsg = flat.filter(Boolean).join(', ');
      } else if (typeof data?.message === 'string') {
        rawMsg = data.message;
      } else if (Array.isArray(data?.message)) {
        rawMsg = data.message.join(', ');
      } else if (data?.response && typeof data.response === 'string') {
        rawMsg = data.response;
      } else if (data?.error && typeof data.error === 'string') {
        rawMsg = data.error;
      }

      const lower = rawMsg.toLowerCase();
      const isConnectionClosed =
        res.status === 401 ||
        lower.includes('connection closed') ||
        lower.includes('disconnected') ||
        lower.includes('device_removed') ||
        lower.includes('conflict') ||
        lower.includes('stream errored') ||
        lower.includes('not connected') ||
        (res.status === 500 && (lower.includes('close') || !rawMsg || lower === 'internal server error'));

      const isNotFound = res.status === 404 || lower.includes('does not exist');

      let finalErrorMessage = rawMsg || 'Erro ao enviar mensagem via Evolution API.';
      if (isConnectionClosed) {
        finalErrorMessage = `A instância "${instanceName}" do WhatsApp está desconectada ou a conexão foi encerrada. Por favor, reconecte via QR Code na aba WhatsApp.`;
      } else if (isNotFound) {
        finalErrorMessage = `A instância "${instanceName}" não foi encontrada no servidor. Gere um novo QR Code na aba WhatsApp para conectá-la.`;
      }

      const error: any = new Error(finalErrorMessage);
      error.isDisconnected = isConnectionClosed;
      error.isNotFound = isNotFound;
      error.status = res.status;
      error.rawResponse = data;
      throw error;
    }

    return {
      success: true,
      messageId: data.key?.id || `evo_${Date.now()}`,
      response: data
    };
  }

  /**
   * Disconnect / Logout instance
   */
  public async disconnect(instanceName: string): Promise<boolean> {
    if (!this.isConfigured()) return true;

    try {
      await fetch(`${this.apiUrl}/instance/logout/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
        headers: { 'apikey': this.apiKey }
      });
      return true;
    } catch (err: any) {
      console.warn(`Evolution logout error for ${instanceName}:`, err?.message);
      return false;
    }
  }
}

export const evolutionManager = new EvolutionManager();
