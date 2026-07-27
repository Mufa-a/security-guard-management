import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as loginApi, pinLogin as pinLoginApi } from './authApi';
import type { LoginPayload, PinLoginPayload } from './authApi';

interface DecodedToken {
  user_id: string;
  email: string;
  role: string | null;
  exp: number;
}

interface AuthUser {
  id: string;
  email: string;
  role: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  pinMustChange: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  pinLogin: (payload: PinLoginPayload) => Promise<void>;
  clearPinMustChange: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeUser(token: string): AuthUser {
  const decoded = jwtDecode<DecodedToken>(token);
  return { id: decoded.user_id, email: decoded.email, role: decoded.role };
}

const PIN_MUST_CHANGE_KEY = 'pin_must_change';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pinMustChange, setPinMustChange] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        setUser(decodeUser(token));
        setPinMustChange(localStorage.getItem(PIN_MUST_CHANGE_KEY) === 'true');
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setIsLoading(false);
  }, []);

  async function login(payload: LoginPayload) {
    const { access, refresh } = await loginApi(payload);
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.removeItem(PIN_MUST_CHANGE_KEY);
    setPinMustChange(false);
    setUser(decodeUser(access));
  }

  async function pinLogin(payload: PinLoginPayload) {
    const { access, refresh, pin_must_change } = await pinLoginApi(payload);
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    if (pin_must_change) {
      localStorage.setItem(PIN_MUST_CHANGE_KEY, 'true');
      setPinMustChange(true);
    } else {
      localStorage.removeItem(PIN_MUST_CHANGE_KEY);
      setPinMustChange(false);
    }
    setUser(decodeUser(access));
  }

  function clearPinMustChange() {
    localStorage.removeItem(PIN_MUST_CHANGE_KEY);
    setPinMustChange(false);
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(PIN_MUST_CHANGE_KEY);
    setUser(null);
    setPinMustChange(false);
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, pinMustChange, login, pinLogin, clearPinMustChange, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}