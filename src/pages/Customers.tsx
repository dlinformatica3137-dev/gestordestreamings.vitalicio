import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Customer, StreamingApp, CommercialPlan, Charge, WhatsAppLog, WhatsAppAutomationSettings } from '../types/index.ts';
import { DEFAULT_STANDARD_ONE_DAY_BEFORE, DEFAULT_STANDARD_DUE_DATE, DEFAULT_STANDARD_AFTER_DUE_DATE } from './WhatsAppAutomation.tsx';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  RotateCw,
  Phone,
  MessageCircle,
  MessageSquare,
  Calendar,
  DollarSign,
  Tv,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  X,
  FileSpreadsheet,
  FileText,
  Eye,
  Loader2,
  Key,
  Copy,
  Send
} from 'lucide-react';

interface CustomersProps {
  initialFilter?: string;
  initialAction?: string;
}

export const Customers: React.FC<CustomersProps> = ({ initialFilter, initialAction }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [apps, setApps] = useState<StreamingApp[]>([]);
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter || 'all');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);

  // Modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Detail Drawer / Full-Screen Ficha Completa state
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<{ charges: Charge[]; messages: WhatsAppLog[] } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Renewal Modal
  const [renewingCustomer, setRenewingCustomer] = useState<Customer | null>(null);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<string>('Pix');
  const [renewDiscount, setRenewDiscount] = useState<number>(0);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  // In-app Toast message (avoids window.alert)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const { user } = useAuth();
  const [waSettings, setWaSettings] = useState<WhatsAppAutomationSettings | null>(null);

  const formatCurrency = (val: number) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Direct WhatsApp Send Modal (sem links externos!)
  const [directMsgCustomer, setDirectMsgCustomer] = useState<Customer | null>(null);
  const [directMsgType, setDirectMsgType] = useState<string>('due_date');
  const [directMsgCustomText, setDirectMsgCustomText] = useState<string>('');
  const [isSendingDirectMsg, setIsSendingDirectMsg] = useState<boolean>(false);

  const computeTemplateMessage = (
    c: Customer,
    type: string,
    currentSettings?: WhatsAppAutomationSettings | null
  ) => {
    const activeSettings = currentSettings !== undefined ? currentSettings : waSettings;
    const h = new Date().getHours();
    const greeting = h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
    const clientName = c.full_name || 'Cliente';
    const planName = c.plan_name || 'Plano de Assinatura';
    const priceStr = formatCurrency(c.monthly_fee);
    const dueDateStr = formatDateBR(c.due_date);
    const company = user?.company_name || 'Gestor de Streamings';

    const formatWithVars = (tmpl: string) => {
      let msg = tmpl
        .replace(/\{nome_cliente\}/g, clientName)
        .replace(/\{cliente\}/g, clientName)
        .replace(/\{nome_plano\}/g, planName)
        .replace(/\{plano\}/g, planName)
        .replace(/\{valor\}/g, priceStr)
        .replace(/\{data_vencimento\}/g, dueDateStr)
        .replace(/\{vencimento\}/g, dueDateStr)
        .replace(/\{nome_empresa\}/g, company)
        .replace(/\{empresa\}/g, company);
      if (msg.startsWith('Bom dia') || msg.startsWith('Boa tarde') || msg.startsWith('Boa noite')) {
        msg = msg.replace(/^(Bom dia|Boa tarde|Boa noite)/, greeting);
      }
      return msg;
    };

    if (type === 'one_day_before') {
      const raw = activeSettings?.template_one_day_before || DEFAULT_STANDARD_ONE_DAY_BEFORE;
      return formatWithVars(raw);
    }
    if (type === 'due_date') {
      const raw = activeSettings?.template_due_date || DEFAULT_STANDARD_DUE_DATE;
      return formatWithVars(raw);
    }
    if (type === 'after_due_date') {
      const raw = activeSettings?.template_after_due_date || DEFAULT_STANDARD_AFTER_DUE_DATE;
      return formatWithVars(raw);
    }
    if (type === 'credentials') {
      const u = c.stream_username || c.app_username || 'usuario_cliente';
      const p = c.stream_password || c.app_password || '********';
      const serverUrl = 'http://play.streamings.tv:8080';
      return `${greeting}, ${clientName}! Aqui estão os seus dados oficiais de acesso ao ${planName}:\n\n👤 Usuário: ${u}\n🔒 Senha: ${p}\n🌐 Servidor/URL: ${serverUrl}\n\nBom entretenimento! Se precisar de suporte, responda a esta mensagem.`;
    }
    return '';
  };

  const handleOpenDirectMsgModal = async (c: Customer) => {
    setDirectMsgCustomer(c);
    const todayStr = new Date().toISOString().split('T')[0];
    let initialType = 'due_date';
    if (c.due_date && c.due_date < todayStr) {
      initialType = 'after_due_date';
    } else if (c.due_date && c.due_date === todayStr) {
      initialType = 'due_date';
    } else {
      initialType = 'one_day_before';
    }
    setDirectMsgType(initialType);

    let latestSettings = waSettings;
    try {
      const fresh = await api.getWhatsAppSettings();
      if (fresh) {
        setWaSettings(fresh);
        latestSettings = fresh;
      }
    } catch {
      // keep current
    }

    const text = computeTemplateMessage(c, initialType, latestSettings);
    setDirectMsgCustomText(text);
  };

  const handleSelectDirectMsgType = (type: string) => {
    setDirectMsgType(type);
    if (!directMsgCustomer) return;
    if (type === 'custom') {
      if (!directMsgCustomText) {
        setDirectMsgCustomText(`Olá, ${directMsgCustomer.full_name}! `);
      }
    } else {
      const text = computeTemplateMessage(directMsgCustomer, type, waSettings);
      setDirectMsgCustomText(text);
    }
  };

  const handleResetToTemplate = (type: string) => {
    if (!directMsgCustomer) return;
    const text = computeTemplateMessage(directMsgCustomer, type, waSettings);
    setDirectMsgCustomText(text);
  };

  const handleSendDirectMsg = async () => {
    if (!directMsgCustomer) return;
    const phone = directMsgCustomer.whatsapp || directMsgCustomer.phone;
    if (!phone) {
      showToast('Cliente não possui telefone cadastrado.', 'error');
      return;
    }
    const message = directMsgCustomText;
    if (!message || !message.trim()) {
      showToast('Mensagem não pode ficar em branco.', 'error');
      return;
    }

    setIsSendingDirectMsg(true);
    try {
      await api.sendDirectWhatsApp({
        phone,
        message,
        customer_id: directMsgCustomer.id,
        customer_name: directMsgCustomer.full_name,
        event_type: directMsgType
      });
      showToast(`Mensagem enviada com sucesso diretamente pela instância para ${directMsgCustomer.full_name}!`, 'success');
      setDirectMsgCustomer(null);
      setDirectMsgCustomText('');
      if (selectedCustomerDetail && selectedCustomerDetail.id === directMsgCustomer.id) {
        handleViewDetail(directMsgCustomer);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar mensagem pela instância.', 'error');
    } finally {
      setIsSendingDirectMsg(false);
    }
  };

  // Form state
  const [sendWelcomeOnCreate, setSendWelcomeOnCreate] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    cpf: '',
    app_id: '',
    plan_id: '',
    monthly_fee: 0,
    start_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'Pix',
    status: 'active' as 'active' | 'inactive' | 'overdue',
    notes: '',
    mac_address: '',
    device_key: '',
    app_username: '',
    app_password: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custList, appList, planList, waSet] = await Promise.all([
        api.getCustomers(),
        api.getApplications(),
        api.getPlans(),
        api.getWhatsAppSettings().catch(() => null)
      ]);
      setCustomers(custList);
      setApps(appList);
      setPlans(planList);
      if (waSet) setWaSettings(waSet);

      if (initialAction === 'new' && appList.length > 0) {
        handleOpenCreateModal(appList, planList);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = (currentApps = apps, currentPlans = plans) => {
    const defaultAppId = currentApps[0]?.id || '';
    const defaultPlan = currentPlans.find((p) => p.app_id === defaultAppId) || currentPlans[0];

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    setFormData({
      full_name: '',
      phone: '',
      whatsapp: '',
      email: '',
      cpf: '',
      app_id: defaultAppId,
      plan_id: defaultPlan?.id || '',
      monthly_fee: defaultPlan ? Number(defaultPlan.price) : 25,
      start_date: new Date().toISOString().split('T')[0],
      due_date: nextMonth.toISOString().split('T')[0],
      payment_method: 'Pix',
      status: 'active',
      notes: '',
      mac_address: '',
      device_key: '',
      app_username: '',
      app_password: ''
    });
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setFormData({
      full_name: c.full_name,
      phone: c.phone || '',
      whatsapp: c.whatsapp || c.phone || '',
      email: c.email || '',
      cpf: c.cpf || '',
      app_id: c.app_id,
      plan_id: c.plan_id,
      monthly_fee: c.monthly_fee,
      start_date: c.start_date,
      due_date: c.due_date,
      payment_method: c.payment_method || 'Pix',
      status: c.status,
      notes: c.notes || '',
      mac_address: c.mac_address || '',
      device_key: c.device_key || '',
      app_username: c.app_username || '',
      app_password: c.app_password || ''
    });
    setEditingCustomer(c);
    setIsCustomerModalOpen(true);
  };

  const handleAppChange = (appId: string) => {
    const relatedPlan = plans.find((p) => p.app_id === appId) || plans[0];
    setFormData((prev) => ({
      ...prev,
      app_id: appId,
      plan_id: relatedPlan ? relatedPlan.id : prev.plan_id,
      monthly_fee: relatedPlan ? Number(relatedPlan.price) : prev.monthly_fee
    }));
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setFormData((prev) => ({
      ...prev,
      plan_id: planId,
      monthly_fee: plan ? Number(plan.price) : prev.monthly_fee
    }));
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    // Neither phone nor email is strictly required now per user specification
    if (!formData.full_name || !formData.app_id || !formData.plan_id || !formData.due_date) {
      showToast('Preencha os campos obrigatórios: Nome Completo, Aplicativo, Plano e Vencimento.', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        phone: formData.phone || formData.whatsapp || '',
        whatsapp: formData.whatsapp || formData.phone || ''
      };

      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, payload);
        showToast('Cliente atualizado com sucesso!');
      } else {
        const createdCustomer = await api.createCustomer(payload);
        const targetPhone = createdCustomer.whatsapp || createdCustomer.phone;
        let sentMsgNotice = '';
        if (sendWelcomeOnCreate && targetPhone) {
          try {
            const welcomeText = computeTemplateMessage(createdCustomer, 'credentials', waSettings);
            await api.sendDirectWhatsApp({
              phone: targetPhone,
              message: welcomeText,
              customer_id: createdCustomer.id,
              customer_name: createdCustomer.full_name,
              event_type: 'credentials'
            });
            sentMsgNotice = ' e dados de acesso disparados via WhatsApp com sucesso!';
          } catch (waErr: any) {
            console.warn('WhatsApp welcome notice error:', waErr);
            sentMsgNotice = ` (aviso: WhatsApp não pôde ser enviado: ${waErr?.message || 'instância desconectada'})`;
          }
        }
        showToast(`Cliente cadastrado com sucesso${sentMsgNotice}`);
      }
      setIsCustomerModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar cliente.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    try {
      await api.deleteCustomer(customerToDelete.id);
      showToast('Cliente excluído com sucesso.');
      setCustomerToDelete(null);
      if (selectedCustomerDetail?.id === customerToDelete.id) {
        setSelectedCustomerDetail(null);
      }
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir cliente.', 'error');
    }
  };

  const handleViewDetail = async (customer: Customer) => {
    setSelectedCustomerDetail(customer);
    setIsLoadingHistory(true);
    try {
      const full = await api.getCustomerById(customer.id);
      setCustomerHistory({
        charges: full.charges || [],
        messages: full.messages || []
      });
    } catch (err) {
      console.error('Erro ao buscar histórico do cliente:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingCustomer) return;
    setIsRenewing(true);
    try {
      await api.renewCustomer(renewingCustomer.id, {
        payment_method: renewPaymentMethod,
        discount: Number(renewDiscount) || 0
      });
      showToast('Assinatura renovada com sucesso! Vencimento estendido.');
      setRenewingCustomer(null);
      await fetchData();
      if (selectedCustomerDetail?.id === renewingCustomer.id) {
        handleViewDetail(renewingCustomer);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao renovar assinatura.', 'error');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExportDropdownOpen(false);
    try {
      await api.downloadExport(format, selectedStatus);
      showToast(`Exportação ${format.toUpperCase()} gerada com sucesso!`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao exportar arquivo.', 'error');
    }
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return customers.filter((c) => {
      const matchesSearch =
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.whatsapp && c.whatsapp.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesApp = selectedApp === 'all' || c.app_id === selectedApp;

      let matchesStatus = true;
      if (selectedStatus === 'active') {
        matchesStatus = c.status === 'active';
      } else if (selectedStatus === 'overdue') {
        matchesStatus = c.status === 'overdue' || c.due_date < todayStr;
      } else if (selectedStatus === 'inactive') {
        matchesStatus = c.status === 'inactive';
      } else if (selectedStatus === 'upcoming') {
        const next7Days = new Date();
        next7Days.setDate(next7Days.getDate() + 7);
        const next7DaysStr = next7Days.toISOString().split('T')[0];
        matchesStatus = c.due_date >= todayStr && c.due_date <= next7DaysStr;
      }

      return matchesSearch && matchesApp && matchesStatus;
    });
  }, [customers, searchTerm, selectedApp, selectedStatus]);


  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[80] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold text-white animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Gerenciamento de Clientes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastre, controle vencimentos, renove assinaturas e consulte fichas completas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Export Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar</span>
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20 text-xs">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-left font-medium cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar para Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-left font-medium cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Exportar para CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, telefone ou e-mail..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter App */}
        <div>
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Aplicativos</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Situações</option>
            <option value="active">Em Dia (Ativos)</option>
            <option value="overdue">Vencidos / Inadimplentes</option>
            <option value="upcoming">Vencendo nos Próximos 7 Dias</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Customer Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Exibindo <strong>{filteredCustomers.length}</strong> de <strong>{customers.length}</strong> clientes
        </span>
        {selectedStatus !== 'all' && (
          <button
            onClick={() => setSelectedStatus('all')}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Desktop Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">WhatsApp / Fone</th>
                <th className="py-3 px-4">Aplicativo & Plano</th>
                <th className="py-3 px-4 text-right">Mensalidade</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const isOverdue = c.status === 'overdue' || (c.due_date < new Date().toISOString().split('T')[0] && c.status === 'active');
                  const contactNum = c.whatsapp || c.phone || 'Sem contato';
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {c.full_name}
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {c.email}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {c.whatsapp ? (
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{contactNum}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Tv className="w-3.5 h-3.5 text-blue-500" />
                          <span>{c.app_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {c.plan_name}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatCurrency(c.monthly_fee)}
                      </td>

                      <td className="py-3 px-4">
                        <div className={`font-mono tabular-nums font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatDateBR(c.due_date)}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-500 font-medium">Vencido</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            c.status === 'active' && !isOverdue
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {c.status === 'active' && !isOverdue ? 'Ativo' : isOverdue ? 'Inadimplente' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDirectMsgModal(c)}
                            title="Disparar WhatsApp direto da Instância"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => handleViewDetail(c)}
                            title="Ver ficha completa (Tela Toda)"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setRenewingCustomer(c);
                              setRenewDiscount(0);
                            }}
                            title="Renovar assinatura"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            title="Editar cliente"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(c)}
                            title="Excluir cliente"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c) => {
              const isOverdue = c.status === 'overdue' || (c.due_date < new Date().toISOString().split('T')[0] && c.status === 'active');
              const contactNum = c.whatsapp || c.phone || 'Sem contato';
              return (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {c.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {contactNum}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.status === 'active' && !isOverdue
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : isOverdue
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {c.status === 'active' && !isOverdue ? 'Ativo' : isOverdue ? 'Inadimplente' : 'Inativo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Serviço</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {c.app_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Vencimento</span>
                      <span className={`font-mono font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {formatDateBR(c.due_date)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Valor</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(c.monthly_fee)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleViewDetail(c)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ficha Completa</span>
                    </button>
                    <button
                      onClick={() => {
                        setRenewingCustomer(c);
                        setRenewDiscount(0);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Renovar
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCustomerToDelete(c)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum cliente cadastrado.
            </div>
          )}
        </div>
      </div>

      {/* Customer Create/Edit Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome completo */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    WhatsApp (com DDD)
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Ex: 11999998888"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400">Usado para lembretes automáticos e cobranças</p>
                </div>

                {/* E-mail (NÃO OBRIGATÓRIO) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400">Opcional para envio de avisos ou login</p>
                </div>

                {/* Aplicativo */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Aplicativo do Cliente * (ex: IBO Player, XCIPTV)
                  </label>
                  <select
                    required
                    value={formData.app_id}
                    onChange={(e) => handleAppChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione o aplicativo...</option>
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plano */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Plano Contratado *
                  </label>
                  <select
                    required
                    value={formData.plan_id}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione um plano...</option>
                    {(() => {
                      const matched = plans.filter((p) => !formData.app_id || p.app_id === formData.app_id);
                      const listToRender = matched.length > 0 ? matched : plans;
                      return listToRender.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {p.price}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Dados de Conexão no Aplicativo (Opcional) */}
                <div className="sm:col-span-2 p-3.5 bg-blue-50/50 dark:bg-slate-800/60 rounded-xl border border-blue-100 dark:border-slate-700 space-y-3">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                    Dados de Acesso no Aplicativo (Opcional — IBO Player, XCIPTV, etc.)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Endereço MAC (para IBO Player, Bob Player, Smart IPTV)
                      </label>
                      <input
                        type="text"
                        value={formData.mac_address}
                        onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                        placeholder="Ex: 00:1A:79:AB:CD:EF"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Device Key / Senha do App
                      </label>
                      <input
                        type="text"
                        value={formData.device_key}
                        onChange={(e) => setFormData({ ...formData, device_key: e.target.value })}
                        placeholder="Ex: 123456"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Usuário da Linha / Xtream (XCIPTV, Smarters)
                      </label>
                      <input
                        type="text"
                        value={formData.app_username}
                        onChange={(e) => setFormData({ ...formData, app_username: e.target.value })}
                        placeholder="Ex: cliente_1092"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Senha da Linha / Xtream
                      </label>
                      <input
                        type="text"
                        value={formData.app_password}
                        onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
                        placeholder="Ex: pass_9981"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Valor da mensalidade */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Valor da Mensalidade (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Data de Vencimento */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Status do Cliente
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="active">Ativo (Em Dia)</option>
                    <option value="overdue">Inadimplente (Vencido)</option>
                    <option value="inactive">Inativo (Cancelado)</option>
                  </select>
                </div>

                {/* Observações internas */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Observações Internas (PIN, Dispositivo, etc.)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ex: Smart TV Samsung, perfil 2, PIN 1234"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
                {/* Checkbox de Envio Imediato de Boas-Vindas */}
                {!editingCustomer && (
                  <div className="sm:col-span-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Disparar dados de acesso via WhatsApp ao cadastrar
                        </p>
                        <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400">
                          Envia na mesma hora usuário, senha e dados do aplicativo direto pela sua instância conectada
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={sendWelcomeOnCreate}
                        onChange={(e) => setSendWelcomeOnCreate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-900 flex items-center justify-end gap-3 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800 mt-4 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renewal Subscription Modal */}
      {renewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Renovar Assinatura
                </h3>
              </div>
              <button
                onClick={() => setRenewingCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div><strong>Cliente:</strong> {renewingCustomer.full_name}</div>
              <div><strong>Plano:</strong> {renewingCustomer.plan_name}</div>
              <div><strong>Mensalidade:</strong> {formatCurrency(renewingCustomer.monthly_fee)}</div>
            </div>

            <form onSubmit={handleRenewSubscription} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Forma de Pagamento
                </label>
                <select
                  value={renewPaymentMethod}
                  onChange={(e) => setRenewPaymentMethod(e.target.value)}
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
                  Desconto Aplicado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={renewDiscount}
                  onChange={(e) => setRenewDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenewingCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRenewing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isRenewing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Renovação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha Completa do Cliente — Visualização em Tela Toda (w-screen h-screen fixed inset-0 z-[70]) */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-[70] w-screen h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Header da Ficha Completa em Tela Toda */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                title="Fechar ficha e voltar para lista"
              >
                <X className="w-4 h-4" />
                <span>Fechar Ficha</span>
              </button>

              <div className="overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
                    {selectedCustomerDetail.full_name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedCustomerDetail.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : selectedCustomerDetail.status === 'overdue'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {selectedCustomerDetail.status === 'active'
                      ? 'Em Dia (Ativo)'
                      : selectedCustomerDetail.status === 'overdue'
                      ? 'Inadimplente / Vencido'
                      : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  ID: {selectedCustomerDetail.id} · Cadastrado em {formatDateBR(selectedCustomerDetail.created_at ? selectedCustomerDetail.created_at.split('T')[0] : selectedCustomerDetail.start_date)}
                </p>
              </div>
            </div>

            {/* Ações Rápidas do Cabeçalho da Ficha */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => {
                  setRenewingCustomer(selectedCustomerDetail);
                  setRenewDiscount(0);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Renovar Assinatura</span>
              </button>

              <button
                onClick={() => handleOpenDirectMsgModal(selectedCustomerDetail)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar WhatsApp via Instância</span>
              </button>

              <button
                onClick={() => {
                  handleOpenEditModal(selectedCustomerDetail);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>Editar</span>
              </button>
            </div>
          </div>

          {/* Conteúdo em Tela Toda (Grid Completo 3 Colunas) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna 1: Dados do Cliente e Assinatura (4 colunas) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Cartão de Identificação & Contato */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Dados Pessoais & Contato</span>
                  </h3>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Telefone:</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {selectedCustomerDetail.phone || 'Não informado'}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">WhatsApp:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {selectedCustomerDetail.whatsapp || selectedCustomerDetail.phone || 'Não informado'}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">E-mail:</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate">
                        {selectedCustomerDetail.email || 'Não informado'}
                      </span>
                    </div>

                    {selectedCustomerDetail.cpf && (
                      <div className="py-2.5 flex justify-between gap-2">
                        <span className="text-slate-500">CPF:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {selectedCustomerDetail.cpf}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cartão do Contrato & Plano */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Tv className="w-4 h-4 text-purple-600" />
                    <span>Contrato & Assinatura</span>
                  </h3>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Aplicativo / Serviço:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {selectedCustomerDetail.app_name}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Plano Contratado:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedCustomerDetail.plan_name}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Valor da Mensalidade:</span>
                      <span className="text-base font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(selectedCustomerDetail.monthly_fee)}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Data de Início:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {formatDateBR(selectedCustomerDetail.start_date)}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Próximo Vencimento:</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatDateBR(selectedCustomerDetail.due_date)}
                      </span>
                    </div>

                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-500">Forma de Pagamento:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedCustomerDetail.payment_method || 'Pix'}
                      </span>
                    </div>
                  </div>

                  {selectedCustomerDetail.notes && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase mb-1">
                        Observações Internas (PIN, Aparelho):
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        {selectedCustomerDetail.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Cartão de Acesso no Aplicativo (MAC / Device Key / Xtream) */}
                {(selectedCustomerDetail.mac_address || selectedCustomerDetail.device_key || selectedCustomerDetail.app_username || selectedCustomerDetail.app_password) && (
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-600" />
                        <span>Acesso no Aplicativo ({selectedCustomerDetail.app_name})</span>
                      </h3>
                      <button
                        onClick={() => {
                          const creds = `*Dados de Acesso - ${selectedCustomerDetail.app_name}*\n` +
                            (selectedCustomerDetail.mac_address ? `• MAC Address: ${selectedCustomerDetail.mac_address}\n` : '') +
                            (selectedCustomerDetail.device_key ? `• Device Key: ${selectedCustomerDetail.device_key}\n` : '') +
                            (selectedCustomerDetail.app_username ? `• Usuário: ${selectedCustomerDetail.app_username}\n` : '') +
                            (selectedCustomerDetail.app_password ? `• Senha: ${selectedCustomerDetail.app_password}\n` : '');
                          navigator.clipboard.writeText(creds);
                          showToast('Dados de acesso copiados para a área de transferência!');
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Dados</span>
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {selectedCustomerDetail.mac_address && (
                        <div className="py-2.5 flex justify-between gap-2">
                          <span className="text-slate-500">Endereço MAC:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {selectedCustomerDetail.mac_address}
                          </span>
                        </div>
                      )}
                      {selectedCustomerDetail.device_key && (
                        <div className="py-2.5 flex justify-between gap-2">
                          <span className="text-slate-500">Device Key:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {selectedCustomerDetail.device_key}
                          </span>
                        </div>
                      )}
                      {selectedCustomerDetail.app_username && (
                        <div className="py-2.5 flex justify-between gap-2">
                          <span className="text-slate-500">Usuário Xtream:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {selectedCustomerDetail.app_username}
                          </span>
                        </div>
                      )}
                      {selectedCustomerDetail.app_password && (
                        <div className="py-2.5 flex justify-between gap-2">
                          <span className="text-slate-500">Senha Xtream:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {selectedCustomerDetail.app_password}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna 2: Histórico Financeiro & Cobranças (4 colunas) */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Cobranças & Pagamentos</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    {customerHistory?.charges?.length || 0} registro(s)
                  </span>
                </div>

                {isLoadingHistory ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Carregando cobranças...
                  </div>
                ) : customerHistory?.charges && customerHistory.charges.length > 0 ? (
                  <div className="space-y-3">
                    {customerHistory.charges.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums text-sm">
                            {formatCurrency(ch.amount)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ch.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : ch.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                            }`}
                          >
                            {ch.status === 'paid' ? 'Pago' : ch.status === 'overdue' ? 'Vencido' : 'Pendente'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Vencimento: {formatDateBR(ch.due_date)}</span>
                          <span>{ch.payment_method || 'Pix'}</span>
                        </div>

                        {ch.paid_at && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Liquidado em {new Date(ch.paid_at).toLocaleString('pt-BR')}
                          </div>
                        )}

                        {ch.notes && (
                          <div className="text-[11px] text-slate-400 italic">
                            Nota: {ch.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhuma cobrança registrada para este cliente.
                  </div>
                )}
              </div>

              {/* Coluna 3: Automação & Mensagens de WhatsApp (4 colunas) */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Lembretes de WhatsApp</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    {customerHistory?.messages?.length || 0} envio(s)
                  </span>
                </div>

                {isLoadingHistory ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Carregando mensagens...
                  </div>
                ) : customerHistory?.messages && customerHistory.messages.length > 0 ? (
                  <div className="space-y-3">
                    {customerHistory.messages.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-500">
                            {new Date(m.sent_at).toLocaleString('pt-BR')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Enviado
                          </span>
                        </div>

                        <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed">
                          {m.message_content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <p>Nenhum lembrete enviado ainda para este cliente.</p>
                    <p className="text-[11px] text-slate-500">
                      Os lembretes são disparados automaticamente pelo sistema conforme a data de vencimento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${customerToDelete?.full_name}"? Todas as cobranças associadas também serão removidas permanentemente.`}
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCustomerToDelete(null)}
      />

      {/* Modal: Envio Direto de WhatsApp pela Instância (Sem Link Externo) */}
      {directMsgCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 relative animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto my-auto">
            <button
              onClick={() => {
                setDirectMsgCustomer(null);
                setDirectMsgCustomText('');
              }}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Disparar WhatsApp Direto da Instância</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O envio ocorre diretamente da sua instância para o WhatsApp de <strong>{directMsgCustomer.full_name}</strong> sem precisar abrir link externo.
              </p>
            </div>

            {/* Customer Info Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Destinatário:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{directMsgCustomer.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">WhatsApp / Telefone:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {directMsgCustomer.whatsapp || directMsgCustomer.phone || 'Sem número'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Plano Atual:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{directMsgCustomer.plan_name || 'Assinatura'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Vencimento:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDateBR(directMsgCustomer.due_date)}</span>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Escolha o Modelo de Mensagem:
                </label>
                {directMsgType !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => handleResetToTemplate(directMsgType)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Restaurar texto original deste modelo"
                  >
                    <RotateCw className="w-3 h-3" /> Restaurar Modelo
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDirectMsgType('due_date')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    directMsgType === 'due_date'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Vencimento Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDirectMsgType('one_day_before')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    directMsgType === 'one_day_before'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  1 Dia Antes
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDirectMsgType('after_due_date')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    directMsgType === 'after_due_date'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Atraso
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDirectMsgType('credentials')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    directMsgType === 'credentials'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Dados Acesso
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDirectMsgType('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    directMsgType === 'custom'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Personalizada
                </button>
              </div>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {directMsgType === 'custom'
                  ? 'Digite sua mensagem personalizada:'
                  : 'Mensagem formatada (puxada exatamente do modelo de mensagem):'}
              </label>
              <textarea
                rows={8}
                value={directMsgCustomText}
                onChange={(e) => setDirectMsgCustomText(e.target.value)}
                placeholder="Escreva a mensagem aqui..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                {directMsgType === 'custom'
                  ? '💡 Mensagem livre personalizada para este cliente.'
                  : '💡 Esta mensagem utiliza o modelo exato configurado na Automação WhatsApp com os dados deste cliente e Pix preenchidos. Você pode editá-la antes de disparar.'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDirectMsgCustomer(null);
                  setDirectMsgCustomText('');
                }}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendDirectMsg}
                disabled={isSendingDirectMsg}
                className="flex-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingDirectMsg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Disparando pela Instância...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Diretamente pela Instância</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
