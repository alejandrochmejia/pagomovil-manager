export type Rol = 'dueno' | 'admin' | 'supervisor' | 'cajero' | 'contador';

export const ROL_LABELS: Record<Rol, string> = {
  dueno: 'Dueño',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  cajero: 'Cajero',
  contador: 'Contador',
};

export const ROL_DESCRIPTIONS: Record<Rol, string> = {
  dueno: 'Acceso total. Rol inmutable',
  admin: 'Acceso total. Gestión de usuarios',
  supervisor: 'Operaciones + 7 días + KPIs básicos',
  cajero: 'Solo hoy: escanear y cargar pagos',
  contador: 'Solo lectura. Reportes y exportación',
};

export const ROL_BADGE_VARIANT: Record<Rol, 'success' | 'warning' | 'info' | 'danger'> = {
  dueno: 'danger',
  admin: 'success',
  supervisor: 'warning',
  cajero: 'info',
  contador: 'info',
};

export const ASSIGNABLE_ROLES: Rol[] = ['admin', 'supervisor', 'cajero', 'contador'];
