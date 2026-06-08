import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPagosByDateRange, createPago, updatePago, deletePago } from '@/services/pago.service';
import { getDefaultDateRange } from '@/services/stats.service';
import { getBcvRatesByRange } from '@/services/bcv.service';
import { useBcvRate } from '@/hooks/useBcvRate';
import { usePermissions } from '@/hooks/usePermissions';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';
import {
  ESTADO_LABELS,
  type EstadoPago,
} from '@/utils/constants';
import { IconCoin, IconArrowsExchange, IconX, IconFilter } from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import Button from '@/components/atoms/Button/Button';
import Select from '@/components/atoms/Select/Select';
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

interface ActiveFilters {
  estado?: EstadoPago;
  duplicados: boolean;
  editados: boolean;
  sinComprobante: boolean;
}

function readFiltersFromSearch(sp: URLSearchParams): ActiveFilters {
  const e = sp.get('estado');
  const estados: EstadoPago[] = ['confirmado', 'pendiente', 'rechazado', 'anulado'];
  return {
    estado: e && (estados as string[]).includes(e) ? (e as EstadoPago) : undefined,
    duplicados: sp.get('duplicados') === 'true',
    editados: sp.get('editados') === 'true',
    sinComprobante: sp.get('sin_comprobante') === 'true',
  };
}

function activeFilterCount(f: ActiveFilters): number {
  let n = 0;
  if (f.estado) n++;
  if (f.duplicados) n++;
  if (f.editados) n++;
  if (f.sinComprobante) n++;
  return n;
}

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'confirmado', label: 'Aprobado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'anulado', label: 'Anulado' },
];

export default function PagosPage() {
  const perms = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFiltersFromSearch(searchParams);
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
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  // Borrador local mientras el modal está abierto (se aplica al confirmar).
  const [draftFilters, setDraftFilters] = useState<ActiveFilters>(filters);

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

  const filterOpts = useMemo(
    () => ({
      estado: filters.estado,
      duplicados: filters.duplicados,
      editados: filters.editados,
      sinComprobante: filters.sinComprobante,
    }),
    [filters.estado, filters.duplicados, filters.editados, filters.sinComprobante],
  );

  const activeCount = activeFilterCount(filters);

  useEffect(() => {
    setLoading(true);
    getPagosByDateRange(range, 1, PAGE_SIZE, debouncedSearch, filterOpts)
      .then((res) => {
        setPagos(res.items);
        setTotal(res.total);
        setHasMore(res.has_more);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [range, debouncedSearch, version, filterOpts]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getPagosByDateRange(range, next, PAGE_SIZE, debouncedSearch, filterOpts);
      setPagos((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage(next);
    } finally {
      setLoading(false);
    }
  }

  function clearFilter(key: 'estado' | 'duplicados' | 'editados' | 'sin_comprobante') {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearAllFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function openFiltersModal() {
    setDraftFilters(filters);
    setShowFiltersModal(true);
  }

  function applyDraftFilters() {
    const next = new URLSearchParams(searchParams);
    if (draftFilters.estado) next.set('estado', draftFilters.estado);
    else next.delete('estado');
    if (draftFilters.duplicados) next.set('duplicados', 'true');
    else next.delete('duplicados');
    if (draftFilters.editados) next.set('editados', 'true');
    else next.delete('editados');
    if (draftFilters.sinComprobante) next.set('sin_comprobante', 'true');
    else next.delete('sin_comprobante');
    setSearchParams(next, { replace: true });
    setShowFiltersModal(false);
  }

  function resetDraftFilters() {
    setDraftFilters({ duplicados: false, editados: false, sinComprobante: false });
  }

  async function handleChangeEstado(pago: Pago, nuevo: EstadoPago) {
    if (!pago.id) return;
    await updatePago(pago.id, { estado: nuevo });
    reload();
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
        <div className={styles.searchRow}>
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Buscar por banco, cedula, ref..."
          />
          <button
            type="button"
            className={`${styles.filterBtn} ${activeCount > 0 ? styles.filterBtnActive : ''}`}
            onClick={openFiltersModal}
            aria-label="Abrir filtros"
          >
            <IconFilter size={16} stroke={1.8} />
            <span>Filtros</span>
            {activeCount > 0 && <span className={styles.filterBadge}>{activeCount}</span>}
          </button>
        </div>
        {perms.pagosMaxDays === null && (
          <DateRangePicker value={range} onChange={setRange} />
        )}
        {activeCount > 0 && (
          <div className={styles.activeFilters}>
            {filters.estado && (
              <button
                type="button"
                className={styles.chip}
                onClick={() => clearFilter('estado')}
                aria-label="Quitar filtro de estado"
              >
                Estado: {ESTADO_LABELS[filters.estado]} <IconX size={12} stroke={2} />
              </button>
            )}
            {filters.duplicados && (
              <button
                type="button"
                className={styles.chip}
                onClick={() => clearFilter('duplicados')}
                aria-label="Quitar filtro de duplicados"
              >
                Duplicados <IconX size={12} stroke={2} />
              </button>
            )}
            {filters.editados && (
              <button
                type="button"
                className={styles.chip}
                onClick={() => clearFilter('editados')}
                aria-label="Quitar filtro de editados"
              >
                Editados <IconX size={12} stroke={2} />
              </button>
            )}
            {filters.sinComprobante && (
              <button
                type="button"
                className={styles.chip}
                onClick={() => clearFilter('sin_comprobante')}
                aria-label="Quitar filtro sin comprobante"
              >
                Sin comprobante <IconX size={12} stroke={2} />
              </button>
            )}
            <button type="button" className={styles.chipClear} onClick={clearAllFilters}>
              Limpiar todo
            </button>
          </div>
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
            onDelete={perms.canDeletePago ? () => setDeleting(pago) : undefined}
            onChangeEstado={perms.canEditPago ? (nuevo) => handleChangeEstado(pago, nuevo) : undefined}
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

      <Modal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Filtrar pagos"
      >
        <div className={styles.filtersForm}>
          <Select
            label="Estado"
            options={ESTADO_OPTIONS}
            value={draftFilters.estado ?? ''}
            onChange={(e) =>
              setDraftFilters((d) => ({
                ...d,
                estado: e.target.value ? (e.target.value as EstadoPago) : undefined,
              }))
            }
          />
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draftFilters.duplicados}
              onChange={(e) => setDraftFilters((d) => ({ ...d, duplicados: e.target.checked }))}
            />
            <div>
              <span className={styles.toggleLabel}>Solo duplicados</span>
              <span className={styles.toggleDesc}>Pagos con la misma referencia + banco</span>
            </div>
          </label>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draftFilters.editados}
              onChange={(e) => setDraftFilters((d) => ({ ...d, editados: e.target.checked }))}
            />
            <div>
              <span className={styles.toggleLabel}>Solo editados</span>
              <span className={styles.toggleDesc}>Pagos modificados después de su creación</span>
            </div>
          </label>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draftFilters.sinComprobante}
              onChange={(e) =>
                setDraftFilters((d) => ({ ...d, sinComprobante: e.target.checked }))
              }
            />
            <div>
              <span className={styles.toggleLabel}>Solo sin comprobante</span>
              <span className={styles.toggleDesc}>Pagos sin imagen del comprobante</span>
            </div>
          </label>

          <div className={styles.filtersActions}>
            <Button variant="secondary" type="button" onClick={resetDraftFilters}>
              Limpiar
            </Button>
            <Button type="button" onClick={applyDraftFilters}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
