import React from 'react';
import { Menu, Key } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange?: (tab: string) => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, onToggleMobileSidebar }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-8 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Zone 1: Mobile menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Abrir menu lateral"
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Zone: Action to change password / settings */}
      <div className="flex items-center gap-2.5 text-xs">
        <button
          onClick={() => onTabChange?.('settings')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/90 text-slate-700 dark:text-slate-200 font-medium transition-all shadow-xs border border-slate-200/60 dark:border-slate-700/60"
          title="Trocar minha senha"
        >
          <Key className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Trocar Senha</span>
        </button>
      </div>
    </header>
  );
};
