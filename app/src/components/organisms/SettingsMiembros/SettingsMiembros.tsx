import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { IconUserPlus, IconTrash } from '@tabler/icons-react';
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
  rol: string;
}

interface Invitacion {
  id: number;
  email: string;
  rol: string;
  estado: string;
}

const ROL_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'miembro', label: 'Miembro' },
  { value: 'visor', label: 'Visor' },
];

export default function SettingsMiembros() {
  const { empresaId, empresas } = useAuth();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRol, setInvRol] = useState('miembro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const isAdmin = currentEmpresa?.rol === 'admin';

  useEffect(() => {
    if (!empresaId) return;
    api<Miembro[]>(`/empresas/${empresaId}/miembros`).then(setMiembros);
    if (isAdmin) {
      api<Invitacion[]>(`/empresas/${empresaId}/invitaciones`).then(setInvitaciones);
    }
  }, [empresaId, isAdmin]);

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
      // Refrescar invitaciones
      const inv = await api<Invitacion[]>(`/empresas/${empresaId}/invitaciones`);
      setInvitaciones(inv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar');
    } finally {
      setLoading(false);
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
          {isAdmin && (
            <Button size="sm" onClick={() => setShowInvite(true)}>
              <IconUserPlus size={14} stroke={2} /> Invitar
            </Button>
          )}
        </div>

        <div className={styles.list}>
          {miembros.map((m) => (
            <div key={m.id} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.name}>{m.nombre || m.email}</span>
                <span className={styles.email}>{m.email}</span>
              </div>
              <Badge variant={m.rol === 'admin' ? 'success' : 'info'}>{m.rol}</Badge>
              {isAdmin && m.rol !== 'admin' && (
                <button className={styles.removeBtn} onClick={() => handleRemoveMember(m.id)} aria-label="Eliminar">
                  <IconTrash size={16} stroke={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {isAdmin && invitaciones.length > 0 && (
        <Card className={styles.section}>
          <h3 className={styles.sectionTitle}>Invitaciones pendientes</h3>
          <div className={styles.list}>
            {invitaciones.map((inv) => (
              <div key={inv.id} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.name}>{inv.email}</span>
                  <Badge variant="warning">{inv.rol}</Badge>
                </div>
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
            options={ROL_OPTIONS}
            value={invRol}
            onChange={(e) => setInvRol(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar invitacion'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
