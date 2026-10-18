const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('gestor_stream_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao realizar login.');
    return data;
  },

  async register(formData: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar.');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Não autenticado.');
    return await res.json();
  },

  async updateProfile(profileData: any) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar perfil.');
    return data;
  },

  async changePassword(passwordData: any) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha.');
    return data;
  },

  async recoverPassword(payload: string | { email: string; new_password?: string; confirm_new_password?: string }) {
    const body = typeof payload === 'string' ? { email: payload } : payload;
    const res = await fetch(`${API_BASE}/auth/recover-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar/redefinir senha.');
    return data;
  },

  // License & Mercado Pago
  async getLicenseStatus() {
    const res = await fetch(`${API_BASE}/license/status`, {
      headers: getAuthHeader()
    });
    return await res.json();
  },

  async createMercadoPagoPreference() {
    const res = await fetch(`${API_BASE}/license/create-preference`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao iniciar checkout.');
    return data;
  },

  async simulatePayment(transactionId?: string) {
    const res = await fetch(`${API_BASE}/license/simulate-payment`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId })
    });
    return await res.json();
  },

  // Dashboard
  async getDashboardMetrics() {
    const res = await fetch(`${API_BASE}/dashboard/metrics`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar métricas.');
    return data.metrics;
  },

  // Customers
  async getCustomers() {
    const res = await fetch(`${API_BASE}/customers`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.customers || [];
  },

  async getCustomerById(id: string) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar cliente.');
    return data.customer;
  },

  async createCustomer(payload: any) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente.');
    return data.customer;
  },

  async updateCustomer(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar cliente.');
    return data.customer;
  },

  async deleteCustomer(id: string) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir cliente.');
    return data;
  },

  async renewCustomer(id: string, options: { payment_method: string; discount?: number }) {
    const res = await fetch(`${API_BASE}/customers/${id}/renew`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao renovar cliente.');
    return data;
  },

  // Plans
  async getPlans() {
    const res = await fetch(`${API_BASE}/plans`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.plans || [];
  },

  async createPlan(payload: any) {
    const res = await fetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar plano.');
    return data.plan;
  },

  async updatePlan(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar plano.');
    return data.plan;
  },

  async deletePlan(id: string) {
    const res = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir plano.');
    return data;
  },

  // Applications
  async getApplications() {
    const res = await fetch(`${API_BASE}/applications`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.applications || [];
  },

  async createApplication(payload: any) {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar aplicativo.');
    return data.application;
  },

  async updateApplication(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar aplicativo.');
    return data.application;
  },

  async deleteApplication(id: string) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir aplicativo.');
    return data;
  },

  // Finance
  async getCharges() {
    const res = await fetch(`${API_BASE}/finance/charges`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.charges || [];
  },

  async payCharge(id: string, payload: { payment_method: string; discount?: number; notes?: string }) {
    const res = await fetch(`${API_BASE}/finance/charges/${id}/pay`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar pagamento.');
    return data.charge;
  },

  async cancelCharge(id: string, reason: string) {
    const res = await fetch(`${API_BASE}/finance/charges/${id}/cancel`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cancelar cobrança.');
    return data.charge;
  },

  // WhatsApp
  async getWhatsAppInstance() {
    const res = await fetch(`${API_BASE}/whatsapp/instance`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.instance;
  },

  async generateWhatsAppQR(payload: { forceNew?: boolean; phone?: string } = {}) {
    const res = await fetch(`${API_BASE}/whatsapp/instance/generate-qr`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao gerar QR Code.');
    return data;
  },

  async requestWhatsAppPairingCode(phone: string) {
    const res = await fetch(`${API_BASE}/whatsapp/instance/request-pairing-code`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao gerar código de pareamento.');
    return data;
  },

  async connectWhatsApp(payload: any = {}) {
    const res = await fetch(`${API_BASE}/whatsapp/instance/connect`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao conectar WhatsApp.');
    return data;
  },

  async disconnectWhatsApp() {
    const res = await fetch(`${API_BASE}/whatsapp/instance/disconnect`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.instance;
  },

  async resetWhatsAppInstance() {
    const res = await fetch(`${API_BASE}/whatsapp/instance/reset`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao resetar instância.');
    return data;
  },

  async getWhatsAppSettings() {
    const res = await fetch(`${API_BASE}/whatsapp/settings`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar configurações de WhatsApp.');
    return data.settings;
  },

  async updateWhatsAppSettings(payload: any) {
    const res = await fetch(`${API_BASE}/whatsapp/settings`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações de WhatsApp.');
    return data.settings;
  },

  async getWhatsAppLogs() {
    const res = await fetch(`${API_BASE}/whatsapp/logs`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    return data.logs || [];
  },

  async sendDirectWhatsApp(payload: {
    phone: string;
    message: string;
    customer_id?: string;
    customer_name?: string;
    event_type?: string;
    charge_id?: string;
  }) {
    const res = await fetch(`${API_BASE}/whatsapp/send-direct`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem diretamente.');
    return data;
  },

  async sendTestWhatsApp(phone: string, message_type: string) {
    const res = await fetch(`${API_BASE}/whatsapp/send-test`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message_type })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem.');
    return data;
  },

  async dispatchWhatsAppCron() {
    const res = await fetch(`${API_BASE}/whatsapp/dispatch-cron`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao executar automação.');
    return data;
  },

  // Export
  getExportUrl(format: 'csv' | 'xlsx', filter: string = 'all'): string {
    const token = localStorage.getItem('gestor_stream_token') || '';
    return `${API_BASE}/export/customers?format=${format}&filter=${filter}&token=${token}`;
  },

  async downloadExport(format: 'csv' | 'xlsx', filter: string = 'all') {
    const res = await fetch(`${API_BASE}/export/customers?format=${format}&filter=${filter}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Erro ao exportar dados.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${filter}_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};
