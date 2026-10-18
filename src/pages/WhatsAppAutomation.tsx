import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { api } from '../services/api.ts';
import { WhatsAppInstance, WhatsAppAutomationSettings, WhatsAppLog, Customer } from '../types/index.ts';
import {
  MessageSquare,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Send,
  Play,
  RotateCw,
  RefreshCw,
  Clock,
  Settings2,
  Phone,
  ShieldCheck,
  Zap,
  Info,
  Sliders,
  Calendar,
  Lock,
  Loader2,
  X,
  Smartphone,
  Check,
  Sparkles,
  User,
  KeyRound,
  Tv
} from 'lucide-react';

export const DEFAULT_STANDARD_ONE_DAY_BEFORE = `Olá! * {nome_cliente}!*
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

export const DEFAULT_STANDARD_DUE_DATE = `Olá! * {nome_cliente}!*
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

export const DEFAULT_STANDARD_AFTER_DUE_DATE = `Olá! * {nome_cliente}!*
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

interface WhatsAppAutomationProps {

  initialData?: {
    phone?: string;
    customer_name?: string;
    filter?: string;
    action?: string;
  } | null;
}

export const WhatsAppAutomation: React.FC<WhatsAppAutomationProps> = ({ initialData }) => {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [settings, setSettings] = useState<WhatsAppAutomationSettings | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // QR Code & Pairing Modal
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [simulatedPhone, setSimulatedPhone] = useState<string>('11987654321');
  const [isGeneratingQR, setIsGeneratingQR] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [generatedInstanceName, setGeneratedInstanceName] = useState<string>('');

  // Manual Direct Send Form
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>(initialData?.phone || '');
  const [manualCustomerName, setManualCustomerName] = useState<string>(initialData?.customer_name || '');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('due_date');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSendingDirect, setIsSendingDirect] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Dispatch Runner State
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  // Settings Form Saving
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Dynamic preview helper
  const getCurrentGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [inst, sett, logList, custList] = await Promise.all([
        api.getWhatsAppInstance(),
        api.getWhatsAppSettings(),
        api.getWhatsAppLogs(),
        api.getCustomers().catch(() => [])
      ]);
      setInstance(inst);
      setSettings(sett);
      setLogs(logList);
      setCustomers(custList);
    } catch (err) {
      console.error('Erro ao buscar dados do WhatsApp:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-fill if navigated from other page
  useEffect(() => {
    if (initialData?.phone) {
      setManualPhone(initialData.phone);
      if (initialData.customer_name) {
        setManualCustomerName(initialData.customer_name);
      }
    }
  }, [initialData]);

  // When customer is selected in manual send form, populate phone and preview
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setManualCustomerName('');
      setManualPhone('');
      return;
    }
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setManualCustomerName(found.full_name);
      setManualPhone(found.whatsapp || found.phone || '');
    }
  };

  // Build current message text based on template selection and customer data
  const getComputedMessage = () => {
    if (selectedTemplateType === 'custom') {
      return customMessage;
    }

    const greeting = getCurrentGreeting();
    const clientName = manualCustomerName || 'Cliente';
    const foundCust = customers.find((c) => c.id === selectedCustomerId);
    const planName = foundCust?.plan_name || 'Plano de Assinatura';
    const priceStr = foundCust?.monthly_fee
      ? `R$ ${Number(foundCust.monthly_fee).toFixed(2).replace('.', ',')}`
      : 'R$ 25,00';
    const dueDateStr = foundCust?.due_date
      ? new Date(foundCust.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');

    const formatWithVars = (tmpl: string) => {
      let msg = tmpl
        .replace(/\{nome_cliente\}/g, clientName)
        .replace(/\{nome_plano\}/g, planName)
        .replace(/\{valor\}/g, priceStr)
        .replace(/\{data_vencimento\}/g, dueDateStr);
      if (msg.startsWith('Bom dia') || msg.startsWith('Boa tarde') || msg.startsWith('Boa noite')) {
        msg = msg.replace(/^(Bom dia|Boa tarde|Boa noite)/, greeting);
      }
      return msg;
    };

    if (selectedTemplateType === 'one_day_before') {
      return formatWithVars(settings?.template_one_day_before || DEFAULT_STANDARD_ONE_DAY_BEFORE);
    }

    if (selectedTemplateType === 'due_date') {
      return formatWithVars(settings?.template_due_date || DEFAULT_STANDARD_DUE_DATE);
    }

    if (selectedTemplateType === 'after_due_date') {
      return formatWithVars(settings?.template_after_due_date || DEFAULT_STANDARD_AFTER_DUE_DATE);
    }

    if (selectedTemplateType === 'credentials') {
      const userLogin = foundCust?.stream_username || 'usuario_cliente';
      const userPass = foundCust?.stream_password || '********';
      const serverUrl = 'http://play.streamings.tv:8080';
      return `${greeting}, ${clientName}! Aqui estão os seus dados oficiais de acesso ao ${planName}:\n\n👤 Usuário: ${userLogin}\n🔒 Senha: ${userPass}\n🌐 Servidor/URL: ${serverUrl}\n\nBom entretenimento! Se precisar de suporte, responda a esta mensagem.`;
    }

    return customMessage;
  };

  // Open QR Code Pairing Modal
  // Pairing Modal state
  const [modalTab, setModalTab] = useState<'qr' | 'code'>('qr');
  const [isRequestingPairingCode, setIsRequestingPairingCode] = useState<boolean>(false);

  // Auto-detect when mobile WhatsApp finishes connection
  useEffect(() => {
    if (!showQRModal) return;
    const interval = setInterval(async () => {
      try {
        const inst = await api.getWhatsAppInstance();
        if (inst && inst.status === 'connected') {
          setInstance(inst);
          setShowQRModal(false);
          setSendSuccessMessage(
            `WhatsApp Conectado com sucesso! A instância "${inst.name}" está ativa e as mensagens automáticas foram iniciadas.`
          );
          await fetchData();
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showQRModal]);

  // Open QR Code Pairing Modal
  const handleOpenPairingModal = async (forceNew = false) => {
    setIsGeneratingQR(true);
    setShowQRModal(true);
    try {
      const res = await api.generateWhatsAppQR({
        forceNew,
        phone: simulatedPhone
      });
      const qrStr = res.qr_code;
      if (res.pairing_code) setPairingCode(res.pairing_code);
      if (res.instance?.name) setGeneratedInstanceName(res.instance.name);

      if (res.instance?.status === 'connected') {
        setShowQRModal(false);
        await fetchData();
        return;
      }

      if (qrStr) {
        // If Evolution API already returned a base64 image or data URL, render it directly!
        if (qrStr.startsWith('data:') || qrStr.startsWith('http')) {
          setQrDataUrl(qrStr);
        } else {
          // If it's a raw WhatsApp Multi-Device session string (e.g. 2@...), render crisp QR code
          const rawCode = res.raw_code || qrStr;
          const url = await QRCode.toDataURL(rawCode, {
            width: 320,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          setQrDataUrl(url);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar QR Code.');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Request 8-digit Pairing Code via phone number (No camera needed)
  const handleRequestPairingCode = async () => {
    const clean = simulatedPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      alert('Informe o número de telefone com DDD (ex: 11987654321) para gerar o código.');
      return;
    }
    setIsRequestingPairingCode(true);
    try {
      const res = await api.requestWhatsAppPairingCode(clean);
      if (res.pairing_code) {
        setPairingCode(res.pairing_code);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar código de pareamento no WhatsApp.');
    } finally {
      setIsRequestingPairingCode(false);
    }
  };

  // Confirm connection of device
  const handleConfirmConnection = async () => {
    setIsConnecting(true);
    try {
      const clean = simulatedPhone.replace(/\D/g, '');
      const formattedPhone = clean.length >= 10
        ? `+55 (${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`
        : simulatedPhone;

      const res = await api.connectWhatsApp({
        name: generatedInstanceName || instance?.name,
        provider: 'evolution',
        phone_number: formattedPhone
      });

      setInstance(res.instance);
      if (res.settings) setSettings(res.settings);
      setShowQRModal(false);
      setSendSuccessMessage(
        `Dispositivo Conectado com sucesso! A instância "${res.instance.name}" já está ativa e as mensagens automáticas foram iniciadas.`
      );
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao conectar dispositivo.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Instance
  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar esta instância do WhatsApp? As mensagens automáticas serão pausadas.')) {
      return;
    }
    try {
      const updated = await api.disconnectWhatsApp();
      setInstance(updated);
      setSendSuccessMessage('Instância desconectada com sucesso.');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao desconectar instância.');
    }
  };

  // Reset instance and clear any stuck session on Evolution API
  const handleResetSession = async () => {
    if (!confirm('Deseja resetar a sessão do WhatsApp na Evolution API? Isso limpará conexões travadas e gerará um novo QR Code limpo.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await api.resetWhatsAppInstance();
      setInstance(res.instance);
      if (res.instance?.name) setGeneratedInstanceName(res.instance.name);
      setQrDataUrl('');
      setPairingCode('');
      // Immediately request a fresh QR code with forceNew=true
      await handleOpenPairingModal(true);
      setSendSuccessMessage('Sessão resetada na Evolution API! Novo QR Code gerado com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao resetar sessão na Evolution API.');
    } finally {
      setIsResetting(false);
    }
  };

  // Direct Manual Message Send (NO external links!)
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (instance?.status !== 'connected') {
      alert('Conecte a instância do WhatsApp via QR Code antes de enviar mensagens.');
      return;
    }

    if (!manualPhone) {
      alert('Informe o telefone de destino com DDD.');
      return;
    }

    const messageText = getComputedMessage();
    if (!messageText || !messageText.trim()) {
      alert('Escreva o texto da mensagem a ser enviada.');
      return;
    }

    setIsSendingDirect(true);
    setSendSuccessMessage(null);
    try {
      const res = await api.sendDirectWhatsApp({
        phone: manualPhone,
        message: messageText,
        customer_id: selectedCustomerId || undefined,
        customer_name: manualCustomerName || undefined,
        event_type: selectedTemplateType === 'custom' ? 'manual_custom' : selectedTemplateType
      });

      setSendSuccessMessage(
        `Mensagem enviada com sucesso diretamente pela instância "${instance.name}" para ${manualPhone}!`
      );
      setCustomMessage('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem diretamente.');
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Save Automation Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const updated = await api.updateWhatsAppSettings(settings);
      setSettings(updated);
      setSettingsFeedback({
        message: 'Configurações de automação e modelos de mensagens salvas com sucesso!',
        type: 'success'
      });
      setTimeout(() => setSettingsFeedback(null), 5000);
    } catch (err: any) {
      setSettingsFeedback({
        message: err.message || 'Erro ao salvar configurações.',
        type: 'error'
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Restore Default Templates to Reference Standard
  const handleRestoreDefaultTemplates = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      template_one_day_before: DEFAULT_STANDARD_ONE_DAY_BEFORE,
      template_due_date: DEFAULT_STANDARD_DUE_DATE,
      template_after_due_date: DEFAULT_STANDARD_AFTER_DUE_DATE
    });
    setSettingsFeedback({
      message: 'Modelos padrões oficiais restaurados com sucesso! Clique em "Salvar Alterações" para confirmar.',
      type: 'success'
    });
  };

  // Run Immediate Automated Check
  const handleRunDispatchNow = async () => {
    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await api.dispatchWhatsAppCron();
      setDispatchResult(res.message);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao executar varredura.');
    } finally {
      setIsDispatching(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            <span>Automação & Conexão de WhatsApp</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Conecte sua instância via QR Code. Disparos automáticos e envios manuais diretamente da instância para o cliente.
          </p>
        </div>

        <button
          onClick={handleRunDispatchNow}
          disabled={isDispatching || instance?.status !== 'connected'}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          {isDispatching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verificando Vencimentos...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Executar Varredura e Envio Agora</span>
            </>
          )}
        </button>
      </div>

      {/* Global Success / Alert Banner */}
      {sendSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{sendSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSendSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {dispatchResult && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-2xl text-xs sm:text-sm flex items-center gap-3 shadow-xs">
          <Info className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{dispatchResult}</span>
        </div>
      )}

      {/* Top Cards: Instance Connection & Direct Manual Message */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Instance Status & QR Code (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <span>Instância do WhatsApp</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conexão direta por QR Code / Baileys & Evolution
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  instance?.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                }`}
              >
                {instance?.status === 'connected' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Conectado</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Desconectado</span>
                  </>
                )}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px] font-medium">Nome da Instância Gerada</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {instance?.name || 'Aguardando pareamento'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] font-medium">Número Conectado</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {instance?.phone_number || 'Não pareado'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] font-medium">Mensagens Automáticas</span>
                  <span className={`font-semibold ${settings?.is_active && instance?.status === 'connected' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {settings?.is_active && instance?.status === 'connected' ? '✅ Ativas e Operando' : '⏸️ Aguardando conexão'}
                  </span>
                </div>
              </div>

              {instance?.last_connected_at && (
                <div className="text-[11px] text-slate-500">
                  Última sincronização: {new Date(instance.last_connected_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            {instance?.status === 'connected' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenPairingModal(false)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reconectar / QR Code</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleOpenPairingModal(false)}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Conectar WhatsApp via QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSession}
                  disabled={isResetting}
                  title="Limpar sessão corrompida ou travada na Evolution API"
                  className="py-3 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>Resetar Sessão</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Direct Manual Message Sending without external links (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  <span>Disparo Direto da Instância (Sem Link Externo)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A mensagem sai direto da sua instância conectada para o WhatsApp da pessoa
                </p>
              </div>

              {instance?.status === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instância Pronta</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Conecte QR Primeiro</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSendDirectMessage} className="mt-4 space-y-3">
              {/* Select Customer from registered list or custom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Selecionar Cliente Cadastrado</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Digitar Manualmente ou Escolher --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.whatsapp || c.phone || 'Sem contato'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp de Destino (com DDD)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Template Type Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Modelo de Mensagem / Conteúdo
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateType('due_date')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTemplateType === 'due_date'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Vencimento Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateType('one_day_before')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTemplateType === 'one_day_before'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    1 Dia Antes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateType('after_due_date')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTemplateType === 'after_due_date'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Atraso / Inadimplente
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateType('credentials')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTemplateType === 'credentials'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Dados de Acesso
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateType('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTemplateType === 'custom'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Personalizada
                  </button>
                </div>
              </div>

              {/* Message Preview or Textarea */}
              {selectedTemplateType === 'custom' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Digite o texto livre da mensagem:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Olá! Segue sua cobrança..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Pré-visualização do texto que será enviado:
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {getComputedMessage()}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingDirect || instance?.status !== 'connected'}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSendingDirect ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Disparando diretamente pela instância...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Disparar Mensagem Diretamente pelo WhatsApp</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Automation Parameters & Template Editors */}
      {settings && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Regras de Lembretes Automáticos</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assim que a instância conecta, os lembretes automáticos funcionam em segundo plano
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_active}
                  onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <span className={settings.is_active ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                  {settings.is_active ? 'Automação Ativa' : 'Automação Pausada'}
                </span>
              </label>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {settingsFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                settingsFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              <span>{settingsFeedback.message}</span>
              <button
                type="button"
                onClick={() => setSettingsFeedback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Trigger Toggles & Scheduling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {/* Lembrete 1 dia antes */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.send_one_day_before}
                onChange={(e) => setSettings({ ...settings, send_one_day_before: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">1 Dia Antes</span>
                <span className="text-slate-500 text-[11px]">Enviar aviso na véspera do vencimento</span>
              </div>
            </label>

            {/* No dia do vencimento */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.send_on_due_date}
                onChange={(e) => setSettings({ ...settings, send_on_due_date: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">No Dia do Vencimento</span>
                <span className="text-slate-500 text-[11px]">Enviar aviso na data exata de pagar</span>
              </div>
            </label>

            {/* Após vencimento */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.send_after_due_date}
                onChange={(e) => setSettings({ ...settings, send_after_due_date: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-rose-600 rounded cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Após o Vencimento</span>
                <span className="text-slate-500 text-[11px]">Cobrar clientes inadimplentes</span>
              </div>
            </label>

            {/* Horário e Fuso */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white block text-xs">Horário de Disparo Automático</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={settings.scheduled_time || '09:00'}
                  onChange={(e) => setSettings({ ...settings, scheduled_time: e.target.value })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSavingSettings(true);
                      const updated = await api.updateWhatsAppSettings(settings);
                      if (updated) setSettings(updated);
                      setSettingsFeedback({
                        message: `Horário de disparo salvo com sucesso para às ${settings.scheduled_time}!`,
                        type: 'success'
                      });
                      setTimeout(() => setSettingsFeedback(null), 4000);
                    } catch (err: any) {
                      setSettingsFeedback({
                        message: err.message || 'Erro ao salvar horário.',
                        type: 'error'
                      });
                    } finally {
                      setIsSavingSettings(false);
                    }
                  }}
                  disabled={isSavingSettings}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Salvar este horário de disparo agora"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Horário</span>
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Horário Oficial de Brasília</span>
              </div>
            </div>
          </div>

          {/* Templates Textareas Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Modelos de Mensagens Pré-Definidas (Padrão Oficial)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Variáveis dinâmicas: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{"{nome_cliente}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{"{nome_plano}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{"{valor}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{"{data_vencimento}"}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestoreDefaultTemplates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs self-start sm:self-auto"
              title="Restaurar os 3 modelos de mensagens padrões"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Restaurar Modelos Padrões</span>
            </button>
          </div>

          {/* Templates Textareas */}
          <div className="space-y-4">
            {/* Template 1 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Mensagem: 1 Dia Antes do Vencimento</span>
                <span className="text-slate-400 text-[11px] font-normal">Lembrete na véspera</span>
              </label>
              <textarea
                rows={7}
                value={settings.template_one_day_before}
                onChange={(e) => setSettings({ ...settings, template_one_day_before: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed"
              />
            </div>

            {/* Template 2 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Mensagem: No Dia do Vencimento</span>
                <span className="text-slate-400 text-[11px] font-normal">Enviado no dia da expiração</span>
              </label>
              <textarea
                rows={7}
                value={settings.template_due_date}
                onChange={(e) => setSettings({ ...settings, template_due_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed"
              />
            </div>

            {/* Template 3 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Mensagem: Após o Vencimento (Inadimplente)</span>
                <span className="text-slate-400 text-[11px] font-normal">Cobrança de renovação</span>
              </label>
              <textarea
                rows={7}
                value={settings.template_after_due_date}
                onChange={(e) => setSettings({ ...settings, template_after_due_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed"
              />
            </div>
          </div>
          {/* Action buttons at bottom */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todas as regras de disparo, horário ({settings.scheduled_time || '09:00'}) e textos dos modelos serão salvos.
            </p>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Alterações...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações de Automação</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Execution Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Histórico de Envios & Lembretes da Instância</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro auditado de mensagens enviadas diretamente via WhatsApp com proteção de idempotência
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            title="Atualizar histórico"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Tipo do Envio</th>
                <th className="py-2.5 px-3">Mensagem Enviada</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {new Date(log.sent_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {log.customer_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {log.phone}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {log.event_type === 'one_day_before'
                          ? '1 Dia Antes'
                          : log.event_type === 'due_date'
                          ? 'No Vencimento'
                          : log.event_type === 'after_due_date'
                          ? 'Após Vencimento'
                          : log.event_type === 'credentials'
                          ? 'Dados de Acesso'
                          : 'Envio Manual'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300" title={log.message_content}>
                      {log.message_content}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        {log.status === 'sent' ? 'Enviado Direto' : 'Fila'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum envio registrado no histórico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code & Pairing Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 relative animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto my-auto">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pt-2 sm:pt-0">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Conectar WhatsApp à Instância
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conecte seu WhatsApp para habilitar disparos automáticos e mensagens diretas
              </p>
            </div>

            {/* Generated Instance Name Badge */}
            <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">
                Instância Evolution API
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-800 dark:text-emerald-200 break-all">
                {generatedInstanceName || instance?.name || 'instancia_gestor_auto'}
              </span>
            </div>

            {/* Method Tabs: QR Code vs Código no Celular */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('qr')}
                className={`py-2 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'qr'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="truncate">1. Escanear QR</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('code')}
                className={`py-2 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'code'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="truncate">2. Código Celular</span>
              </button>
            </div>

            {modalTab === 'qr' ? (
              /* TAB 1: QR CODE */
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center justify-center">
                  {isGeneratingQR ? (
                    <div className="w-52 h-52 sm:w-64 sm:h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                      <span className="text-xs text-slate-500 text-center px-4">Gerando QR Code oficial Evolution API...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <div className="relative p-2 sm:p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                      <img
                        src={qrDataUrl}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 sm:w-64 sm:h-64 rounded-xl object-contain"
                      />
                      <div className="absolute inset-x-3 top-3 h-1 bg-emerald-500/80 blur-xs rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-52 h-52 sm:w-64 sm:h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                      QR Code indisponível
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPairingModal(true)}
                      disabled={isGeneratingQR}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Regerar QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSession}
                      disabled={isResetting || isGeneratingQR}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                      <span>Limpar e Criar Nova Sessão</span>
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Como escanear no celular:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em <strong>Mais opções (⋮)</strong> no Android ou <strong>Configurações</strong> no iPhone</li>
                    <li>Toque em <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong></li>
                    <li>Aponte a câmera para o QR Code acima</li>
                  </ol>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                    ⚡ Assim que você escanear, o sistema reconhece a conexão em segundos automaticamente!
                  </p>
                </div>

                {/* Ajuda com erro 'Não foi possível conectar novos aparelhos' */}
                <div className="bg-amber-50/90 dark:bg-amber-950/40 p-3 sm:p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Deu &quot;Não foi possível conectar novos aparelhos&quot; no WhatsApp?</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    <p className="font-medium">Essa mensagem é gerada pelo próprio WhatsApp do celular por 2 motivos:</p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li>
                        <strong>Limite atingido no celular:</strong> O WhatsApp permite no máximo 4 aparelhos conectados. No seu celular, vá em <em>Aparelhos Conectados</em> e desconecte qualquer sessão antiga.
                      </li>
                      <li>
                        <strong>Sessão antiga travada:</strong> Clique no botão <em>&quot;Limpar e Criar Nova Sessão&quot;</em> acima para reiniciar a conexão do zero com chaves limpas na Evolution API.
                      </li>
                      <li>
                        <strong>Alternativa sem câmera:</strong> Clique na aba <em>&quot;2. Código Celular&quot;</em> acima para parear digitando seu número.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: PAIRING CODE (WITHOUT CAMERA) */
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-semibold">Conexão por Código de 8 Dígitos (Sem câmera):</p>
                  <p className="text-[11px] mt-0.5">
                    Se sua câmera não estiver lendo o QR Code, você pode digitar o código diretamente no WhatsApp do seu celular!
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Seu Número do WhatsApp (com DDD):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="tel"
                      value={simulatedPhone}
                      onChange={(e) => setSimulatedPhone(e.target.value)}
                      placeholder="Ex: 11987654321"
                      className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleRequestPairingCode}
                      disabled={isRequestingPairingCode}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isRequestingPairingCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Gerar Código</span>
                      )}
                    </button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                      Código de 8 dígitos para digitar no celular:
                    </span>
                    <span className="font-mono font-bold text-2xl tracking-widest text-emerald-900 dark:text-emerald-100 select-all block">
                      {pairingCode}
                    </span>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Como inserir o código:</div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>No WhatsApp do celular, vá em <strong>Aparelhos conectados</strong></li>
                    <li>Toque em <strong>Conectar um aparelho</strong></li>
                    <li>Embaixo da tela de leitura, toque em <strong>Conectar com número de telefone</strong></li>
                    <li>Digite o código de 8 dígitos mostrado acima</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Listening indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-1">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>Aguardando conexão do aparelho via WhatsApp...</span>
            </div>

            {/* Direct Instant Confirmation / Fallback */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleConfirmConnection}
                disabled={isConnecting}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando Instância...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Conexão / Dispositivo Conectado</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
