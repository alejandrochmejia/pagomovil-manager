import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { createCuenta, updateCuenta, deleteCuenta } from '@/services/cuenta.service';
import type { CuentaReceptora } from '@/types/pago';
import Button from '@/components/atoms/Button/Button';
import Modal from '@/components/atoms/Modal/Modal';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import CuentaCard from '@/components/molecules/CuentaCard/CuentaCard';
import CuentaForm from '@/components/molecules/CuentaForm/CuentaForm';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import styles from './CuentasPage.module.css';

export default function CuentasPage() {
  const cuentas = useLiveQuery(() => db.cuentas.toArray());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CuentaReceptora | undefined>();
  const [deleting, setDeleting] = useState<CuentaReceptora | undefined>();

  async function handleSubmit(data: Omit<CuentaReceptora, 'id' | 'creadoEn'>) {
    if (editing?.id) {
      await updateCuenta(editing.id, data);
    } else {
      await createCuenta(data);
    }
    setShowForm(false);
    setEditing(undefined);
  }

  async function handleDelete() {
    if (deleting?.id) {
      await deleteCuenta(deleting.id);
    }
    setDeleting(undefined);
  }

  return (
    <div className="page">
      <div className={styles.header}>
        <h1>Cuentas Receptoras</h1>
        <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true); }}>
          + Nueva
        </Button>
      </div>

      {cuentas?.length === 0 && (
        <EmptyState
          icon="👤"
          title="Sin cuentas"
          description="Agrega tus cuentas de pago móvil para mostrarlas a tus clientes"
          action={
            <Button onClick={() => setShowForm(true)}>Agregar cuenta</Button>
          }
        />
      )}

      <div className={styles.list}>
        {cuentas?.map((cuenta) => (
          <CuentaCard
            key={cuenta.id}
            cuenta={cuenta}
            onEdit={() => { setEditing(cuenta); setShowForm(true); }}
            onDelete={() => setDeleting(cuenta)}
          />
        ))}
      </div>

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
        message={`¿Seguro que deseas eliminar la cuenta de ${deleting?.nombre}?`}
      />
    </div>
  );
}
