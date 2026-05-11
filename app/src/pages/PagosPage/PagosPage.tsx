import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPagosByDateRange, createPago, updatePago, deletePago } from '@/services/pago.service';
import { getDefaultDateRange } from '@/services/stats.service';
import { getBcvRatesByRange } from '@/services/bcv.service';
import { useBcvRate } from '@/hooks/useBcvRate';
import { usePermissions } from '@/hooks/usePermissions';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';
import { IconCoin, IconArrowsExchange } from '@tabler/icons-react';
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

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export default function PagosPage() {
  const perms = usePermissions();
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pago | undefined>();
  const [deleting, setDeleting] = useState<Pago | undefined>();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const [showUsd, setShowUsd] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});

  const { rate: currentRate } = useBcvRate();

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    getBcvRatesByRange(range.from, range.to)
      .then((list) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const r of list) map[r.fecha] = r.promedio;
        setRates(map);
      })
      .catch(() => {
        if (!cancelled) setRates({});
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, version]);

  const ratesByDate = useMemo(() => {
    const map = { ...rates };
    if (currentRate) {
      const today = currentRate.fechaActualizacion.slice(0, 10);
      if (!map[today]) map[today] = currentRate.promedio;
    }
    return map;
  }, [rates, currentRate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    getPagosByDateRange(range, 1, PAGE_SIZE, debouncedSearch)
      .then((res) => {
        setPagos(res.items);
        setTotal(res.total);
        setHasMore(res.has_more);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [range, debouncedSearch, version]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getPagosByDateRange(range, next, PAGE_SIZE, debouncedSearch);
      setPagos((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage(next);
    } finally {
      setLoading(false);
    }
  }

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
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowUsd((v) => !v)}
              aria-label="Cambiar moneda"
            >
              <IconArrowsExchange size={14} stroke={1.5} />
              <span>{showUsd ? 'Bs.' : 'USD'}</span>
            </button>
            {perms.canCreatePago && (
              <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true); }}>
                + Nuevo
              </Button>
            )}
          </div>
        }
      />

      <div className={styles.filters}>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Buscar por banco, cedula, ref..."
        />
        {perms.pagosMaxDays === null && (
          <DateRangePicker value={range} onChange={setRange} />
        )}
      </div>

      {pagos.length === 0 && !loading && (
        <EmptyState
          icon={<IconCoin size={48} stroke={1.5} />}
          title="Sin pagos"
          description={debouncedSearch ? 'No se encontraron resultados' : 'Registra o escanea tu primer pago'}
          action={
            !debouncedSearch && perms.canCreatePago ? (
              <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>Registrar pago</Button>
            ) : undefined
          }
        />
      )}

      <div className={styles.list}>
        {pagos.map((pago) => (
          <PagoCard
            key={pago.id}
            pago={pago}
            showUsd={showUsd}
            rateForDate={ratesByDate[pago.fecha]}
            onClick={perms.canEditPago ? () => { setEditing(pago); setShowForm(true); } : undefined}
          />
        ))}
      </div>

      {pagos.length > 0 && (
        <div className={styles.pagination}>
          <span className={styles.count}>
            Mostrando {pagos.length} de {total}
          </span>
          {hasMore && (
            <Button variant="secondary" onClick={loadMore} disabled={loading}>
              {loading ? 'Cargando...' : 'Cargar más'}
            </Button>
          )}
        </div>
      )}

      {perms.canCreatePago && (
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
      )}

      {perms.canDeletePago && (
        <ConfirmDialog
          isOpen={!!deleting}
          onClose={() => setDeleting(undefined)}
          onConfirm={handleDelete}
          title="Eliminar pago"
          message={`Seguro que deseas eliminar este pago de Bs. ${deleting?.monto}?`}
        />
      )}
    </div>
  );
}
