import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type AuthUser,
  type Empresa,
  getMe,
  getToken,
  getEmpresaId,
  setEmpresaId as storeEmpresaId,
  clearSession,
  saveSession,
  refreshSession,
  setOnSessionExpired,
  login as loginApi,
  register as registerApi,
} from '@/services/auth.service';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(getEmpresaId());
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      let data;
      try {
        data = await getMe(token);
      } catch {
        // El access token pudo expirar: intentar renovar y reintentar una vez.
        const newToken = await refreshSession();
        if (!newToken) throw new Error('Sesión no recuperable');
        data = await getMe(newToken);
      }
      setUser(data.user);
      setEmpresas(data.empresas);

      const stored = getEmpresaId();
      if (stored && data.empresas.some((e) => e.id === stored)) {
        setEmpresaId(stored);
      } else if (data.empresas.length > 0) {
        const first = data.empresas[0].id;
        storeEmpresaId(first);
        setEmpresaId(first);
      }
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Cuando una request falla con 401 sin remedio, el handler limpia el estado
  // y ProtectedRoute redirige al login.
  useEffect(() => {
    setOnSessionExpired(() => {
      setUser(null);
      setEmpresas([]);
      setEmpresaId(null);
    });
    return () => setOnSessionExpired(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginApi(email, password);
    saveSession(res.session);
    // Cargar empresas ANTES de setear user para evitar flash a onboarding
    const meData = await getMe(res.session.access_token);
    setEmpresas(meData.empresas);
    if (meData.empresas.length > 0) {
      const first = meData.empresas[0].id;
      storeEmpresaId(first);
      setEmpresaId(first);
    }
    setUser(meData.user);
    setLoading(false);
  }, []);

  const register = useCallback(async (email: string, password: string, nombre: string) => {
    // 1. Crear cuenta
    const regRes = await registerApi(email, password, nombre);

    // 2. Usar sesion del registro si existe, sino hacer login
    let token = regRes.session?.access_token;
    let refreshTok = regRes.session?.refresh_token ?? '';
    let userInfo = regRes.user;

    if (!token) {
      const loginRes = await loginApi(email, password);
      token = loginRes.session.access_token;
      refreshTok = loginRes.session.refresh_token;
      userInfo = loginRes.user;
    }

    if (!token) {
      throw new Error('No se pudo iniciar sesión automáticamente');
    }

    saveSession({ access_token: token, refresh_token: refreshTok });
    setUser(userInfo);
    setEmpresas([]);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setEmpresas([]);
    setEmpresaId(null);
  }, []);

  const switchEmpresa = useCallback((id: number) => {
    storeEmpresaId(id);
    setEmpresaId(id);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      empresas,
      empresaId,
      loading,
      login,
      register,
      logout,
      switchEmpresa,
      refresh: loadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
