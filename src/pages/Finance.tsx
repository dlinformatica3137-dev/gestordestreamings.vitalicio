import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Charge, ChargeStatus } from '../types/index.ts';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  AlertOctagon,
  Clock,
  XCircle,
  RotateCw,
  Plus,
  X,
  Calendar,
  CreditCard,
  Tv,
  Users,
  ChevronDown
} from 'lucide-react';

interface FinanceProps {
  initialFilter?: string;
}

export const Finance: React.FC<FinanceProps> = ({ initialFilter }) => {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter || 'all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  // Pay Charge Modal
  const [chargeToPay, setChargeToPay] = useState<Charge | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Cancel Charge Modal
  const [chargeToCancel, setChargeToCancel] = useState<Charge | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const fetchCharges = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCharges();
      setCharges(data);
    } catch (err) {
      console.error('Erro ao buscar cobranças:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeToPay) return;
    setIsSubmittingPayment(true);
    try {
      await api.payCharge(chargeToPay.id, {
        payment_method: paymentMethod,
        discount: Number(discountAmount) || 0,
        notes: paymentNotes
      });
      setChargeToPay(null);
      await fetchCharges();
      alert('Pagamento registrado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!chargeToCancel) return;
    try {
      await api.cancelCharge(chargeToCancel.id, cancelReason);
      setChargeToCancel(null);
      setCancelReason('');
      await fetchCharges();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar cobrança.');
    }
  };

  const filteredCharges = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return charges.filter((ch) => {
      const matchesSearch =
        ch.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ch.app_name && ch.app_name.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (selectedStatus === 'paid') {
        matchesStatus = ch.status === 'paid';
      } else if (selectedStatus === 'pending') {
        matchesStatus = ch.status === 'pending';
      } else if (selectedStatus === 'overdue') {
        matchesStatus = ch.status === 'overdue' || (ch.status === 'pending' && ch.due_date < todayStr);
      } else if (selectedStatus === 'paid_today') {
        matchesStatus = ch.status === 'paid' && Boolean(ch.paid_at && ch.paid_at.startsWith(todayStr));
      } else if (selectedStatus === 'due_tomorrow') {
        matchesStatus = ch.status === 'pending' && ch.due_date === tomorrowStr;
      } else if (selectedStatus === 'cancelled') {
        matchesStatus = ch.status === 'cancelled';
      }

      const matchesMethod = selectedMethod === 'all' || ch.payment_method === selectedMethod;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [charges, searchTerm, selectedStatus, selectedMethod]);

  // Aggregate totals
  const totalPaid = charges
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (Number(c.amount) - (Number(c.discount) || 0)), 0);

  const totalPending = charges
    .filter((c) => c.status === 'pending' && c.due_date >= new Date().toISOString().split('T')[0])
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalOverdue = charges
    .filter((c) => c.status === 'overdue' || (c.status === 'pending' && c.due_date < new Date().toISOString().split('T')[0]))
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const formatCurrency = (val: number) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <span>Financeiro & Cobranças</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Controle de mensalidades, baixas manuais, descontos e fluxo financeiro
          </p>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Recebido (Geral)
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {formatCurrency(totalPaid)}
          </div>
          <span className="text-[11px] text-slate-500 block mt-2">
            Pagamentos confirmados com sucesso
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            A Receber (Em Aberto)
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {formatCurrency(totalPending)}
          </div>
          <span className="text-[11px] text-slate-500 block mt-2">
            Cobranças vigentes aguardando vencimento
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Vencido / Inadimplente
          </span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1">
            {formatCurrency(totalOverdue)}
          </div>
          <span className="text-[11px] text-slate-500 block mt-2">
            Mensalidades com data de pagamento expirada
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou serviço..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos os Status</option>
            <option value="paid">Pagas</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Vencidas</option>
            <option value="paid_today">Pagas Hoje</option>
            <option value="due_tomorrow">Vencem Amanhã</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        <div>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Formas de Pagamento</option>
            <option value="Pix">Pix</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Boleto">Boleto</option>
            <option value="Dinheiro">Dinheiro</option>
          </select>
        </div>
      </div>

      {/* Charges Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Serviço / Plano</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCharges.length > 0 ? (
                filteredCharges.map((ch) => {
                  const isOverdue = ch.status === 'overdue' || (ch.status === 'pending' && ch.due_date < new Date().toISOString().split('T')[0]);
                  return (
                    <tr key={ch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {ch.customer_name}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {ch.app_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ch.plan_name}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ch.amount)}
                        {ch.discount ? (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            Desc: -{formatCurrency(ch.discount)}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {formatDateBR(ch.due_date)}
                        </span>
                        {ch.paid_at && (
                          <div className="text-[10px] text-emerald-600">
                            Pago em {formatDateBR(ch.paid_at.split('T')[0])}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {ch.payment_method || 'Pix'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            ch.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : ch.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {ch.status === 'paid' ? 'Pago' : isOverdue ? 'Vencido' : ch.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ch.status !== 'paid' && ch.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => {
                                  setChargeToPay(ch);
                                  setPaymentMethod(ch.payment_method || 'Pix');
                                  setDiscountAmount(0);
                                  setPaymentNotes('');
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                              >
                                Baixar
                              </button>
                              <button
                                onClick={() => setChargeToCancel(ch)}
                                className="px-2 py-1 text-slate-400 hover:text-rose-600 rounded-lg text-xs"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {ch.status === 'paid' && (
                            <span className="text-[11px] text-slate-400 italic">Liquidado</span>
                          )}
                          {ch.status === 'cancelled' && (
                            <span className="text-[11px] text-slate-400 italic">Cancelado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma cobrança encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Charge Modal */}
      {chargeToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Registrar Pagamento Manual
              </h3>
              <button
                onClick={() => setChargeToPay(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div><strong>Cliente:</strong> {chargeToPay.customer_name}</div>
              <div><strong>Serviço:</strong> {chargeToPay.app_name} ({chargeToPay.plan_name})</div>
              <div><strong>Valor Original:</strong> {formatCurrency(chargeToPay.amount)}</div>
              <div><strong>Vencimento:</strong> {formatDateBR(chargeToPay.due_date)}</div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Forma de Pagamento *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Desconto Concedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Observações / Comprovante
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex: Comprovante enviado via WhatsApp"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setChargeToPay(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Charge Modal */}
      {chargeToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cancelar Cobrança
            </h3>
            <p className="text-xs text-slate-500">
              Deseja realmente cancelar a cobrança de <strong>{chargeToCancel.customer_name}</strong> no valor de <strong>{formatCurrency(chargeToCancel.amount)}</strong>?
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Motivo do cancelamento
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Cliente desistiu ou plano renegociado"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setChargeToCancel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
