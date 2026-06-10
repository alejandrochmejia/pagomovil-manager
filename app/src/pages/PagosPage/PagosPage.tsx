import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPagosByDateRange, createPago, updatePago, deletePago, resolverNoCoincidente } from '@/services/pago.service';
import { getDefaultDateRange } from '@/services/stats.service';
import { getBcvRatesByRange } from '@/services/bcv.service';
import { captureReceipt, type CaptureSource } from '@/services/camera.service';
import { scanReceipt } from '@/services/scan.service';
import { useBcvRate } from '@/hooks/useBcvRate';
import { usePermissions } from '@/hooks/usePermissions';
import { useCuentas } from '@/hooks/useCuentas';
import { compareScanToPago, describeMismatch } from '@/utils/compareScan';
import type { Pago } from '@/types/pago';
import type { DateRange, ScanResponse } from '@/types/common';
import {
  ESTADO_LABELS,
  type EstadoPago,
} from '@/utils/constants';
import { IconCoin, IconArrowsExchange, IconX, IconFilter, IconAlertTriangle, IconCamera, IconPhoto } from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import Button from '@/components/atoms/Button/Button';
import Select from '@/components/atoms/Select/Select';
import Modal from '@/components/atoms/Modal/Modal';
import Spinner from '@/components/atoms/Spinner/Spinner';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import ErrorBanner from '@/components/atoms/ErrorBanner/ErrorBanner';
import PagoCard from '@/components/molecules/PagoCard/PagoCard';
import PagoForm from '@/components/molecules/PagoForm/PagoForm';
import PagoDetail from '@/components/molecules/PagoDetail/PagoDetail';
import SearchBar from '@/components/molecules/SearchBar/SearchBar';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import styles from './PagosPage.module.css';

const PAGE_SIZE = 25;

interface ActiveFilters {
  estado?: EstadoPago;
  duplicados: boolean;
  editados: boolean;
  sinComprobante: boolean;
  noCoincidentes: boolean;
  cuentaReceptoraId?: number;
}

function readFiltersFromSearch(sp: URLSearchParams): ActiveFilters {
  const e = sp.get('estado');
  const estados: EstadoPago[] = ['confirmado', 'pendiente', 'rechazado', 'anulado'];
  const cr = sp.get('cuenta_receptora_id');
  return {
    estado: e && (estados as string[]).includes(e) ? (e as EstadoPago) : undefined,
    duplicados: sp.get('duplicados') === 'true',
    editados: sp.get('editados') === 'true',
    sinComprobante: sp.get('sin_comprobante') === 'true',
    noCoincidentes: sp.get('no_coincidentes') === 'true',
    cuentaReceptoraId: cr && /^\d+$/.test(cr) ? Number(cr) : undefined,
  };
}

function activeFilterCount(f: ActiveFilters): number {
  let n = 0;
  if (f.estado) n++;
  if (f.duplicados) n++;
  if (f.editados) n++;
  if (f.sinComprobante) n++;
  if (f.noCoincidentes) n++;
  if (f.cuentaReceptoraId != null) n++;
  return n;
}

