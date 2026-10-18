import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import {
  LayoutDashboard,
  Users,
  Layers,
  Tv,
  DollarSign,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  CreditCard,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  LogOut,
  Key,
  TvMinimalPlay,
  Youtube,
  PlayCircle
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) => {
  const { user, license, trialCountdown, openCheckout, logout } = useAuth();
  const { isDark, toggleTheme, isFullscreen, toggleFullscreen } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'plans', label: 'Planos', icon: Layers },
    { id: 'applications', label: 'Aplicativos', icon: Tv },
    { id: 'finance', label: 'Financeiro & Cobranças', icon: DollarSign },
    { id: 'whatsapp', label: 'Automação WhatsApp', icon: MessageSquare },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleItemClick = (id: string) => {
    onTabChange(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 lg:static ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          className={`relative flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          } h-20 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-all`}
        >
          <div
            className={`flex items-center gap-3.5 overflow-hidden ${
              isCollapsed ? 'cursor-pointer justify-center' : ''
            }`}
            onClick={isCollapsed ? onToggleCollapse : undefined}
            title={isCollapsed ? 'Clique para expandir o menu' : undefined}
          >
            <div className="w-[58px] h-[58px] rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-md p-1 hover:scale-105 transition-transform">
              <img
                src="/logo.png"
                alt="Logo Gestor de Streamings"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate min-w-0">
                <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate leading-tight">
                  Gestor de Streamings
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold tracking-wide flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                  Streaming & IPTV
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={`hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${
              isCollapsed
                ? 'absolute -right-3 top-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-full p-1 z-20'
                : 'ml-1 shrink-0'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : (item as any).badge ? 'text-amber-500' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {!isCollapsed && (item as any).badge && (
                  <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase tracking-wider">
                    {(item as any).badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Vídeo Aula Tutorial Button */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80">
            <a
              href="https://youtu.be/lMqaxdLJoE4"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-red-600 dark:text-red-400 bg-red-50/70 hover:bg-red-100/90 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-200/70 dark:border-red-900/50 shadow-2xs group cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Assistir Vídeo Aula"
            >
              <Youtube className="w-5 h-5 shrink-0 text-red-600 dark:text-red-500 group-hover:scale-110 transition-transform" />
              {!isCollapsed && <span className="truncate">Vídeo Aula</span>}
              {!isCollapsed && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-600 text-white shadow-2xs uppercase tracking-wider">
                  <PlayCircle className="w-3 h-3" /> Assistir
                </span>
              )}
            </a>
          </div>
        </nav>

        {/* License & System Action Controls in Sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          {/* License Status Card / Ative Agora Button */}
          {!isCollapsed ? (
            <div className="p-3 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status da Conta</span>
                {license?.type === 'lifetime' ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Vitalícia
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                    <Clock className="w-3.5 h-3.5" /> Teste 3 Dias
                  </span>
                )}
              </div>

              {license?.type === 'trial' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono tabular-nums text-[11px]">
                    <span>Tempo restante:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-bold">
                      {trialCountdown.formatted}
                    </strong>
                  </div>

                  <button
                    onClick={openCheckout}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                    title="Ative - R$ 199 Vitalício"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>Ative - R$ 199 Vitalício</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  Sua licença vitalícia está 100% ativa e liberada.
                </div>
              )}
            </div>
          ) : (
            /* Collapsed License CTA */
            <div className="flex justify-center">
              {license?.type === 'trial' ? (
                <button
                  onClick={openCheckout}
                  title="Ative - R$ 199 Vitalício"
                  className="w-full flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-5 h-5 text-white" />
                </button>
              ) : (
                <div
                  title="Licença Vitalícia Ativa"
                  className="p-2 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons in Sidebar: Dark Mode, Fullscreen, Logout */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro / noturno'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              )}
              {!isCollapsed && (
                <span className="truncate">
                  {isDark ? 'Modo Claro' : 'Modo Noturno (Escuro)'}
                </span>
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title={isFullscreen ? 'Sair da tela cheia' : 'Expandir para tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              {!isCollapsed && (
                <span className="truncate">
                  {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                </span>
              )}
            </button>

            {/* User Profile & Logout */}
            <div
              className={`pt-1 flex items-center gap-2 ${
                isCollapsed ? 'justify-center flex-col' : 'justify-between px-1'
              }`}
            >
              {!isCollapsed && user && (
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col truncate text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {user.full_name}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 truncate text-[10px]">
                      {user.company_name}
                    </span>
                  </div>
                </div>
              )}

              {/* Change Password shortcut button */}
              <button
                onClick={() => onTabChange('settings')}
                title="Trocar Minha Senha"
                className={`p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors ${
                  isCollapsed ? '' : 'shrink-0'
                }`}
              >
                <Key className="w-4 h-4" />
              </button>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Encerrar sessão"
                className={`p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors ${
                  isCollapsed ? '' : 'shrink-0'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
