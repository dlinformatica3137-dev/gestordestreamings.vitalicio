import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  TvMinimalPlay,
  Lock,
  Mail,
  User,
  Phone,
  Building,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  X
} from 'lucide-react';

interface AuthProps {
  onAdminClick?: () => void;
}

export const Auth: React.FC<AuthProps> = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery / Password Change modal
  const [isRecoveryOpen, setIsRecoveryOpen] = useState<boolean>(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState<string>('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState<string>('');
  const [showRecoveryNewPass, setShowRecoveryNewPass] = useState<boolean>(false);
  const [showRecoveryConfirmPass, setShowRecoveryConfirmPass] = useState<boolean>(false);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<boolean>(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  const [regFullName, setRegFullName] = useState<string>('');
  const [regCompany, setRegCompany] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regTerms, setRegTerms] = useState<boolean>(true);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Validação estrita: Nome, E-mail, WhatsApp e Senha obrigatórios
    if (!regFullName || !regFullName.trim()) {
      setErrorMessage('O Nome Completo é obrigatório para criar o teste.');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail || !emailRegex.test(regEmail.trim())) {
      setErrorMessage('Informe um e-mail válido (ex: seuemail@dominio.com).');
      setIsLoading(false);
      return;
    }

    const cleanPhone = (regPhone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('O Número de WhatsApp com DDD é obrigatório para criar o teste (mínimo 10 dígitos, ex: 11999998888).');
      setIsLoading(false);
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('A Senha é obrigatória e deve ter no mínimo 6 caracteres.');
      setIsLoading(false);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      setIsLoading(false);
      return;
    }

    if (!regTerms) {
      setErrorMessage('Você deve aceitar os termos de uso e política de privacidade.');
      setIsLoading(false);
      return;
    }

    try {
      // Simple client fingerprint to prevent trial abuse
      const fingerprint = `fp_${navigator.userAgent.replace(/\D/g, '').substring(0, 10)}`;

      await register({
        full_name: regFullName.trim(),
        company_name: regCompany.trim() || regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: cleanPhone,
        password: regPassword,
        confirm_password: regConfirmPassword,
        terms_accepted: regTerms,
        fingerprint
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMessage(null);
    setRecoverySuccess(false);

    if (recoveryNewPassword) {
      if (recoveryNewPassword.length < 6) {
        setRecoveryMessage('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (recoveryNewPassword !== recoveryConfirmPassword) {
        setRecoveryMessage('As confirmações de senha não coincidem.');
        return;
      }
    }

    setRecoveryLoading(true);
    try {
      const res = await api.recoverPassword({
        email: recoveryEmail,
        new_password: recoveryNewPassword || undefined,
        confirm_new_password: recoveryConfirmPassword || undefined
      });
      setRecoverySuccess(true);
      setRecoveryMessage(res.message || 'Senha alterada com sucesso! Você já pode entrar.');
      setLoginEmail(recoveryEmail.trim().toLowerCase());
      if (recoveryNewPassword) {
        setLoginPassword(recoveryNewPassword);
      }
    } catch (err: any) {
      setRecoverySuccess(false);
      setRecoveryMessage(err.message || 'Erro ao processar alteração de senha.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Presentation & Hero Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center p-1.5 shadow-xl shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Logo Gestor de Streamings" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white block">
                Gestor de Streamings
              </span>
              <span className="text-xs text-blue-400 font-bold tracking-wide flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Streaming & IPTV
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Gerencie seus clientes, mensalidades e WhatsApp em uma única plataforma.
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Sistema completo desenvolvido para revendedores de IPTV, canais fechados, Netflix, Disney+ e combos de streaming.
            </p>
          </div>

          {/* Value Highlights */}
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span><strong>3 dias de teste gratuito</strong> ativado no cadastro</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Licença vitalícia por <strong>R$ 199,00</strong> (sem mensalidades)</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span>Lembretes automáticos no WhatsApp com anti-duplicação</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span>Isolamento SaaS multi-empresa com exportações Excel e CSV</span>
            </div>
          </div>
        </div>

        {/* Auth Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-md p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-700/80 shadow-2xl space-y-4 sm:space-y-6">
          {/* Mobile brand header */}
          <div className="flex items-center gap-3 lg:hidden pb-3 border-b border-slate-700/60">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/70 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base block leading-tight">Gestor de Streamings</span>
              <span className="text-xs text-blue-400 font-bold">Streaming & IPTV</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-700">
            <button
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta (Teste 3 Dias Grátis)
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs text-rose-200">
              {errorMessage}
            </div>
          )}


          {/* Form Login */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryOpen(true);
                      setRecoveryMessage(null);
                      setRecoverySuccess(false);
                      if (loginEmail) setRecoveryEmail(loginEmail);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Esqueceu ou quer trocar a senha?</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
              </button>
            </form>
          )}

          {/* Form Register */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0"></span>
                <span>Preencha os campos obrigatórios abaixo para ativar seu <strong>teste de 3 dias grátis</strong> instantaneamente.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">Nome Completo</label>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Obrigatório *</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">Nome da Empresa / Painel</label>
                    <span className="text-[10px] text-slate-500">Opcional</span>
                  </div>
                  <input
                    type="text"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    placeholder="Ex: Minha Empresa / Painel (opcional)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">E-mail</label>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Obrigatório *</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">WhatsApp (com DDD)</label>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Obrigatório *</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">Senha</label>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Obrigatório *</span>
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200">Confirmar Senha</label>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Obrigatório *</span>
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repita a mesma senha"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-400 pt-1">
                <input
                  type="checkbox"
                  required
                  checked={regTerms}
                  onChange={(e) => setRegTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                />
                <span>
                  Declaro que aceito os Termos de Uso e a Política de Privacidade do Gestor de Streamings.
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Ativando Teste...' : 'Criar Conta e Iniciar 3 Dias Grátis'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Password Recovery & Change Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Trocar ou Redefinir Senha</h3>
                  <p className="text-[11px] text-slate-400">Defina uma nova senha para sua conta a qualquer momento</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRecoveryOpen(false);
                  setRecoveryMessage(null);
                  setRecoverySuccess(false);
                  setRecoveryNewPassword('');
                  setRecoveryConfirmPassword('');
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoverySuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-300">Senha Alterada com Sucesso!</h4>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    Sua nova senha foi salva. Os dados de login já foram preenchidos automaticamente na tela principal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryOpen(false);
                    setRecoveryMessage(null);
                    setRecoverySuccess(false);
                    setRecoveryNewPassword('');
                    setRecoveryConfirmPassword('');
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Entrar Agora no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverPassword} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Seu E-mail Cadastrado *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="ex: seu@email.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nova Senha Desejada *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRecoveryNewPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 dígitos"
                      className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryNewPass(!showRecoveryNewPass)}
                      className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showRecoveryNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Confirmar Nova Senha *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRecoveryConfirmPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryConfirmPass(!showRecoveryConfirmPass)}
                      className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showRecoveryConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {recoveryMessage && !recoverySuccess && (
                  <div className="p-3 bg-rose-950/70 border border-rose-700/80 text-rose-200 rounded-xl text-xs flex items-center gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{recoveryMessage}</span>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryOpen(false);
                      setRecoveryMessage(null);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
                  >
                    {recoveryLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
