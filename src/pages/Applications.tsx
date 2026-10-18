import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { StreamingApp } from '../types/index.ts';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import {
  Tv,
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  ExternalLink,
  CheckCircle,
  Key,
  Monitor,
  Smartphone,
  Radio,
  Layers,
  Sparkles,
  Info,
  X,
  Copy,
  Check
} from 'lucide-react';

interface PresetApp {
  name: string;
  category: string;
  color: string;
  login_type: 'xtream' | 'mac_key' | 'm3u' | 'stalker' | 'outro';
  requires_own_license: boolean;
  devices: string[];
  description: string;
  download_url: string;
  setup_notes: string;
}

const APP_PRESETS: PresetApp[] = [
  {
    name: 'IBO Player',
    category: 'player_iptv',
    color: '#1E40AF',
    login_type: 'mac_key',
    requires_own_license: true,
    devices: ['Smart TV Samsung', 'Smart TV LG', 'Roku', 'Fire TV Stick'],
    description: 'Player avançado para Smart TV com suporte a lista M3U e Xtream Codes via ativação de MAC Address e Device Key.',
    download_url: 'https://iboplayer.com',
    setup_notes: 'Cliente deve abrir o app, anotar MAC e Device Key da tela e ativar ou enviar para carregar a lista no portal oficial.'
  },
  {
    name: 'XCIPTV Player',
    category: 'android_box',
    color: '#0284C7',
    login_type: 'xtream',
    requires_own_license: false,
    devices: ['TV Box', 'Android TV', 'Fire TV Stick', 'Celular Android'],
    description: 'Reprodutor moderno e intuitivo com suporte nativo a login Xtream Codes (Servidor, Usuário e Senha).',
    download_url: 'https://play.google.com/store/apps/details?id=com.nathNetwork.xciptv',
    setup_notes: 'Configurar no app com: 1. Nome qualquer, 2. Usuário da linha, 3. Senha da linha, 4. URL/DNS do Servidor.'
  },
  {
    name: 'IPTV Smarters Pro',
    category: 'multiplataforma',
    color: '#059669',
    login_type: 'xtream',
    requires_own_license: false,
    devices: ['Android', 'iOS / iPhone', 'Smart TV', 'Windows / PC', 'Mac'],
    description: 'Reprodutor multiplataforma completo com player VLC embutido, EPG e suporte a Xtream Codes e M3U.',
    download_url: 'https://www.iptvsmarters.com',
    setup_notes: 'Opção "Entrar com Xtream Codes API". Informar Nome, Usuário, Senha e URL do Servidor com porta.'
  },
  {
    name: 'TiviMate IPTV',
    category: 'android_box',
    color: '#7C3AED',
    login_type: 'xtream',
    requires_own_license: true,
    devices: ['TV Box', 'Android TV', 'Fire TV Stick'],
    description: 'Player premium de referência para Android TV e Fire Stick com guia eletrônico EPG em grade clássica de TV a cabo.',
    download_url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv',
    setup_notes: 'Suporta múltiplas listas e EPG. Versão Premium desbloqueia gravação e troca rápida de canais.'
  },
  {
    name: 'Bob Player',
    category: 'smart_tv',
    color: '#EA580C',
    login_type: 'mac_key',
    requires_own_license: true,
    devices: ['Smart TV Samsung', 'Smart TV LG'],
    description: 'Player leve desenvolvido especialmente para Smart TVs Samsung Tizen e LG webOS com ativação por código MAC.',
    download_url: 'https://bobplayer.com',
    setup_notes: 'Ativação anual ou vitalícia necessária no portal do Bob Player após o período de teste do próprio app.'
  },
  {
    name: 'Smart IPTV (SIPTV)',
    category: 'smart_tv',
    color: '#DC2626',
    login_type: 'mac_key',
    requires_own_license: true,
    devices: ['Smart TV Samsung', 'Smart TV LG', 'Android TV'],
    description: 'Reprodutor tradicional para Smart TVs com upload de lista remoto via endereço MAC no portal siptv.app.',
    download_url: 'https://siptv.app',
    setup_notes: 'Acessar siptv.app/mylist, digitar o MAC da TV e fazer o upload do arquivo M3U ou link URL.'
  }
];

const AVAILABLE_DEVICES = [
  'Smart TV Samsung',
  'Smart TV LG',
  'Android TV',
  'TV Box',
  'Fire TV Stick',
  'Roku',
  'Celular Android',
  'iOS / iPhone',
  'Windows / PC'
];

