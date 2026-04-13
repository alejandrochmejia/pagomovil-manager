import { useState, useEffect, useCallback } from 'react';
import { getAllCuentas, createCuenta, updateCuenta, deleteCuenta } from '@/services/cuenta.service';
import { usePermissions } from '@/hooks/usePermissions';
import type { CuentaReceptora } from '@/types/pago';
import { IconUser } from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import Button from '@/components/atoms/Button/Button';
import Modal from '@/components/atoms/Modal/Modal';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import CuentaCard from '@/components/molecules/CuentaCard/CuentaCard';
import CuentaForm from '@/components/molecules/CuentaForm/CuentaForm';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import styles from './CuentasPage.module.css';

export default function CuentasPage() {
  const perms = usePermissions();
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CuentaReceptora | undefined>();
  const [deleting, setDeleting] = useState<CuentaReceptora | undefined>();
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    getAllCuentas().then(setCuentas);
  }, [version]);

  async function handleSubmit(data: Omit<CuentaReceptora, 'id' | 'creado_en'>) {
    if (editing?.id) {
      await updateCuenta(editing.id, data);
    } else {
      await createCuenta(data);
    }
    setShowForm(false);
    setEditing(undefined);
    reload();
  }

  async function handleDelete() {
    if (deleting?.id) {
      await deleteCuenta(deleting.id);
    }
    setDeleting(undefined);
    reload();
  }

  return (
    <div className="page">
      <AppHeader
        title="Cuentas"
        actions={
          perms.canManageCuentas ? (
            <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true); }}>
              + Nueva
            </Button>
          ) : undefined
        }
      />

      {cuentas.length === 0 && (
        <EmptyState
          icon={<IconUser size={48} stroke={1.5} />}
          title="Sin cuentas"
          description="Agrega tus cuentas de pago móvil para mostrarlas a tus clientes"
          action={
            perms.canManageCuentas ? (
              <Button onClick={() => setShowForm(true)}>Agregar cuenta</Button>
            ) : undefined
          }
        />
      )}

      <div className={styles.list}>
        {cuentas.map((cuenta) => (
          <CuentaCard
            key={cuenta.id}
            cuenta={cuenta}
            onEdit={perms.canManageCuentas ? () => { setEditing(cuenta); setShowForm(true); } : undefined}
            onDelete={perms.canManageCuentas ? () => setDeleting(cuenta) : undefined}
          />
        ))}
      </div>

      {perms.canManageCuentas && (
        <>
          <Modal
            isOpen={showForm}
            onClose={() => { setShowForm(false); setEditing(undefined); }}
            title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
          >
            <CuentaForm
              initial={editing}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(undefined); }}
            />
          </Modal>

          <ConfirmDialog
            isOpen={!!deleting}
            onClose={() => setDeleting(undefined)}
            onConfirm={handleDelete}
            title="Eliminar cuenta"
            message={`Seguro que deseas eliminar la cuenta de ${deleting?.nombre}?`}
          />
        </>
      )}
    </div>
  );
}
