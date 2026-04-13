import { useState, useEffect, useMemo, useCallback } from 'react';
import { getPagosByDateRange, createPago, updatePago, deletePago } from '@/services/pago.service';
import { getDefaultDateRange } from '@/services/stats.service';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';
import { IconCoin } from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import Button from '@/components/atoms/Button/Button';
import Modal from '@/components/atoms/Modal/Modal';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import PagoCard from '@/components/molecules/PagoCard/PagoCard';
import PagoForm from '@/components/molecules/PagoForm/PagoForm';
import SearchBar from '@/components/molecules/SearchBar/SearchBar';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import styles from './PagosPage.module.css';

export default function PagosPage() {
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pago | undefined>();
  const [deleting, setDeleting] = useState<Pago | undefined>();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    getPagosByDateRange(range).then(setPagos);
  }, [range, version]);

  const filtered = useMemo(() => {
    if (!search) return pagos;
    const q = search.toLowerCase();
    return pagos.filter(
      (p) =>
        p.banco.toLowerCase().includes(q) ||
        p.cedula.toLowerCase().includes(q) ||
        p.referencia.includes(q) ||
        p.monto.toString().includes(q),
    );
  }, [pagos, search]);

  const handleSearch = useCallback((val: string) => setSearch(val), []);

  async function handleSubmit(data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) {
    if (editing?.id) {
      await updatePago(editing.id, data);
    } else {
      await createPago(data);
    }
    setShowForm(false);
    setEditing(undefined);
    reload();
  }

  async function handleDelete() {
    if (deleting?.id) {
      await deletePago(deleting.id);
    }
    setDeleting(undefined);
    reload();
  }

  return (
    <div className="page">
      <AppHeader
        title="Pagos"
        actions={
          <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true); }}>
            + Nuevo
          </Button>
        }
      />

      <div className={styles.filters}>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Buscar por banco, cedula, ref..."
        />
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<IconCoin size={48} stroke={1.5} />}
          title="Sin pagos"
          description={search ? 'No se encontraron resultados' : 'Registra o escanea tu primer pago'}
          action={
            !search ? (
              <Button onClick={() => setShowForm(true)}>Registrar pago</Button>
            ) : undefined
          }
        />
      )}

      <div className={styles.list}>
        {filtered.map((pago) => (
          <PagoCard
            key={pago.id}
            pago={pago}
            onClick={() => { setEditing(pago); setShowForm(true); }}
          />
        ))}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined); }}
        title={editing ? 'Editar pago' : 'Nuevo pago'}
      >
        <PagoForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={handleDelete}
        title="Eliminar pago"
        message={`Seguro que deseas eliminar este pago de Bs. ${deleting?.monto}?`}
      />
    </div>
  );
}