export const Applications: React.FC = () => {
  const [apps, setApps] = useState<StreamingApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDevice, setFilterDevice] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<StreamingApp | null>(null);
  const [appToDelete, setAppToDelete] = useState<StreamingApp | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const [formData, setFormData] = useState({
    name: '',
    category: 'player_iptv',
    description: '',
    color: '#1E40AF',
    login_type: 'xtream' as 'xtream' | 'mac_key' | 'm3u' | 'stalker' | 'outro',
    requires_own_license: false,
    devices: ['Smart TV Samsung', 'Android TV'] as string[],
    download_url: '',
    setup_notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const data = await api.getApplications();
      setApps(data);
    } catch (err) {
      console.error('Erro ao buscar aplicativos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      category: 'player_iptv',
      description: '',
      color: '#1E40AF',
      login_type: 'xtream',
      requires_own_license: false,
      devices: ['Smart TV Samsung', 'TV Box'],
      download_url: '',
      setup_notes: '',
      status: 'active'
    });
    setEditingApp(null);
    setIsModalOpen(true);
  };

  const handleApplyPreset = (preset: PresetApp) => {
    setFormData({
      name: preset.name,
      category: preset.category,
      description: preset.description,
      color: preset.color,
      login_type: preset.login_type,
      requires_own_license: preset.requires_own_license,
      devices: [...preset.devices],
      download_url: preset.download_url,
      setup_notes: preset.setup_notes,
      status: 'active'
    });
    showToast(`Modelo do ${preset.name} carregado no formulário!`);
  };

  const handleOpenEditModal = (app: StreamingApp) => {
    setFormData({
      name: app.name,
      category: app.category || 'player_iptv',
      description: app.description || '',
      color: app.color || '#1E40AF',
      login_type: (app.login_type as any) || 'xtream',
      requires_own_license: Boolean(app.requires_own_license),
      devices: Array.isArray(app.devices) && app.devices.length > 0 ? [...app.devices] : ['Smart TV Samsung'],
      download_url: app.download_url || '',
      setup_notes: app.setup_notes || '',
      status: app.status
    });
    setEditingApp(app);
    setIsModalOpen(true);
  };

  const toggleDeviceSelection = (device: string) => {
    setFormData((prev) => {
      const exists = prev.devices.includes(device);
      return {
        ...prev,
        devices: exists ? prev.devices.filter((d) => d !== device) : [...prev.devices, device]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Informe o nome do aplicativo (ex: IBO Player, XCIPTV).', 'error');
      return;
    }

    try {
      if (editingApp) {
        await api.updateApplication(editingApp.id, formData);
        showToast('Aplicativo atualizado com sucesso!');
      } else {
        await api.createApplication(formData);
        showToast('Aplicativo cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      await fetchApps();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar aplicativo.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!appToDelete) return;
    try {
      await api.deleteApplication(appToDelete.id);
      showToast(`Aplicativo "${appToDelete.name}" excluído.`);
      setAppToDelete(null);
      await fetchApps();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir aplicativo.', 'error');
    }
  };

  const copyAppInstructions = (app: StreamingApp) => {
    const text = `*${app.name}*\n${app.description || ''}\n${app.download_url ? `Link de Download/Portal: ${app.download_url}\n` : ''}${app.setup_notes ? `Instruções: ${app.setup_notes}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedAppId(app.id);
    showToast('Instruções copiadas para a área de transferência!');
    setTimeout(() => setCopiedAppId(null), 2000);
  };

  const getLoginTypeLabel = (type?: string) => {
    switch (type) {
      case 'xtream': return 'Xtream Codes (Usuário e Senha)';
      case 'mac_key': return 'MAC Address + Device Key';
      case 'm3u': return 'Lista M3U / URL Direta';
      case 'stalker': return 'Portal Stalker';
      default: return 'Login Padrão';
    }
  };

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDevice =
        filterDevice === 'all' ||
        (Array.isArray(app.devices) && app.devices.includes(filterDevice));
      return matchesSearch && matchesDevice;
    });
  }, [apps, searchTerm, filterDevice]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[80] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Cadastro de Aplicativos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Cadastre e gerencie os aplicativos e players de reprodução (como IBO Player, XCIPTV, Smarters Pro, etc.)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Aplicativo</span>
        </button>
      </div>

      {/* Quick Presets Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800/60 p-4 rounded-2xl border border-blue-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Modelos Rápidos de Aplicativos (clique para pré-preencher):</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {APP_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                handleApplyPreset(preset);
                setEditingApp(null);
                setIsModalOpen(true);
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer hover:border-blue-400"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do aplicativo (ex: IBO, XCIPTV, Smarters)..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterDevice}
          onChange={(e) => setFilterDevice(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">Todos os Dispositivos</option>
          {AVAILABLE_DEVICES.map((dev) => (
            <option key={dev} value={dev}>
              {dev}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Apps */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs sm:text-sm">
          Carregando aplicativos cadastrados...
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Tv className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum aplicativo encontrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Cadastre os players utilizados pelos seus clientes (como IBO Player, XCIPTV ou Smarters Pro) para associá-los aos planos e clientes.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Cadastrar Primeiro Aplicativo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Badge & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: app.color || '#1E40AF' }}
                      className="w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-xs font-bold text-base shrink-0"
                    >
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {app.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 inline-block">
                        {getLoginTypeLabel(app.login_type)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyAppInstructions(app)}
                      title="Copiar instruções do app"
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedAppId === app.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(app)}
                      title="Editar aplicativo"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAppToDelete(app)}
                      title="Excluir aplicativo"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* License Tag */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {app.requires_own_license ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Requer Ativação de MAC / Licença do App
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Player Gratuito / Xtream
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-2">
                  {app.description || 'Sem descrição cadastrada.'}
                </p>

                {/* Devices Badges */}
                {Array.isArray(app.devices) && app.devices.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Dispositivos Compatíveis:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {app.devices.map((dev) => (
                        <span
                          key={dev}
                          className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                        >
                          {dev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download / Website Link */}
                {app.download_url && (
                  <div className="mt-2.5">
                    <a
                      href={app.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Download / Portal Oficial</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>
                    <strong className="text-slate-900 dark:text-white font-mono tabular-nums">
                      {app.active_customers_count || 0}
                    </strong>{' '}
                    clientes ativos
                  </span>
                </div>

                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                  Ativo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 flex-shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tv className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {editingApp ? 'Editar Aplicativo' : 'Cadastrar Aplicativo'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Selector inside modal */}
            {!editingApp && (
              <div className="px-3.5 sm:px-6 pt-2.5 pb-2 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex-shrink-0">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Preencher com modelo rápido:
                </span>
                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5">
                  {APP_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 cursor-pointer shrink-0"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome do Aplicativo */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nome do Aplicativo / Player *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: IBO Player, XCIPTV, IPTV Smarters Pro, Bob Player"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tipo de Conexão / Acesso */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tipo de Login / Conexão *
                  </label>
                  <select
                    value={formData.login_type}
                    onChange={(e) => setFormData({ ...formData, login_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="xtream">Xtream Codes (Servidor, Usuário e Senha)</option>
                    <option value="mac_key">MAC Address + Device Key (Ativação na tela)</option>
                    <option value="m3u">Lista M3U / URL Direta</option>
                    <option value="stalker">Portal Stalker</option>
                    <option value="outro">Outro método</option>
                  </select>
                </div>

                {/* Cor de Identificação */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cor de Destaque
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{formData.color}</span>
                  </div>
                </div>

                {/* Dispositivos Compatíveis */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dispositivos e Sistemas Compatíveis
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_DEVICES.map((device) => {
                      const isSelected = formData.devices.includes(device);
                      return (
                        <button
                          key={device}
                          type="button"
                          onClick={() => toggleDeviceSelection(device)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? `✓ ${device}` : `+ ${device}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Requer ativação própria */}
                <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="req_license"
                    checked={formData.requires_own_license}
                    onChange={(e) => setFormData({ ...formData, requires_own_license: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="req_license" className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                    <strong>Exige ativação de licença própria do player</strong> (ex: IBO Player e Bob Player cobram taxa de ativação anual/vitalícia no site oficial)
                  </label>
                </div>

                {/* Link de Download / Portal Oficial */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Link de Download ou Portal Oficial (Opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                    placeholder="Ex: https://iboplayer.com ou link da Google Play"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Descrição */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Descrição do Aplicativo
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Player para Smart TV Samsung, LG e Android com excelente estabilidade e suporte a EPG"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                {/* Instruções de Configuração para o Cliente */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Instruções de Configuração (Enviadas ao Cliente no WhatsApp)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.setup_notes}
                    onChange={(e) => setFormData({ ...formData, setup_notes: e.target.value })}
                    placeholder="Ex: Instale o XCIPTV na sua TV Box e entre com Usuário, Senha e Servidor informados acima."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3 pb-1 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-4 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  {editingApp ? 'Salvar Alterações' : 'Cadastrar Aplicativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={Boolean(appToDelete)}
        title="Excluir Aplicativo"
        message={`Deseja realmente excluir o aplicativo "${appToDelete?.name}"? Esta ação removerá o aplicativo do sistema.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setAppToDelete(null)}
      />
    </div>
  );
};
