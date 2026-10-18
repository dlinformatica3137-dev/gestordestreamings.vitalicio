import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Sparkles,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  ChevronRight,
  Shield,
  Trash2,
  Key,
  X,
  Settings,
  HelpCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

interface SuperAdminProps {
  isStandalone?: boolean;
  onExit?: () => void;
}

interface TenantItem {
  id: string;
  name: string;
  created_at: string;
  owner: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    company_name: string;
    role: string;
  };
  license: {
    type: 'trial' | 'lifetime';
    status: 'active' | 'expired';
    trial_started_at: string;
    trial_expires_at: string;
    activated_at?: string;
    remaining_seconds: number;
    is_expired: boolean;
    price: number;
  };
  stats: {
    customers_count: number;
    apps_count: number;
    plans_count: number;
    transactions_count: number;
  };
}

interface TransactionItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  amount: number;
  status: 'approved' | 'pending' | 'cancelled' | 'rejected';
  payment_method: string;
  pix_code?: string;
  mp_preference_id?: string;
  mp_payment_id?: string;
  created_at: string;
  paid_at?: string;
  notes?: string;
}

interface OverviewData {
  tenants: TenantItem[];
  transactions: TransactionItem[];
  stats: {
    total_tenants: number;
    active_trials: number;
    expired_trials: number;
    lifetime_licenses: number;
    total_revenue: number;
    pending_revenue: number;
    pending_transactions_count: number;
    conversion_rate: number;
  };
  settings: {
    lifetime_price: number;
    trial_duration_hours: number;
    has_mp_token: boolean;
    mp_access_token?: string;
  };
}

const SUPERADMIN_STORAGE_KEY = 'gestor_stream_superadmin_token';

