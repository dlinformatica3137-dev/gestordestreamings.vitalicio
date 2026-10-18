import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Clock, AlertTriangle, ShieldCheck, CreditCard, Sparkles, ArrowRight } from 'lucide-react';

export const TrialBanner: React.FC = () => {
  const { license, trialCountdown, openCheckout } = useAuth();

  if (!license || license.type === 'lifetime') {
    return null;
  }

  const expiresDate = license.trial_expires_at ? new Date(license.trial_expires_at) : null;
  const formattedExpiry = expiresDate
    ? `${expiresDate.toLocaleDateString('pt-BR')} às ${expiresDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  if (trialCountdown.isExpired) {
    return (
      <div className="bg-rose-500 text-white px-4 py-3 sm:px-6 shadow-md transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <AlertTriangle className="w-5 h-5 shrink-0 text-white animate-bounce" />
            <span>
              <strong>Período de teste de 3 dias encerrado!</strong> As funcionalidades de alteração foram bloqueadas. Adquira sua licença vitalícia para continuar gerenciando seus clientes.
            </span>
          </div>
          <button
            onClick={openCheckout}
            className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <span>Ative - R$ 199 Vitalício</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 sm:px-6 shadow-xs border-b border-indigo-950">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-medium text-slate-200">Período de teste gratuito ativo:</span>
            <span className="font-mono tabular-nums font-bold text-amber-300">
              {trialCountdown.formatted} restantes
            </span>
            <span className="hidden md:inline text-slate-400">·</span>
            <span className="hidden md:inline text-slate-300">
              Expira em {formattedExpiry}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openCheckout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Ative - R$ 199 Vitalício</span>
          </button>
        </div>
      </div>
    </div>
  );
};
