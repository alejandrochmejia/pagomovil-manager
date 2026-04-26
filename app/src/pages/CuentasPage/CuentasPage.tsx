import { useState, useEffect, useCallback } from 'react';
import {
  createCuenta,
  updateCuenta,
  deleteCuenta,
  getCuentasPaginated,
} from '@/services/cuenta.service';
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
import SearchBar from '@/components/molecules/SearchBar/SearchBar';
import styles from './CuentasPage.module.css';

const PAGE_SIZE = 25;

export default function CuentasPage() {
  const perms = usePermissions();
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CuentaReceptora | undefined>();
  const [deleting, setDeleting] = useState<CuentaReceptora | undefined>();
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    setLoading(true);
    getCuentasPaginated(1, PAGE_SIZE, search)
      .then((res) => {
        setCuentas(res.items);
        setTotal(res.total);
        setHasMore(res.has_more);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [search, version]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getCuentasPaginated(next, PAGE_SIZE, search);
      setCuentas((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage(next);
    } finally {
      setLoading(false);
    }
  }

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

      <div className={styles.filters}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, banco, cédula..."
        />
      </div>

      {cuentas.length === 0 && !loading && (
        <EmptyState
          icon={<IconUser size={48} stroke={1.5} />}
          title="Sin cuentas"
          description={
            search
              ? 'No se encontraron resultados'
              : 'Agrega tus cuentas de pago móvil para mostrarlas a tus clientes'
          }
          action={
            !search && perms.canManageCuentas ? (
              <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>
                Agregar cuenta
              </Button>
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

      {cuentas.length > 0 && (
        <div className={styles.pagination}>
          <span className={styles.count}>
            Mostrando {cuentas.length} de {total}
          </span>
          {hasMore && (
            <Button variant="secondary" onClick={loadMore} disabled={loading}>
              {loading ? 'Cargando...' : 'Cargar más'}
            </Button>
          )}
        </div>
      )}

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
