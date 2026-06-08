import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPagosByDateRange } from '@/services/pago.service';
import { getDefaultDateRange } from '@/services/stats.service';
import { usePermissions } from '@/hooks/usePermissions';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';
import { IconCoin, IconArrowLeft, IconAlertTriangle } from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import Button from '@/components/atoms/Button/Button';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import PagoCard from '@/components/molecules/PagoCard/PagoCard';
import SearchBar from '@/components/molecules/SearchBar/SearchBar';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import styles from './PagosPage.module.css';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export default function PagosSinComprobantePage() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getPagosByDateRange(range, 1, PAGE_SIZE, debouncedSearch, { sinComprobante: true })
      .then((res) => {
        setPagos(res.items);
        setTotal(res.total);
        setHasMore(res.has_more);
        setPage(1);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [range, debouncedSearch, version]);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getPagosByDateRange(range, next, PAGE_SIZE, debouncedSearch, {
        sinComprobante: true,
      });
      setPagos((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage(next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = useCallback((val: string) => setSearch(val), []);

  return (
    <div className="page">
      <AppHeader
        title="Sin comprobante"
        actions={
          <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
            <span className={styles.backBtn}>
              <IconArrowLeft size={14} stroke={1.5} />
              Volver
            </span>
          </Button>
        }
      />

      <div className={styles.filters}>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Buscar por banco, cédula, ref..."
        />
        {perms.pagosMaxDays === null && (
          <DateRangePicker value={range} onChange={setRange} />
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
          title="Sin resultados"
          description={
            debouncedSearch
              ? 'No se encontraron pagos sin comprobante con ese filtro'
              : 'Todos los pagos del rango tienen comprobante'
          }
        />
      ) : null}

      <div className={styles.list}>
        {pagos.map((pago) => (
          <PagoCard key={pago.id} pago={pago} />
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
    </div>
  );
}
