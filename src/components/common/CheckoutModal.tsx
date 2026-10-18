import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import {
  X,
  CheckCircle,
  Copy,
  QrCode,
  CreditCard,
  ExternalLink,
  Zap,
  Lock,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const { isCheckoutOpen, closeCheckout, refreshLicense, license } = useAuth();
  // Directly open on Pix as requested by user
  const [activeTab, setActiveTab] = useState<'pix' | 'mercadopago'>('pix');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoadingPref, setIsLoadingPref] = useState<boolean>(false);
  const [preferenceData, setPreferenceData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckoutOpen) {
      setActiveTab('pix');
      loadPreference();
    }
  }, [isCheckoutOpen]);

  // Real-time polling to detect when Pix is approved
  useEffect(() => {
    if (!isCheckoutOpen || successMessage) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.getLicenseStatus();
        if (data?.license?.type === 'lifetime') {
          setSuccessMessage('🎉 Pagamento via Pix aprovado com sucesso! Sua Licença Vitalícia foi ativada.');
          await refreshLicense();
          setTimeout(() => {
            closeCheckout();
            setSuccessMessage(null);
          }, 2500);
        }
      } catch (e) {
        // Silently ignore polling network hiccups
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isCheckoutOpen, successMessage]);

  const loadPreference = async () => {
    setIsLoadingPref(true);
    try {
      const data = await api.createMercadoPagoPreference();
      setPreferenceData(data);
    } catch (err) {
      console.error('Erro ao gerar cobrança Pix do Mercado Pago:', err);
    } finally {
      setIsLoadingPref(false);
    }
  };

  const handleCopyPix = () => {
    if (!preferenceData?.pixCode) return;
    navigator.clipboard.writeText(preferenceData.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      const res = await api.simulatePayment(preferenceData?.transaction?.id);
      setSuccessMessage('🎉 Pagamento de R$ 199,00 Aprovado com sucesso! Licença vitalícia ativada.');
      await refreshLicense();
      setTimeout(() => {
        closeCheckout();
        setSuccessMessage(null);
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Erro ao processar simulação.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Ativação da Licença Vitalícia</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white tracking-wide uppercase">
                  Pix Direto
                </span>
              </div>
              <p className="text-xs text-slate-300">Pagamento único sem mensalidades — Liberação imediata</p>
            </div>
          </div>
          <button
            onClick={closeCheckout}
            aria-label="Fechar checkout"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="m-4 sm:m-6 p-4 bg-emerald-500 text-white rounded-2xl flex items-center gap-3 shadow-lg animate-in fade-in zoom-in-95">
            <CheckCircle className="w-7 h-7 shrink-0 text-white" />
            <div>
              <div className="text-sm font-bold">{successMessage}</div>
              <div className="text-xs text-emerald-100">Atualizando o sistema...</div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Price Header Banner */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                Valor da Licença Vitalícia
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  R$ 199,00
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  Taxa Única
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 hidden sm:block">
              <div>✅ Acesso permanente</div>
              <div>✅ Clientes e planos ilimitados</div>
              <div>✅ WhatsApp automático ativo</div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('pix')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'pix'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Pagar com Pix (Recomendado)</span>
            </button>
            <button
              onClick={() => setActiveTab('mercadopago')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'mercadopago'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Cartão / Boleto</span>
            </button>
          </div>

          {/* ================= TAB 1: PIX DIRETO COM QR CODE E COPIA E COLA ================= */}
          {activeTab === 'pix' && (
            <div className="space-y-4">
              {isLoadingPref ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Gerando cobrança Pix instantânea...
                  </span>
                  <span className="text-xs text-slate-400">
                    Conectando com o Mercado Pago
                  </span>
                </div>
              ) : (
                <>
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    {preferenceData?.qrCodeBase64 ? (
                      <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 inline-block">
                        <img
                          src={preferenceData.qrCodeBase64}
                          alt="QR Code Pix R$ 199,00"
                          className="w-48 h-48 sm:w-56 sm:h-56 object-contain block mx-auto rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400">
                        <QrCode className="w-16 h-16 mb-2 text-slate-700" />
                        <span className="text-xs font-semibold">Pix R$ 199,00</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span>Aponte a câmera do aplicativo do seu banco para o QR Code acima</span>
                    </div>
                  </div>

                  {/* Pix Copia e Cola */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Pix Copia e Cola:</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Clique no botão verde para copiar
                      </span>
                    </div>

                    <div className="relative">
                      <textarea
                        readOnly
                        rows={2}
                        value={preferenceData?.pixCode || 'Carregando código Pix...'}
                        onClick={handleCopyPix}
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 select-all resize-none outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                        copied
                          ? 'bg-emerald-600 text-white shadow-emerald-600/30 scale-[1.01]'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copied ? '✅ Código Pix Copiado com Sucesso!' : 'Copiar Código Pix (Copia e Cola)'}</span>
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/70 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                      <span>Aguardando confirmação do Pix...</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      ⚡ Liberação Automática
                    </span>
                  </div>

                  {/* Instructions */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">
                      Instruções rápidas:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <li>Abra o aplicativo do seu banco preferido (Nubank, Inter, Itaú, Bradesco, etc.).</li>
                      <li>Acesse a área <strong>Pix</strong> e selecione <strong>Pix Copia e Cola</strong> (ou Ler QR Code).</li>
                      <li>Cole o código acima e confirme o pagamento de <strong>R$ 199,00</strong>.</li>
                      <li>O sistema identificará o pagamento e liberará seu acesso vitalício imediatamente!</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= TAB 2: CARTÃO DE CRÉDITO / MERCADO PAGO ================= */}
          {activeTab === 'mercadopago' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-2">
                <p className="font-bold">
                  Prefere pagar com Cartão de Crédito?
                </p>
                <p>
                  No ambiente seguro do <strong>Mercado Pago</strong> você pode parcelar sua Licença Vitalícia em até 12x no cartão de crédito.
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  A confirmação de pagamento é enviada automaticamente ao nosso sistema para ativação imediata da licença.
                </p>
              </div>

              {preferenceData?.initPoint ? (
                <a
                  href={preferenceData.initPoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#009EE3] hover:bg-[#0081B8] text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ir para Checkout Seguro Mercado Pago</span>
                </a>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Gerando link de checkout do Mercado Pago...
                </div>
              )}
            </div>
          )}

          {/* Sandbox & Verification Action Box */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Transação protegida por Webhook criptografado</span>
            </div>

            {/* Test Simulation Button (Allows instant activation for testing & evaluation) */}
            <button
              onClick={handleSimulatePayment}
              disabled={isSimulating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simular Pagamento Aprovado (Teste)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
