import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { api } from '../services/api.ts';
import {
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  CreditCard,
  Palette,
  Key,
  Globe,
  Sun,
  Moon,
  Maximize2,
  Clock,
  Sparkles,
  ExternalLink,
  CheckCircle,
  Copy,
  Lock,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

interface SettingsProps {
  onNavigate?: (tab: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { user, license, trialCountdown, openCheckout, refreshUser } = useAuth();
  const { isDark, toggleTheme, setTheme, isFullscreen, toggleFullscreen } = useTheme();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'account' | 'license' | 'appearance' | 'preferences'>('account');

  // Account form
  const [accountName, setAccountName] = useState<string>(user?.full_name || '');
  const [companyName, setCompanyName] = useState<string>(user?.company_name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState<boolean>(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingAccount(true);
    try {
      await api.updateProfile({
        full_name: accountName,
        company_name: companyName,
        phone
      });
      await refreshUser();
      showToast('Dados cadastrais atualizados com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar perfil.', 'error');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast('As novas senhas não conferem.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Senha alterada com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar senha.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDirectReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Digite uma nova senha com no mínimo 6 caracteres primeiro.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('As novas senhas não coincidem.', 'error');
      return;
    }
    if (!user?.email) {
      showToast('E-mail da conta não identificado.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.recoverPassword({
        email: user.email,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Senha alterada com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar senha.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[80] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold text-white animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <span>Configurações do Sistema</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Gerencie seu perfil, status da licença SaaS, segurança e aparência
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'account'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Minha Conta</span>
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'license'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Licença SaaS</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'appearance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Aparência</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'preferences'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Preferências</span>
        </button>
      </div>

      {/* Tab: Minha Conta */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Cadastrais */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Dados Cadastrais & Marca</span>
            </h3>

            {/* Logo da Marca */}
            <div className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/logo.png" alt="Logomarca" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">Logomarca do Sistema</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Exibida no menu, topo, login e telas de checkout</div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome do Negócio / Empresa
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  E-mail de Acesso (Não alterável)
                </label>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingAccount}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  {isUpdatingAccount ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Alteração de Senha */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Segurança & Senha</span>
              </h3>
              <span className="text-[11px] text-slate-400">Você pode trocar sua senha sempre que quiser</span>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Senha Atual
                  </label>
                  <button
                    type="button"
                    onClick={handleDirectReset}
                    disabled={isChangingPassword}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    title="Se não souber a senha atual, defina a nova senha abaixo e clique aqui"
                  >
                    Esqueceu a senha atual? Redefinir diretamente
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual (ou use a opção direta)"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDirectReset}
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
                >
                  {isChangingPassword ? 'Processando...' : 'Salvar sem Senha Antiga'}
                </button>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto px-5 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  {isChangingPassword ? 'Alterando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Licença SaaS */}
      {activeTab === 'license' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tipo de Licença
                </span>
                {license?.type === 'lifetime' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Vitalícia (R$ 199,00)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Período de Teste Gratuito (3 dias)
                  </span>
                )}
              </div>

              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div>
                  <strong>Data de Início:</strong> {license?.trial_started_at ? new Date(license.trial_started_at).toLocaleString('pt-BR') : 'Hoje'}
                </div>
                {license?.type === 'trial' && (
                  <div>
                    <strong>Data de Expiração:</strong> {license?.trial_expires_at ? new Date(license.trial_expires_at).toLocaleString('pt-BR') : ''}
                  </div>
                )}
                {license?.activated_at && (
                  <div>
                    <strong>Ativação Vitalícia:</strong> {new Date(license.activated_at).toLocaleString('pt-BR')} (Transação: {license.transaction_id})
                  </div>
                )}
              </div>
            </div>

            {license?.type === 'trial' ? (
              <div className="text-center sm:text-right space-y-2">
                <div className="text-xs text-slate-500">
                  Tempo Restante: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{trialCountdown.formatted}</strong>
                </div>
                <button
                  onClick={openCheckout}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
                >
                  Ative - R$ 199 Vitalício
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Conta Licenciada Vitalícia</span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">
              Termos e Condições da Licença Comercial:
            </h4>
            <p>
              A licença vitalícia confere ao titular o direito de uso permanente desta instalação do Gestor de Streamings SaaS, sem cobrança de mensalidades para a plataforma. O sistema permite cadastrar quantos clientes, planos e serviços forem necessários.
            </p>
          </div>
        </div>
      )}


      {/* Tab: Aparência */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Tema & Visual</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`text-left p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                !isDark ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-amber-500" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Modo Claro</h4>
                  <p className="text-[11px] text-slate-500">Interface com fundo branco e alto contraste</p>
                </div>
              </div>
              {!isDark && <CheckCircle className="w-5 h-5 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`text-left p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                isDark ? 'border-blue-600 bg-blue-950/60 shadow-xs ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Modo Escuro (Noturno)</h4>
                  <p className="text-[11px] text-slate-500">Ideal para ambientes noturnos e conforto visual</p>
                </div>
              </div>
              {isDark && <CheckCircle className="w-5 h-5 text-blue-400" />}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Modo Tela Cheia (F11 / Fullscreen)</h4>
              <p className="text-[11px] text-slate-500">Aproveite toda a área do monitor ou notebook sem barras de navegação</p>
            </div>
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>{isFullscreen ? 'Sair da Tela Cheia' : 'Ativar Tela Cheia'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Preferências */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Regionalização & Formatos</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px]">Fuso Horário Padrão</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-1 block">
                América/São Paulo (GMT-3)
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px]">Formato de Data</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-1 block">
                DD/MM/AAAA (Padrão Brasileiro)
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[11px]">Moeda Monetária</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-1 block">
                Real Brasileiro (R$ 0,00)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