function isViewableImage(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/');
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
  const [range, setRange] = useState<DateRange>(() => {
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    return desde && hasta ? { from: desde, to: hasta } : getDefaultDateRange();
  });
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pago | undefined>();
  const [viewing, setViewing] = useState<Pago | undefined>();
  const [deleting, setDeleting] = useState<Pago | undefined>();
  // Comprobante en edición (capturado/subido fuera de PagoForm).
  const [newImageBase64, setNewImageBase64] = useState('');
  const [newScanResult, setNewScanResult] = useState<ScanResponse | null>(null);
  const [scanningComprobante, setScanningComprobante] = useState(false);
  const [comprobanteError, setComprobanteError] = useState('');
  const [mismatchCampos, setMismatchCampos] = useState<string[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const [showUsd, setShowUsd] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  // Borrador local mientras el modal está abierto (se aplica al confirmar).
  const [draftFilters, setDraftFilters] = useState<ActiveFilters>(filters);

  const { rate: currentRate } = useBcvRate();
  const { cuentas } = useCuentas();
  const cuentasById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of cuentas) if (c.id != null) m[c.id] = c.nombre;
    return m;
  }, [cuentas]);

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

  const filterOpts = useMemo(
    () => ({
      estado: filters.estado,
      duplicados: filters.duplicados,
      editados: filters.editados,
      sinComprobante: filters.sinComprobante,
      noCoincidentes: filters.noCoincidentes,
      cuentaReceptoraId: filters.cuentaReceptoraId,
    }),
    [filters.estado, filters.duplicados, filters.editados, filters.sinComprobante, filters.noCoincidentes, filters.cuentaReceptoraId],
  );

  const activeCount = activeFilterCount(filters);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);
    getPagosByDateRange(range, 1, PAGE_SIZE, search, filterOpts)
      .then((res) => {
        if (ignore) return;
        setPagos(res.items);
        setTotal(res.total);
        setHasMore(res.has_more);
        setPage(1);
      })
      .catch(() => { if (!ignore) setError(true); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [range, search, version, filterOpts]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getPagosByDateRange(range, next, PAGE_SIZE, search, filterOpts);
      setPagos((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage(next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function clearFilter(key: 'estado' | 'duplicados' | 'editados' | 'sin_comprobante' | 'no_coincidentes' | 'cuenta_receptora_id') {
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
    if (draftFilters.noCoincidentes) next.set('no_coincidentes', 'true');
    else next.delete('no_coincidentes');
    if (draftFilters.cuentaReceptoraId != null) next.set('cuenta_receptora_id', String(draftFilters.cuentaReceptoraId));
    else next.delete('cuenta_receptora_id');
    setSearchParams(next, { replace: true });
    setShowFiltersModal(false);
  }

  function resetDraftFilters() {
    setDraftFilters({ estado: undefined, duplicados: false, editados: false, sinComprobante: false, noCoincidentes: false, cuentaReceptoraId: undefined });
  }

  async function handleChangeEstado(pago: Pago, nuevo: EstadoPago) {
    if (!pago.id) return;
    try {
      await updatePago(pago.id, { estado: nuevo });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cambiar el estado del pago');
    }
  }

  const handleSearch = useCallback((val: string) => setSearch(val), []);

  function resetComprobanteState() {
    setNewImageBase64('');
    setNewScanResult(null);
    setScanningComprobante(false);
    setComprobanteError('');
    setMismatchCampos([]);
  }

  function closeEditModal() {
    setShowForm(false);
    setEditing(undefined);
    resetComprobanteState();
  }

  // Captura/sube un comprobante durante la edición y lo re-analiza con IA.
  async function handleCaptureComprobante(source: CaptureSource) {
    setComprobanteError('');
    let base64: string;
    try {
      base64 = await captureReceipt(source);
    } catch {
      return; // captura cancelada por el usuario
    }
    setNewImageBase64(base64);
    setNewScanResult(null);
    setMismatchCampos([]);
    setScanningComprobante(true);
    try {
      const result = await scanReceipt(base64);
      setNewScanResult(result);
      if (editing) {
        const { campos } = compareScanToPago(result, {
          monto: editing.monto,
          referencia: editing.referencia,
          cedula: editing.cedula,
        });
        setMismatchCampos(campos);
      }
    } catch {
      setComprobanteError('No se pudo analizar el comprobante. Puedes guardarlo sin análisis o reintentar.');
    } finally {
      setScanningComprobante(false);
    }
  }

  async function handleSubmit(data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) {
    if (editing?.id) {
      const extra: Partial<Pago> = {};
      if (newImageBase64) {
        extra.imagen_uri = `data:image/jpeg;base64,${newImageBase64}`;
        if (newScanResult?.scan_log_id) extra.scan_log_id = newScanResult.scan_log_id;
      }
      await updatePago(editing.id, { ...data, ...extra });
    } else {
      await createPago(data);
    }
    closeEditModal();
    reload();
  }

  async function handleResolve() {
    if (!viewing?.id) return;
    try {
      const updated = await resolverNoCoincidente(viewing.id);
      setViewing(updated);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo resolver el pago');
    }
  }

  async function handleDelete() {
    if (!deleting?.id) {
      setDeleting(undefined);
      return;
    }
    try {
      await deletePago(deleting.id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo eliminar el pago');
    } finally {
      setDeleting(undefined);
    }
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

      <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />

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
            {filters.cuentaReceptoraId != null && (
              <button
                type="button"
                className={styles.chip}
                onClick={() => clearFilter('cuenta_receptora_id')}
                aria-label="Quitar filtro de cuenta receptora"
              >
                Cuenta: {cuentasById[filters.cuentaReceptoraId] ?? 'cuenta'} <IconX size={12} stroke={2} />
              </button>
            )}
            {filters.noCoincidentes && (
              <button
                type="button"
                className={styles.chip}
                onClick={() => clearFilter('no_coincidentes')}
                aria-label="Quitar filtro no coincidentes"
              >
                No coincidentes <IconX size={12} stroke={2} />
              </button>
            )}
            <button type="button" className={styles.chipClear} onClick={clearAllFilters}>
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {error && !loading && pagos.length === 0 ? (
        <EmptyState
          icon={<IconAlertTriangle size={48} stroke={1.5} />}
          title="No se pudieron cargar los pagos"
          description="Revisa tu conexión e intenta de nuevo."
          action={<Button onClick={reload}>Reintentar</Button>}
        />
      ) : pagos.length === 0 && !loading ? (
        <EmptyState
          icon={<IconCoin size={48} stroke={1.5} />}
          title="Sin pagos"
          description={search ? 'No se encontraron resultados' : 'Registra o escanea tu primer pago'}
          action={
            !search && perms.canCreatePago ? (
              <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>Registrar pago</Button>
            ) : undefined
          }
        />
      ) : null}

      <div className={styles.list}>
        {pagos.map((pago) => (
          <PagoCard
            key={pago.id}
            pago={pago}
            cuentaNombre={pago.cuenta_receptora_id != null ? cuentasById[pago.cuenta_receptora_id] : undefined}
            showUsd={showUsd}
            rateForDate={ratesByDate[pago.fecha]}
            onClick={() => setViewing(pago)}
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
          onClose={closeEditModal}
          title={editing ? 'Editar pago' : 'Nuevo pago'}
          closeOnBackdrop={false}
        >
          {editing && perms.canScan && (
            <div className={styles.comprobanteEdit}>
              <span className={styles.comprobanteEditTitle}>Comprobante</span>
              {newImageBase64 ? (
                <span className={styles.comprobanteOk}>Nuevo comprobante listo para guardar</span>
              ) : (
                <span className={styles.comprobanteHint}>
                  {isViewableImage(editing.imagen_uri) ? 'Hay un comprobante adjunto' : 'Sin comprobante adjunto'}
                </span>
              )}
              <div className={styles.comprobanteEditActions}>
                <Button size="sm" variant="secondary" type="button" disabled={scanningComprobante}
                  onClick={() => handleCaptureComprobante('camera')}>
                  <span className={styles.btnIcon}><IconCamera size={14} stroke={1.8} /> Tomar foto</span>
                </Button>
                <Button size="sm" variant="secondary" type="button" disabled={scanningComprobante}
                  onClick={() => handleCaptureComprobante('gallery')}>
                  <span className={styles.btnIcon}><IconPhoto size={14} stroke={1.8} /> Galería</span>
                </Button>
              </div>
              {scanningComprobante && (
                <div className={styles.comprobanteScanning}>
                  <Spinner size="sm" /><span>Analizando comprobante...</span>
                </div>
              )}
              {comprobanteError && <span className={styles.comprobanteError}>{comprobanteError}</span>}
              {mismatchCampos.length > 0 && (
                <div className={styles.comprobanteAlert}>
                  <IconAlertTriangle size={16} stroke={1.8} />
                  <span>
                    El comprobante no coincide en: {describeMismatch(mismatchCampos)}. Puedes guardar
                    igual; quedará marcado para revisión.
                  </span>
                </div>
              )}
            </div>
          )}
          <PagoForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={closeEditModal}
          />
        </Modal>
      )}

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(undefined)}
        title="Detalle del pago"
      >
        {viewing && (
          <PagoDetail
            pago={viewing}
            canEdit={perms.canEditPago}
            canResolve={perms.canResolverNoCoincidente}
            rateForDate={ratesByDate[viewing.fecha]}
            onResolve={handleResolve}
            onEdit={() => {
              const p = viewing;
              setViewing(undefined);
              setEditing(p);
              setShowForm(true);
            }}
          />
        )}
      </Modal>

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
          {cuentas.length > 0 && (
            <Select
              label="Cuenta receptora"
              options={[
                { value: '', label: 'Todas' },
                ...cuentas.map((c) => ({ value: String(c.id), label: `${c.nombre} - ${c.banco}` })),
              ]}
              value={draftFilters.cuentaReceptoraId != null ? String(draftFilters.cuentaReceptoraId) : ''}
              onChange={(e) =>
                setDraftFilters((d) => ({
                  ...d,
                  cuentaReceptoraId: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          )}
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
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draftFilters.noCoincidentes}
              onChange={(e) =>
                setDraftFilters((d) => ({ ...d, noCoincidentes: e.target.checked }))
              }
            />
            <div>
              <span className={styles.toggleLabel}>Solo no coincidentes</span>
              <span className={styles.toggleDesc}>Comprobante no coincide con los datos del pago</span>
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