export const SuperAdmin: React.FC<SuperAdminProps> = ({ isStandalone = false, onExit }) => {
  // Authentication state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(SUPERADMIN_STORAGE_KEY));
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dashboard state
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trials' | 'sales' | 'settings'>('trials');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [trialSearch, setTrialSearch] = useState('');
  const [trialStatusFilter, setTrialStatusFilter] = useState<'all' | 'active_trial' | 'expired_trial' | 'lifetime'>('all');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'approved' | 'pending' | 'cancelled'>('all');

  // Modals
  const [extendModalTenant, setExtendModalTenant] = useState<TenantItem | null>(null);
  const [extendHours, setExtendHours] = useState(24);
  const [activateModalTenant, setActivateModalTenant] = useState<TenantItem | null>(null);
  const [activateNotes, setActivateNotes] = useState('');
  const [resetPassModalTenant, setResetPassModalTenant] = useState<TenantItem | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Settings form
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [settingLifetimePrice, setSettingLifetimePrice] = useState('199');
  const [settingTrialHours, setSettingTrialHours] = useState('72');
  const [settingMpAccessToken, setSettingMpAccessToken] = useState('');
  const [showMpToken, setShowMpToken] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMpSettings, setSavingMpSettings] = useState(false);

  // Load overview data if token exists
  const fetchOverview = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/overview', {
        headers: {
          'x-super-admin-token': activeToken
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          setAuthError('Sessão expirada. Digite a senha mestre novamente.');
          return;
        }
        throw new Error('Falha ao obter dados');
      }

      const data: OverviewData = await res.json();
      setOverview(data);
      setSettingLifetimePrice(String(data.settings.lifetime_price || 199));
      setSettingTrialHours(String(data.settings.trial_duration_hours || 72));
      if (data.settings?.mp_access_token !== undefined) {
        setSettingMpAccessToken(data.settings.mp_access_token || '');
      }
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao conectar ao servidor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
  }, [token]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Por favor, informe a senha de Super Administrador.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Senha mestre inválida.');
        return;
      }

      localStorage.setItem(SUPERADMIN_STORAGE_KEY, data.token);
      setToken(data.token);
      setPasswordInput('');
      fetchOverview(data.token);
      showFeedback('Autenticação autorizada! Bem-vindo ao painel Super Admin.');
    } catch (err: any) {
      setAuthError('Falha ao conectar com o servidor.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SUPERADMIN_STORAGE_KEY);
    setToken(null);
    setOverview(null);
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Actions on Tenants / Trials
  const handleExtendTrial = async () => {
    if (!extendModalTenant || !token) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${extendModalTenant.id}/extend-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token
        },
        body: JSON.stringify({ hours: extendHours })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(data.message);
      setExtendModalTenant(null);
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleExpireTrial = async (tenant: TenantItem) => {
    if (!token) return;
    const confirmAction = window.confirm(
      `Deseja realmente expirar imediatamente o teste de "${tenant.name}" (${tenant.owner.email})? O usuário perderá acesso imediato até comprar a licença.`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/expire-trial`, {
        method: 'POST',
        headers: { 'x-super-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(data.message);
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleActivateLifetime = async () => {
    if (!activateModalTenant || !token) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${activateModalTenant.id}/activate-lifetime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token
        },
        body: JSON.stringify({ notes: activateNotes })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(`Licença vitalícia ativada com sucesso para ${activateModalTenant.name}!`);
      setActivateModalTenant(null);
      setActivateNotes('');
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleRevokeLifetime = async (tenant: TenantItem) => {
    if (!token) return;
    const confirmAction = window.confirm(
      `Deseja revogar a licença vitalícia de "${tenant.name}"? A conta voltará a ser marcada como expirada.`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/revoke-lifetime`, {
        method: 'POST',
        headers: { 'x-super-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(data.message);
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassModalTenant || !token) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${resetPassModalTenant.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token
        },
        body: JSON.stringify({ user_id: resetPassModalTenant.owner.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGeneratedPassword(data.new_password);
      showFeedback('Nova senha temporária gerada!');
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleDeleteTenant = async (tenant: TenantItem) => {
    if (!token) return;
    const confirmDelete = window.confirm(
      `ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE o cadastro de "${tenant.name}" (${tenant.owner.email})? Todos os clientes, planos e dados desse tenant serão excluídos.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(data.message);
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Actions on Transactions (Sales)
  const handleApproveTransaction = async (tx: TransactionItem) => {
    if (!token) return;
    const confirmApprove = window.confirm(
      `Confirma o recebimento de R$ ${tx.amount.toFixed(2)} de "${tx.user_name}" (${tx.tenant_name})? A licença vitalícia será liberada imediatamente no sistema.`
    );
    if (!confirmApprove) return;

    try {
      const res = await fetch(`/api/superadmin/transactions/${tx.id}/approve`, {
        method: 'POST',
        headers: { 'x-super-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(data.message);
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleCancelTransaction = async (tx: TransactionItem) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/superadmin/transactions/${tx.id}/cancel`, {
        method: 'POST',
        headers: { 'x-super-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(data.message);
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Settings handlers
  const handleSaveMercadoPago = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    const trimmedToken = settingMpAccessToken.trim();
    if (trimmedToken && !trimmedToken.startsWith('APP_USR-')) {
      const confirmSave = window.confirm(
        'Atenção: O Access Token informado não começa com "APP_USR-". O Mercado Pago exige um token de produção iniciado em "APP_USR-" para receber pagamentos Pix reais. Deseja salvar mesmo assim?'
      );
      if (!confirmSave) return;
    }

    setSavingMpSettings(true);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token
        },
        body: JSON.stringify({
          lifetime_price: Number(settingLifetimePrice),
          trial_duration_hours: Number(settingTrialHours),
          mp_access_token: trimmedToken
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(
        trimmedToken
          ? 'Token do Mercado Pago salvo com sucesso! O sistema está pronto para receber Pix das licenças.'
          : 'Configurações atualizadas com sucesso!'
      );
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    } finally {
      setSavingMpSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingSettings(true);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token
        },
        body: JSON.stringify({
          lifetime_price: Number(settingLifetimePrice),
          trial_duration_hours: Number(settingTrialHours),
          mp_access_token: settingMpAccessToken.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('Configurações do SaaS salvas com sucesso!');
      fetchOverview();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newMasterPass !== confirmMasterPass) {
      showFeedback('A confirmação de senha não confere.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/superadmin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token
        },
        body: JSON.stringify({
          current_password: currentMasterPass,
          new_password: newMasterPass,
          confirm_new_password: confirmMasterPass
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback('Senha mestre do Super Admin alterada com sucesso!');
      setCurrentMasterPass('');
      setNewMasterPass('');
      setConfirmMasterPass('');
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Helper formatters
  const formatCountdown = (remainingSeconds: number, trialExpiresAt?: string) => {
    let secs = remainingSeconds;
    if ((!secs || secs <= 0) && trialExpiresAt) {
      secs = Math.max(0, Math.floor((new Date(trialExpiresAt).getTime() - Date.now()) / 1000));
    }
    if (secs <= 0) return 'Expirado';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${minutes}m restantes`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered lists
  const filteredTenants = useMemo(() => {
    if (!overview?.tenants) return [];
    return overview.tenants.filter((t) => {
      // Search
      const search = trialSearch.toLowerCase().trim();
      const matchSearch =
        !search ||
        (t.name || '').toLowerCase().includes(search) ||
        (t.owner?.full_name || '').toLowerCase().includes(search) ||
        (t.owner?.email || '').toLowerCase().includes(search) ||
        (t.owner?.phone || '').toLowerCase().includes(search);

      // Status
      let matchStatus = true;
      const isTrialFuture = t.license?.trial_expires_at
        ? new Date(t.license.trial_expires_at).getTime() > Date.now()
        : (t.license?.remaining_seconds || 0) > 0;

      if (trialStatusFilter === 'active_trial') {
        matchStatus = (t.license?.type === 'trial' || !t.license?.type) && (!t.license?.is_expired || isTrialFuture);
      } else if (trialStatusFilter === 'expired_trial') {
        matchStatus = t.license?.type === 'trial' && (t.license?.is_expired === true && !isTrialFuture);
      } else if (trialStatusFilter === 'lifetime') {
        matchStatus = t.license?.type === 'lifetime';
      }

      return matchSearch && matchStatus;
    });
  }, [overview, trialSearch, trialStatusFilter]);

  const filteredTransactions = useMemo(() => {
    if (!overview?.transactions) return [];
    return overview.transactions.filter((tx) => {
      const search = salesSearch.toLowerCase().trim();
      const matchSearch =
        !search ||
        (tx.tenant_name || '').toLowerCase().includes(search) ||
        (tx.user_name || '').toLowerCase().includes(search) ||
        (tx.user_email || '').toLowerCase().includes(search) ||
        (tx.id || '').toLowerCase().includes(search);

      const matchStatus = salesStatusFilter === 'all' || tx.status === salesStatusFilter;

      return matchSearch && matchStatus;

      return matchSearch && matchStatus;
    });
  }, [overview, salesSearch, salesStatusFilter]);

  // WhatsApp quick link builder
  const buildTrialWhatsAppUrl = (tenant: TenantItem) => {
    const cleanPhone = (tenant.owner?.phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${tenant.owner?.full_name || tenant.name}! Sou o responsável pelo Gestor de Streamings SaaS. Vi que você iniciou seu teste gratuito para a empresa "${tenant.name}". Está conseguindo usar ou precisa de ajuda com a configuração de clientes e planos?`
    );
    return `https://wa.me/${phoneWithCountry}?text=${text}`;
  };

  const buildSalesWhatsAppUrl = (tx: TransactionItem) => {
    const cleanPhone = (tx.user_phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${tx.user_name || 'Amigo'}! Vi que você iniciou a ativação da sua Licença Vitalícia de R$ ${(tx.amount || 0).toFixed(2)} do Gestor de Streamings SaaS. Precisa de alguma ajuda para concluir o Pix e liberar seu acesso definitivo?`
    );
    return `https://wa.me/${phoneWithCountry}?text=${text}`;
  };

  // If NOT authenticated, render Master Password Screen
  if (!token) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/60 p-2 shadow-lg flex items-center justify-center">
                <img src="/logo.png" alt="Gestor de Streamings" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Área Super Admin
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acesso exclusivo para o Dono do SaaS. Controle geral de cadastros de teste e ativações de clientes.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha Mestre de Super Administrador
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite a senha mestre..."
                  required
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando Chave Mestre...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear Painel Super Admin</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // AUTHENTICATED: Full Super Admin Dashboard
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Painel Super Admin — Dono do SaaS
                </h1>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold text-[11px] rounded-full border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Master
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controle centralizado de quem está fazendo o teste gratuito (3 dias) e de quem está comprando a ativação vitalícia de R$ 199.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Voltar para a área de clientes / dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Sistema</span>
            </button>
          )}

          <button
            onClick={() => fetchOverview()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Bloquear Super Admin"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloquear Painel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Cadastros */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cadastros</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {overview?.stats.total_tenants || 0}
          </div>
          <span className="text-[10px] text-slate-500">Total de contas criadas</span>
        </div>

        {/* Em Teste Ativo */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Teste</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {overview?.stats.active_trials || 0}
          </div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Testando agora</span>
        </div>

        {/* Testes Expirados */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expirados</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {overview?.stats.expired_trials || 0}
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Oportunidade p/ contato</span>
        </div>

        {/* Vitalícios Liberados */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vitalícios</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {overview?.stats.lifetime_licenses || 0}
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Compraram licença</span>
        </div>

        {/* Faturamento Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faturado</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            R$ {(overview?.stats.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">Vendas aprovadas</span>
        </div>

        {/* Pix Pendentes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-violet-200 dark:border-violet-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-violet-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aguardando</span>
            <CreditCard className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-violet-600 dark:text-violet-400">
            {overview?.stats.pending_transactions_count || 0}
          </div>
          <span className="text-[10px] text-violet-600/80 dark:text-violet-400/80">
            R$ {(overview?.stats.pending_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} em aberto
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('trials')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'trials'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cadastros de Teste (Trials)</span>
          <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
            {overview?.tenants.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'sales'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Vendas & Ativações de Licença</span>
          <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px]">
            {overview?.transactions.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações & Senha Mestre</span>
        </button>
      </div>

      {/* ==================== TAB 1: CADASTROS DE TESTE ==================== */}
      {activeTab === 'trials' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={trialSearch}
                onChange={(e) => setTrialSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail, empresa ou telefone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setTrialStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  trialStatusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todos ({overview?.tenants.length || 0})
              </button>

              <button
                onClick={() => setTrialStatusFilter('active_trial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  trialStatusFilter === 'active_trial'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                }`}
              >
                🟢 Em Teste Ativo ({overview?.stats.active_trials || 0})
              </button>

              <button
                onClick={() => setTrialStatusFilter('expired_trial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  trialStatusFilter === 'expired_trial'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                🔴 Teste Expirado ({overview?.stats.expired_trials || 0})
              </button>

              <button
                onClick={() => setTrialStatusFilter('lifetime')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  trialStatusFilter === 'lifetime'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                💎 Vitalício Ativo ({overview?.stats.lifetime_licenses || 0})
              </button>
            </div>
          </div>

          {/* Tenants / Trials Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Empresa / Usuário</th>
                    <th className="px-4 py-3.5">Contato (WhatsApp & E-mail)</th>
                    <th className="px-4 py-3.5">Data Cadastro</th>
                    <th className="px-4 py-3.5">Status do Teste / Licença</th>
                    <th className="px-4 py-3.5 text-right">Ações de Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        Nenhum cadastro de teste localizado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const isLifetime = tenant.license.type === 'lifetime';
                      const isTrialFuture = tenant.license.trial_expires_at
                        ? new Date(tenant.license.trial_expires_at).getTime() > Date.now()
                        : (tenant.license.remaining_seconds || 0) > 0;
                      const isActiveTrial = tenant.license.type === 'trial' && (!tenant.license.is_expired || isTrialFuture);
                      const isExpired = tenant.license.type === 'trial' && !isLifetime && !isActiveTrial;

                      return (
                        <tr key={tenant.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Tenant & User Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {tenant.name}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {tenant.owner.full_name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                ID: {tenant.id}
                              </span>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col space-y-1">
                              <a
                                href={buildTrialWhatsAppUrl(tenant)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{tenant.owner.phone || 'Sem telefone'}</span>
                              </a>
                              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                                <Mail className="w-3 h-3" />
                                <span>{tenant.owner.email}</span>
                              </span>
                            </div>
                          </td>

                          {/* Created At */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {formatDate(tenant.created_at)}
                          </td>

                          {/* License & Trial Countdown Status */}
                          <td className="px-4 py-3.5">
                            {isLifetime ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Vitalício Ativo (R$ 199)
                              </span>
                            ) : isActiveTrial ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                  <Clock className="w-3.5 h-3.5" /> Teste 3 Dias Ativo
                                </span>
                                <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 pl-1">
                                  ⏳ {formatCountdown(tenant.license.remaining_seconds, tenant.license.trial_expires_at)}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Teste Expirado
                                </span>
                                <div className="text-[10px] text-rose-500 font-medium pl-1">
                                  Acesso bloqueado
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Prorrogar Teste */}
                              {!isLifetime && (
                                <button
                                  onClick={() => {
                                    setExtendModalTenant(tenant);
                                    setExtendHours(24);
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-[11px] transition-all cursor-pointer"
                                  title="Prorrogar tempo de teste do cliente"
                                >
                                  + Prorrogar
                                </button>
                              )}

                              {/* Expirar Teste Agora */}
                              {isActiveTrial && (
                                <button
                                  onClick={() => handleExpireTrial(tenant)}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 font-semibold rounded-lg text-[11px] transition-all cursor-pointer"
                                  title="Encerrar teste imediatamente"
                                >
                                  Expirar Agora
                                </button>
                              )}

                              {/* Ativar Vitalício Manual */}
                              {!isLifetime ? (
                                <button
                                  onClick={() => {
                                    setActivateModalTenant(tenant);
                                    setActivateNotes('');
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer"
                                  title="Ativar licença vitalícia manualmente para o cliente"
                                >
                                  💎 Ativar Vitalício
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRevokeLifetime(tenant)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold rounded-lg text-[11px] transition-all cursor-pointer"
                                  title="Revogar licença vitalícia"
                                >
                                  Revogar
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                onClick={() => {
                                  setResetPassModalTenant(tenant);
                                  setGeneratedPassword(null);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Redefinir senha de acesso do usuário"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Excluir Conta */}
                              <button
                                onClick={() => handleDeleteTenant(tenant)}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                                title="Excluir cadastro e dados"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: VENDAS & ATIVAÇÕES (CHECKOUTS) ==================== */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Sales Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="Buscar por comprador, e-mail ou transação..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setSalesStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  salesStatusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todas ({overview?.transactions.length || 0})
              </button>

              <button
                onClick={() => setSalesStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  salesStatusFilter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                🟢 Aprovadas / Pagas
              </button>

              <button
                onClick={() => setSalesStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  salesStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                🟡 Aguardando Pagamento (Pix)
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Comprador / Empresa</th>
                    <th className="px-4 py-3.5">Valor da Ativação</th>
                    <th className="px-4 py-3.5">Método de Pagamento</th>
                    <th className="px-4 py-3.5">Data / Hora</th>
                    <th className="px-4 py-3.5">Status da Compra</th>
                    <th className="px-4 py-3.5 text-right">Ações de Venda & Ativação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Nenhuma tentativa de compra ou transação registrada no momento.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isApproved = tx.status === 'approved';
                      const isPending = tx.status === 'pending';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Buyer info */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {tx.user_name}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {tx.tenant_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {tx.user_email} • {tx.user_phone}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white text-sm">
                                R$ {tx.amount.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Licença Vitalícia
                              </span>
                            </div>
                          </td>

                          {/* Method */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                              <span>{tx.payment_method || 'Pix / Mercado Pago'}</span>
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            <div>{formatDate(tx.created_at)}</div>
                            {tx.paid_at && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                Pago em: {formatDate(tx.paid_at)}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Pago & Ativado
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                <Clock className="w-3.5 h-3.5" /> Aguardando Pix / Checkout
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                                Cancelado
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Direct Recovery */}
                              <a
                                href={buildSalesWhatsAppUrl(tx)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all"
                                title="Chamar cliente no WhatsApp para fechar ativação"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chamar no WhatsApp</span>
                              </a>

                              {/* Manual Approve Button */}
                              {isPending && (
                                <button
                                  onClick={() => handleApproveTransaction(tx)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                                  title="Confirmar pagamento e liberar licença vitalícia"
                                >
                                  ✅ Confirmar Pagamento
                                </button>
                              )}

                              {/* Cancel */}
                              {isPending && (
                                <button
                                  onClick={() => handleCancelTransaction(tx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                                  title="Marcar como cancelado"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CONFIGURAÇÕES DO SAAS ==================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Card 1: Mercado Pago Configuration (Proprietário do SaaS) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm">
                  MP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Mercado Pago (Proprietário do SaaS)
                    </h3>
                    {settingMpAccessToken && settingMpAccessToken.startsWith('APP_USR-') ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Conectado (Pronto para Pix)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3" /> Aguardando Token APP_USR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Receba os pagamentos de R$ {Number(settingLifetimePrice || 199).toFixed(2)} das licenças SaaS diretamente na sua conta bancária do Mercado Pago via Pix automático.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveMercadoPago} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Access Token de Produção (Começa com APP_USR)
                </label>
                <div className="relative">
                  <input
                    type={showMpToken ? 'text' : 'password'}
                    value={settingMpAccessToken}
                    onChange={(e) => setSettingMpAccessToken(e.target.value)}
                    placeholder="APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMpToken(!showMpToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showMpToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Basta colar apenas o seu Token de Produção gerado no painel do Mercado Pago.
                  </span>
                  {settingMpAccessToken && !settingMpAccessToken.startsWith('APP_USR-') && (
                    <span className="text-rose-500 font-semibold">
                      Atenção: o token deve começar com "APP_USR-"
                    </span>
                  )}
                </div>
              </div>

              {/* Guia Rápido */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  📌 Onde encontrar seu Token no Mercado Pago:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>
                    Acesse o portal{' '}
                    <a
                      href="https://www.mercadopago.com.br/developers/panel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      Mercado Pago Developers <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Clique na sua aplicação em <strong>Suas integrações</strong> (ou crie uma se ainda não tiver).</li>
                  <li>No menu lateral esquerdo, clique em <strong>Credenciais de Produção</strong>.</li>
                  <li>Copie o <strong>Access Token</strong> (que inicia com <code className="text-sky-600 font-bold">APP_USR-</code>) e cole acima.</li>
                </ol>
              </div>

              {/* Webhook URL Box */}
              <div className="p-3.5 bg-sky-50/60 dark:bg-sky-950/20 rounded-xl border border-sky-100 dark:border-sky-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                    URL de Notificação Instantânea (Webhook do SaaS)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/license/webhook`;
                      navigator.clipboard.writeText(url);
                      showFeedback('URL do Webhook copiada para a área de transferência!');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 rounded-lg text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3 h-3" /> Copiar Webhook
                  </button>
                </div>
                <code className="block p-2 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900 rounded-lg text-[11px] font-mono text-sky-800 dark:text-sky-300 break-all select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/license/webhook` : 'https://seu-dominio.com/api/license/webhook'}
                </code>
                <p className="text-[10px] text-sky-700 dark:text-sky-400">
                  Cadastre esta URL em <strong>Notificações Webhook</strong> no Mercado Pago selecionando o evento <strong>Pagamentos (payment)</strong> para que o sistema aprove a licença do cliente instantaneamente após o Pix.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingMpSettings}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {savingMpSettings ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando Credenciais...
                    </>
                  ) : (
                    'Salvar Token do Mercado Pago'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Saas Business Configuration */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Settings className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Configurações Comerciais do SaaS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o valor da licença vitalícia e o tempo padrão do teste para novos cadastros.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor da Licença Vitalícia (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={settingLifetimePrice}
                      onChange={(e) => setSettingLifetimePrice(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Valor cobrado no Pix/Mercado Pago para ativação da licença do cliente.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duração Padrão do Teste Grátis (Horas)
                  </label>
                  <input
                    type="number"
                    value={settingTrialHours}
                    onChange={(e) => setSettingTrialHours(e.target.value)}
                    required
                    min="1"
                    max="720"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    Tempo que o novo cliente recebe ao criar uma conta gratuita (padrão: 72 horas / 3 dias).
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? 'Salvando...' : 'Salvar Alterações Comerciais'}
                </button>
              </form>
            </div>

            {/* Master Password Management */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Alterar Senha Mestre do Super Admin
                  </h3>
                  <p className="text-xs text-slate-500">
                    Troque a senha que protege o acesso a esta página exclusiva do Dono.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangeMasterPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Senha Mestre Atual
                  </label>
                  <input
                    type="password"
                    value={currentMasterPass}
                    onChange={(e) => setCurrentMasterPass(e.target.value)}
                    required
                    placeholder="Informe a senha atual..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nova Senha Mestre (mínimo 6 dígitos)
                  </label>
                  <input
                    type="password"
                    value={newMasterPass}
                    onChange={(e) => setNewMasterPass(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Nova senha mestre..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Nova Senha Mestre
                  </label>
                  <input
                    type="password"
                    value={confirmMasterPass}
                    onChange={(e) => setConfirmMasterPass(e.target.value)}
                    required
                    placeholder="Repita a nova senha..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  Atualizar Senha Mestre
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PRORROGAR TESTE ==================== */}
      {extendModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Prorrogar Teste Grátis
                </h3>
              </div>
              <button
                onClick={() => setExtendModalTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Cliente: <strong className="text-slate-900 dark:text-white">{extendModalTenant.name}</strong> ({extendModalTenant.owner.email})
              </p>
              <p className="text-xs text-slate-500">
                Selecione o período adicional de teste que deseja conceder a este usuário:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '+24 Horas', hours: 24 },
                { label: '+48 Horas', hours: 48 },
                { label: '+7 Dias', hours: 168 }
              ].map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setExtendHours(opt.hours)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    extendHours === opt.hours
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExtendModalTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExtendTrial}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Confirmar Prorrogação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ATIVAR VITALÍCIO MANUAL ==================== */}
      {activateModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Ativar Licença Vitalícia Manualmente
                </h3>
              </div>
              <button
                onClick={() => setActivateModalTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold">Liberar acesso vitalício para:</span>
                <div>{activateModalTenant.name} ({activateModalTenant.owner.full_name})</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  E-mail: {activateModalTenant.owner.email}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Utilize esta opção caso o cliente tenha realizado o pagamento por transferência Pix direta na sua conta ou em dinheiro.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observação interna (opcional)
              </label>
              <input
                type="text"
                value={activateNotes}
                onChange={(e) => setActivateNotes(e.target.value)}
                placeholder="Ex: Pix direto de R$ 199 recebido no WhatsApp"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivateModalTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleActivateLifetime}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Confirmar Ativação Vitalícia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: RESETAR SENHA DO USUÁRIO ==================== */}
      {resetPassModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Redefinir Senha do Usuário
                </h3>
              </div>
              <button
                onClick={() => {
                  setResetPassModalTenant(null);
                  setGeneratedPassword(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Redefinir senha de acesso para <strong>{resetPassModalTenant.owner.full_name}</strong> ({resetPassModalTenant.owner.email}).
            </p>

            {generatedPassword ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Nova senha gerada com sucesso:
                </span>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-300 dark:border-emerald-700">
                  <code className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {generatedPassword}
                  </code>
                  <button
                    onClick={() => handleCopy(generatedPassword, 'pass')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedText === 'pass' ? 'Copiado!' : 'Copiar Senha'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Envie esta senha para o cliente acessar a conta dele no sistema.
                </p>
              </div>
            ) : (
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPassModalTenant(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Gerar Nova Senha
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
