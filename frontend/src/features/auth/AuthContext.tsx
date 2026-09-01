import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  login as loginApi,
  pinLogin as pinLoginApi,
  acceptPolicy as acceptPolicyApi,
  logout as logoutApi,
  fetchMe,
} from './authApi';
import type { LoginPayload, PinLoginPayload } from './authApi';

interface AuthUser {
  id: string;
  email: string;
  role: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  pinMustChange: boolean;
  policyAccepted: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  pinLogin: (payload: PinLoginPayload) => Promise<void>;
  clearPinMustChange: () => void;
  acceptPolicy: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pinMustChange, setPinMustChange] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  // The JWT lives in an httpOnly cookie now, so it can't be decoded in JS.
  // "Who's logged in" is instead derived by asking the backend — this runs
  // on mount (page refresh) and right after login/pinLogin.
  async function hydrateFromSession() {
    try {
      const me = await fetchMe();
      setUser({ id: me.id, email: me.email, role: me.role });
      setPinMustChange(me.pin_must_change);
      setPolicyAccepted(me.policy_accepted);
    } catch {
      setUser(null);
      setPinMustChange(false);
      setPolicyAccepted(false);
    }
  }

  useEffect(() => {
    hydrateFromSession().finally(() => setIsLoading(false));
  }, []);

  async function login(payload: LoginPayload) {
    await loginApi(payload);
    await hydrateFromSession();
  }

  async function pinLogin(payload: PinLoginPayload) {
    await pinLoginApi(payload);
    await hydrateFromSession();
  }

  function clearPinMustChange() {
    setPinMustChange(false);
  }

  async function acceptPolicy() {
    await acceptPolicyApi();
    setPolicyAccepted(true);
  }

  async function logout() {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setPinMustChange(false);
      setPolicyAccepted(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user, isAuthenticated: !!user, pinMustChange, policyAccepted,
        login, pinLogin, clearPinMustChange, acceptPolicy, logout, isLoading,
      }}
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
