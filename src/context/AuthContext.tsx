import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, License } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: UserProfile | null;
  license: License | null;
  token: string | null;
  isLoading: boolean;
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshLicense: () => Promise<void>;
  refreshUser: () => Promise<void>;
  trialCountdown: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    formatted: string;
    isExpired: boolean;
  };
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gestor_stream_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const calculateRemainingSeconds = (lic: License | null): number => {
    if (!lic) return 0;
    if (lic.type === 'lifetime') return 999999999;
    if (typeof lic.remaining_seconds === 'number' && lic.remaining_seconds > 0) {
      return lic.remaining_seconds;
    }
    if (lic.trial_expires_at) {
      const exp = new Date(lic.trial_expires_at).getTime();
      return Math.max(0, Math.floor((exp - Date.now()) / 1000));
    }
    return 0;
  };

  const fetchSession = useCallback(async () => {
    const savedToken = localStorage.getItem('gestor_stream_token');
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setLicense(data.license);
      setRemainingSeconds(calculateRemainingSeconds(data.license));
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      localStorage.removeItem('gestor_stream_token');
      setToken(null);
      setUser(null);
      setLicense(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Real-time countdown timer for the 24-hour trial
  useEffect(() => {
    if (!license || license.type === 'lifetime') return;

    // Recalculate remaining seconds from expiration date to ensure continuous sync
    if (license.trial_expires_at) {
      const diffSecs = Math.max(0, Math.floor((new Date(license.trial_expires_at).getTime() - Date.now()) / 1000));
      if (diffSecs > 0) {
        setRemainingSeconds(diffSecs);
      }
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Double check with real clock before marking expired
          if (license.trial_expires_at && new Date(license.trial_expires_at).getTime() > Date.now()) {
            return Math.max(0, Math.floor((new Date(license.trial_expires_at).getTime() - Date.now()) / 1000));
          }
          clearInterval(timer);
          // Update license status only when the real clock has expired
          setLicense((curr) => curr ? { ...curr, status: 'expired', is_expired: true, remaining_seconds: 0 } : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [license?.type, license?.trial_expires_at]);

  const refreshLicense = async () => {
    try {
      const data = await api.getLicenseStatus();
      if (data.license) {
        setLicense(data.license);
        setRemainingSeconds(calculateRemainingSeconds(data.license));
      }
    } catch (err) {
      console.error('Failed to refresh license:', err);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setLicense(data.license);
      setRemainingSeconds(calculateRemainingSeconds(data.license));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    const data = await api.login(credentials);
    localStorage.setItem('gestor_stream_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setLicense(data.license);
    setRemainingSeconds(calculateRemainingSeconds(data.license));
  };

  const register = async (formData: any) => {
    const data = await api.register(formData);
    localStorage.setItem('gestor_stream_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setLicense(data.license);
    const rem = calculateRemainingSeconds(data.license);
    // Guarantees 3 days (259200s = 72h) on brand new registration
    setRemainingSeconds(rem > 0 ? rem : 259200);
  };

  const logout = () => {
    localStorage.removeItem('gestor_stream_token');
    setToken(null);
    setUser(null);
    setLicense(null);
  };

  const openCheckout = () => setIsCheckoutOpen(true);
  const closeCheckout = () => setIsCheckoutOpen(false);

  // Compute countdown display & strict 24-hour guarantee
  const isTrialFuture = license?.trial_expires_at
    ? new Date(license.trial_expires_at).getTime() > Date.now()
    : remainingSeconds > 0;

  const isExpired = license
    ? license.type === 'trial' && (license.is_expired === true || !isTrialFuture)
    : false;

  const effectiveSeconds = isTrialFuture && remainingSeconds <= 0 && license?.trial_expires_at
    ? Math.max(0, Math.floor((new Date(license.trial_expires_at).getTime() - Date.now()) / 1000))
    : remainingSeconds;

  const hours = Math.floor(effectiveSeconds / 3600);
  const minutes = Math.floor((effectiveSeconds % 3600) / 60);
  const seconds = effectiveSeconds % 60;
  const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return (
    <AuthContext.Provider
      value={{
        user,
        license,
        token,
        isLoading,
        isCheckoutOpen,
        openCheckout,
        closeCheckout,
        login,
        register,
        logout,
        refreshLicense,
        refreshUser,
        trialCountdown: {
          hours,
          minutes,
          seconds,
          totalSeconds: remainingSeconds,
          formatted,
          isExpired
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
