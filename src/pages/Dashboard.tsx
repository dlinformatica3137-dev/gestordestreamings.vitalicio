import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { DashboardMetrics } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  DollarSign,
  Calendar,
  AlertOctagon,
  Users,
  TrendingUp,
  ArrowRight,
  UserPlus,
  PlusCircle,
  Tv,
  MessageCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string, filter?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados da dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatCurrency = (val: number) => {
    return `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading && !metrics) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Olá, {user?.full_name?.split(' ')[0] || 'Gestor'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Aqui está o resumo financeiro e operacional da sua operação de streaming hoje.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button
            onClick={() => onNavigate('customers', { action: 'new' })}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS (Exact rules from prompt Section 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1 — Recebidos hoje (Verde) */}
        <div
          onClick={() => onNavigate('finance', { filter: 'paid_today' })}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide uppercase">
              Recebidos hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            {formatCurrency(metrics?.received_today || 0)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Cobranças pagas hoje</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Ver registros <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2 — Receber amanhã (Azul) */}
        <div
          onClick={() => onNavigate('finance', { filter: 'due_tomorrow' })}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 tracking-wide uppercase">
              Receber amanhã
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            {formatCurrency(metrics?.to_receive_tomorrow || 0)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Vencem no dia seguinte</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3 — Vencidos (Vermelho) */}
        <div
          onClick={() => onNavigate('finance', { filter: 'overdue' })}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 tracking-wide uppercase">
              Vencidos
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
            {formatCurrency(metrics?.overdue_total || 0)}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Em aberto e atrasados</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Cobrar clientes <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4 — Total ativos (Roxo) */}
        <div
          onClick={() => onNavigate('customers', { filter: 'active' })}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 tracking-wide uppercase">
              Total ativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            {metrics?.active_customers || 0}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Assinaturas vigentes</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Ver clientes <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Revenue Graph & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Flow Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Recebimentos Recentes</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico dos últimos 7 dias de pagamentos confirmados
              </p>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Extrato completo
            </button>
          </div>

          {/* Bar Chart Representation */}
          <div className="mt-6 flex items-end justify-between gap-2 sm:gap-4 h-44 pt-6 pb-2">
            {metrics?.monthly_revenue?.map((item, idx) => {
              const maxAmount = Math.max(...(metrics?.monthly_revenue?.map((m) => m.amount) || [100]), 100);
              const heightPercent = Math.max(12, Math.round((item.amount / maxAmount) * 100));
              const isToday = idx === metrics.monthly_revenue.length - 1;

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </span>
                  <div className="w-full max-w-[42px] bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end justify-center h-32">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-emerald-500 dark:bg-emerald-600'
                          : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600'
                      }`}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${isToday ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    {item.date.split('-')[2]}/{item.date.split('-')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Shortcuts & Modules */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Ações Rápidas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Atalhos operacionais mais utilizados
            </p>

            <div className="space-y-2.5 mt-4">
              <button
                onClick={() => onNavigate('customers', { action: 'new' })}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Cadastrar Cliente</div>
                    <div className="text-[11px] text-slate-500">Adicionar assinatura ou IPTV</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigate('plans')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Novo Plano</div>
                    <div className="text-[11px] text-slate-500">Configurar valores e ciclos</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigate('applications')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Novo Aplicativo</div>
                    <div className="text-[11px] text-slate-500">Netflix, IPTV, Disney+, Globoplay</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigate('whatsapp')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Disparar WhatsApp</div>
                    <div className="text-[11px] text-slate-500">Enviar lembretes de vencimento</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Expirations & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Vencimentos */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Próximos Vencimentos</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clientes que vencem nos próximos dias
              </p>
            </div>
            <button
              onClick={() => onNavigate('customers', { filter: 'upcoming' })}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Ver todos
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics?.upcoming_due_customers && metrics.upcoming_due_customers.length > 0 ? (
              metrics.upcoming_due_customers.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {c.full_name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {c.plan_name} · {c.phone}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums block">
                        {formatCurrency(c.monthly_fee)}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Vence: {formatDateBR(c.due_date)}
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigate('whatsapp', { phone: c.phone, customer_name: c.full_name })}
                      title="Enviar cobrança via WhatsApp"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum vencimento pendente para os próximos dias.
              </div>
            )}
          </div>
        </div>

        {/* Últimas Movimentações */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Últimas Movimentações</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cobranças e pagamentos registrados recentemente
              </p>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Ver financeiro
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics?.recent_charges && metrics.recent_charges.length > 0 ? (
              metrics.recent_charges.map((ch) => (
                <div key={ch.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {ch.customer_name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {ch.app_name} ({ch.plan_name}) · {ch.payment_method || 'Pix'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums block">
                      {formatCurrency(ch.amount)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        ch.status === 'paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : ch.status === 'overdue'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {ch.status === 'paid'
                        ? 'Pago'
                        : ch.status === 'overdue'
                        ? 'Vencido'
                        : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhuma movimentação registrada recentemente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
