import { createContext } from 'react';
import type { AuthUser, Empresa } from '@/services/auth.service';

export interface AuthState {
  user: AuthUser | null;
  empresas: Empresa[];
  empresaId: number | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nombre: string) => Promise<void>;
  logout: () => void;
  switchEmpresa: (id: number) => void;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
