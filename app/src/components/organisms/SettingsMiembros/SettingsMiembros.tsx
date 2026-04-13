import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/services/api';
import { ROL_LABELS, ROL_BADGE_VARIANT, ASSIGNABLE_ROLES, type Rol } from '@/types/roles';
import { IconUserPlus, IconTrash, IconLock } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Modal from '@/components/atoms/Modal/Modal';
import styles from './SettingsMiembros.module.css';

interface Miembro {
  id: number;
  user_id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

interface Invitacion {
  id: number;
  email: string;
  rol: Rol;
  estado: string;
}

export default function SettingsMiembros() {
  const { empresaId } = useAuth();
  const perms = usePermissions();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRol, setInvRol] = useState('cajero');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rolOptions = useMemo(
    () => ASSIGNABLE_ROLES
      .filter((r) => perms.canChangeRoleTo(r))
      .map((r) => ({ value: r, label: ROL_LABELS[r] })),
    [perms],
  );

  useEffect(() => {
    if (!empresaId) return;
    api<Miembro[]>(`/empresas/${empresaId}/miembros`).then(setMiembros);
    api<Invitacion[]>(`/empresas/${empresaId}/invitaciones`).then(setInvitaciones).catch(() => {});
  }, [empresaId]);

  async function handleInvite(ev: FormEvent) {
    ev.preventDefault();
    if (!invEmail.trim() || !empresaId) return;
    setLoading(true);
    setError('');
    try {
      await api(`/empresas/${empresaId}/invitar`, {
        method: 'POST',
        body: JSON.stringify({ email: invEmail.trim(), rol: invRol }),
      });
      setShowInvite(false);
      setInvEmail('');
      setInvRol('cajero');
      const inv = await api<Invitacion[]>(`/empresas/${empresaId}/invitaciones`);
      setInvitaciones(inv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeRole(miembroId: number, newRol: string) {
    if (!empresaId) return;
    try {
      await api(`/empresas/${empresaId}/miembros/${miembroId}/rol`, {
        method: 'PUT',
        body: JSON.stringify({ rol: newRol }),
      });
      setMiembros((prev) =>
        prev.map((m) => (m.id === miembroId ? { ...m, rol: newRol as Rol } : m)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar rol');
    }
  }

  async function handleCancelInvite(invId: number) {
    if (!empresaId) return;
    await api(`/empresas/${empresaId}/invitaciones/${invId}`, { method: 'DELETE' });
    setInvitaciones((prev) => prev.filter((i) => i.id !== invId));
  }

  async function handleRemoveMember(miembroId: number) {
    if (!empresaId) return;
    await api(`/empresas/${empresaId}/miembros/${miembroId}`, { method: 'DELETE' });
    setMiembros((prev) => prev.filter((m) => m.id !== miembroId));
  }

  if (!empresaId) {
    return <p className={styles.empty}>Selecciona una empresa primero</p>;
  }

  return (
    <div className={styles.container}>
      <Card className={styles.section}>
        <div className={styles.header}>
          <h3 className={styles.sectionTitle}>Miembros</h3>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <IconUserPlus size={14} stroke={2} /> Invitar
          </Button>
        </div>

        <div className={styles.list}>
          {miembros.map((m) => (
            <div key={m.id} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.name}>{m.nombre || m.email}</span>
                <span className={styles.email}>{m.email}</span>
              </div>

              {m.rol === 'dueno' ? (
                <div className={styles.lockedBadge}>
                  <IconLock size={12} stroke={2} />
                  <Badge variant={ROL_BADGE_VARIANT[m.rol]}>{ROL_LABELS[m.rol]}</Badge>
                </div>
              ) : perms.canChangeRoleTo(m.rol) ? (
                <select
                  className={styles.rolSelect}
                  value={m.rol}
                  onChange={(e) => handleChangeRole(m.id, e.target.value)}
                >
                  {ASSIGNABLE_ROLES.filter((r) => perms.canChangeRoleTo(r)).map((r) => (
                    <option key={r} value={r}>{ROL_LABELS[r]}</option>
                  ))}
                </select>
              ) : (
                <Badge variant={ROL_BADGE_VARIANT[m.rol]}>{ROL_LABELS[m.rol]}</Badge>
              )}

              {m.rol !== 'dueno' && perms.canChangeRoleTo(m.rol) && (
                <button className={styles.removeBtn} onClick={() => handleRemoveMember(m.id)} aria-label="Eliminar">
                  <IconTrash size={16} stroke={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {invitaciones.length > 0 && (
        <Card className={styles.section}>
          <h3 className={styles.sectionTitle}>Invitaciones pendientes</h3>
          <div className={styles.list}>
            {invitaciones.map((inv) => (
              <div key={inv.id} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.name}>{inv.email}</span>
                </div>
                <Badge variant={ROL_BADGE_VARIANT[inv.rol]}>{ROL_LABELS[inv.rol]}</Badge>
                <button className={styles.removeBtn} onClick={() => handleCancelInvite(inv.id)} aria-label="Cancelar">
                  <IconTrash size={16} stroke={1.5} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invitar miembro">
        <form className={styles.form} onSubmit={handleInvite}>
          {error && <p className={styles.error}>{error}</p>}
          <Input
            label="Email"
            type="email"
            value={invEmail}
            onChange={(e) => setInvEmail(e.target.value)}
            placeholder="usuario@email.com"
          />
          <Select
            label="Rol"
            options={rolOptions}
            value={invRol}
            onChange={(e) => setInvRol(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar invitación'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
