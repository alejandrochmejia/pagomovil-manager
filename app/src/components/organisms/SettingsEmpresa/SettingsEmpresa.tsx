import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { IconBuilding, IconCheck, IconPlus } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Modal from '@/components/atoms/Modal/Modal';
import styles from './SettingsEmpresa.module.css';

const MAX_EMPRESAS = 3;

export default function SettingsEmpresa() {
  const { empresas, empresaId, switchEmpresa, refresh } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [nombre, setNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const canCreate = empresas.filter((e) => e.rol === 'admin').length < MAX_EMPRESAS;

  async function handleCreate(ev: FormEvent) {
    ev.preventDefault();
    if (!nombre.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await api<{ id: number }>('/empresas', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      switchEmpresa(created.id);
      await refresh();
      setShowCreate(false);
      setNombre('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear empresa');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.container}>
      <Card className={styles.section}>
        <div className={styles.header}>
          <h3 className={styles.sectionTitle}>Mis empresas</h3>
          {canCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <IconPlus size={14} stroke={2} /> Nueva
            </Button>
          )}
        </div>

        {empresas.length === 0 ? (
          <p className={styles.empty}>No perteneces a ninguna empresa. Crea una para empezar.</p>
        ) : (
          <div className={styles.list}>
            {empresas.map((emp) => (
              <button
                key={emp.id}
                className={`${styles.empresaCard} ${emp.id === empresaId ? styles.active : ''}`}
                onClick={() => switchEmpresa(emp.id)}
              >
                <IconBuilding size={20} stroke={1.5} />
                <div className={styles.empresaInfo}>
                  <span className={styles.empresaName}>{emp.nombre}</span>
                  <Badge variant={emp.rol === 'admin' ? 'success' : 'info'}>{emp.rol}</Badge>
                </div>
                {emp.id === empresaId && <IconCheck size={18} stroke={2} className={styles.check} />}
              </button>
            ))}
          </div>
        )}

        <p className={styles.hint}>
          {empresas.filter((e) => e.rol === 'admin').length} / {MAX_EMPRESAS} empresas creadas
        </p>
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva empresa">
        <form className={styles.form} onSubmit={handleCreate}>
          {error && <p className={styles.error}>{error}</p>}
          <Input
            label="Nombre de la empresa"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Mi negocio"
          />
          <Button type="submit" disabled={creating}>
            {creating ? 'Creando...' : 'Crear empresa'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
