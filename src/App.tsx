import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { TrialBanner } from './components/common/TrialBanner.tsx';
import { CheckoutModal } from './components/common/CheckoutModal.tsx';
import { FloatingWhatsAppSupport } from './components/common/FloatingWhatsAppSupport.tsx';
import { Auth } from './pages/Auth.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Customers } from './pages/Customers.tsx';
import { Plans } from './pages/Plans.tsx';
import { Applications } from './pages/Applications.tsx';
import { Finance } from './pages/Finance.tsx';
import { WhatsAppAutomation } from './pages/WhatsAppAutomation.tsx';
import { Settings } from './pages/Settings.tsx';
import { SuperAdmin } from './pages/SuperAdmin.tsx';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [navigationFilter, setNavigationFilter] = useState<any>(null);

  // Detect if user navigated directly to /admin, /superadmin, #admin, or #/admin
  const checkIsAdminPath = () => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    return p === '/admin' || p === '/superadmin' || p.startsWith('/admin') || h === '#admin' || h === '#/admin' || h === '#superadmin';
  };

  const [isAdminDirectRoute, setIsAdminDirectRoute] = useState<boolean>(checkIsAdminPath);

  React.useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminDirectRoute(checkIsAdminPath());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 p-2 shadow-2xl flex items-center justify-center">
          <img src="/logo.png" alt="Gestor de Streamings" className="w-full h-full object-contain animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Carregando Gestor de Streamings SaaS...</span>
        </div>
      </div>
    );
  }

  // Direct URL access: /admin or #admin opens Super Admin directly
  if (isAdminDirectRoute) {
    return (
      <div className={`min-h-screen bg-slate-900 text-slate-100 ${isDark ? 'dark' : ''}`}>
        <SuperAdmin
          isStandalone
          onExit={() => {
            setIsAdminDirectRoute(false);
            window.location.hash = '';
            if (window.location.pathname.toLowerCase().includes('admin')) {
              window.history.pushState(null, '', '/');
            }
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onAdminClick={() => setIsAdminDirectRoute(true)} />
        <FloatingWhatsAppSupport />
      </>
    );
  }

  const handleNavigate = (tab: string, filter?: any) => {
    setCurrentTab(tab);
    if (filter) {
      setNavigationFilter(filter);
    } else {
      setNavigationFilter(null);
    }
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'customers':
        return <Customers initialFilter={navigationFilter?.filter} initialAction={navigationFilter?.action} />;
      case 'plans':
        return <Plans />;
      case 'applications':
        return <Applications />;
      case 'finance':
        return <Finance initialFilter={navigationFilter?.filter} />;
      case 'whatsapp':
        return <WhatsAppAutomation initialData={navigationFilter} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'superadmin':
        return <SuperAdmin />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans ${isDark ? 'dark' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setNavigationFilter(null);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Trial Countdown & Warning Banner */}
        <TrialBanner />

        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onTabChange={handleNavigate}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Mercado Pago Checkout & Lifetime License Modal */}
      <CheckoutModal />

      {/* Botão de Suporte WhatsApp Flutuante */}
      <FloatingWhatsAppSupport />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
