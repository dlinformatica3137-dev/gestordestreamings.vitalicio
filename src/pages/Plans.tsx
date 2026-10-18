import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { CommercialPlan, StreamingApp, BillingCycle } from '../types/index.ts';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Tv,
  CheckCircle,
  X,
  Search,
  DollarSign,
  Clock
} from 'lucide-react';

export const Plans: React.FC = () => {
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [apps, setApps] = useState<StreamingApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<CommercialPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<CommercialPlan | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    app_id: '',
    category: 'streaming',
    price: 25.00,
    billing_cycle: 'mensal' as BillingCycle,
    duration_days: 30,
    status: 'active' as 'active' | 'inactive'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [planList, appList] = await Promise.all([
        api.getPlans(),
        api.getApplications()
      ]);
      setPlans(planList);
      setApps(appList);
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      app_id: apps[0]?.id || '',
      category: 'streaming',
      price: 29.90,
      billing_cycle: 'mensal',
      duration_days: 30,
      status: 'active'
    });
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: CommercialPlan) => {
    setFormData({
      name: p.name,
      description: p.description || '',
      app_id: p.app_id || '',
      category: p.category || 'streaming',
      price: p.price,
      billing_cycle: p.billing_cycle,
      duration_days: p.duration_days,
      status: p.status
    });
    setEditingPlan(p);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, formData);
      } else {
        await api.createPlan(formData);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar plano.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      await api.deletePlan(planToDelete.id);
      setPlanToDelete(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir plano.');
    }
  };

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.app_name && p.app_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (val: number) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            <span>Planos Comerciais</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure preços, ciclos de cobrança e serviços para suas vendas
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar plano..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-900 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/70 px-2.5 py-0.5 rounded-full">
                  {plan.app_name && plan.app_name !== 'Geral' ? plan.app_name : (plan.category || 'Streaming')}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPlanToDelete(plan)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
                {plan.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {plan.description || 'Sem descrição cadastrada.'}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    /{plan.billing_cycle}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{plan.duration_days} dias</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: IPTV Lista Completa Mensal"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ciclo de Cobrança
                  </label>
                  <select
                    value={formData.billing_cycle}
                    onChange={(e) => {
                      const cycle = e.target.value as BillingCycle;
                      let days = 30;
                      if (cycle === 'trimestral') days = 90;
                      if (cycle === 'semestral') days = 180;
                      if (cycle === 'anual') days = 365;
                      setFormData({ ...formData, billing_cycle: cycle, duration_days: days });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Duração em Dias
                  </label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrição do Plano
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Acesso simultâneo para 2 telas Full HD"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3 pb-1 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-4 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={Boolean(planToDelete)}
        title="Excluir Plano"
        message={`Deseja excluir o plano "${planToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
};
