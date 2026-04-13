import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Rol } from '@/types/roles';

export interface Permissions {
  rol: Rol;
  canSeeFullDashboard: boolean;
  canSeeBasicKpis: boolean;
  canCreatePago: boolean;
  canEditPago: boolean;
  canDeletePago: boolean;
  pagosMaxDays: number | null;
  canScan: boolean;
  canSeeCuentas: boolean;
  canManageCuentas: boolean;
  canExport: boolean;
  canManageUsers: boolean;
  canManageConfig: boolean;
  canSeeAuditLog: boolean;
  canAuthorizeDuplicates: boolean;
  canChangeRoleTo: (targetRol: Rol) => boolean;
}

const FULL_DASHBOARD = new Set<Rol>(['dueno', 'admin', 'contador']);
const BASIC_KPIS = new Set<Rol>(['dueno', 'admin', 'supervisor']);
const CAN_CREATE = new Set<Rol>(['dueno', 'admin', 'supervisor', 'cajero']);
const CAN_DELETE = new Set<Rol>(['dueno', 'admin']);
const CAN_SCAN = new Set<Rol>(['dueno', 'admin', 'supervisor', 'cajero']);
const CAN_SEE_CUENTAS = new Set<Rol>(['dueno', 'admin', 'supervisor', 'cajero', 'contador']);
const CAN_MANAGE_CUENTAS = new Set<Rol>(['dueno', 'admin', 'supervisor']);
const CAN_EXPORT = new Set<Rol>(['dueno', 'admin', 'contador']);
const CAN_MANAGE_USERS = new Set<Rol>(['dueno', 'admin']);
const CAN_MANAGE_CONFIG = new Set<Rol>(['dueno', 'admin']);
const CAN_AUDIT = new Set<Rol>(['dueno', 'admin', 'contador']);
const CAN_AUTH_DUPES = new Set<Rol>(['dueno', 'admin', 'supervisor']);

const MANAGEABLE: Record<string, Set<Rol>> = {
  dueno: new Set(['admin', 'supervisor', 'cajero', 'contador']),
  admin: new Set(['supervisor', 'cajero', 'contador']),
};

export function usePermissions(): Permissions {
  const { empresas, empresaId } = useAuth();
  const empresa = empresas.find((e) => e.id === empresaId);
  const rol = (empresa?.rol ?? 'cajero') as Rol;

  return useMemo(() => ({
    rol,
    canSeeFullDashboard: FULL_DASHBOARD.has(rol),
    canSeeBasicKpis: BASIC_KPIS.has(rol),
    canCreatePago: CAN_CREATE.has(rol),
    canEditPago: CAN_CREATE.has(rol),
    canDeletePago: CAN_DELETE.has(rol),
    pagosMaxDays: rol === 'cajero' ? 0 : rol === 'supervisor' ? 7 : null,
    canScan: CAN_SCAN.has(rol),
    canSeeCuentas: CAN_SEE_CUENTAS.has(rol),
    canManageCuentas: CAN_MANAGE_CUENTAS.has(rol),
    canExport: CAN_EXPORT.has(rol),
    canManageUsers: CAN_MANAGE_USERS.has(rol),
    canManageConfig: CAN_MANAGE_CONFIG.has(rol),
    canSeeAuditLog: CAN_AUDIT.has(rol),
    canAuthorizeDuplicates: CAN_AUTH_DUPES.has(rol),
    canChangeRoleTo: (targetRol: Rol) => {
      if (targetRol === 'dueno') return false;
      const set = MANAGEABLE[rol];
      return set ? set.has(targetRol) : false;
    },
  }), [rol]);
}
