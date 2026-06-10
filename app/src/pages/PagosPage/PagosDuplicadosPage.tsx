import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDuplicados, deletePago, type DuplicadoGroup } from '@/services/pago.service';
import { usePermissions } from '@/hooks/usePermissions';
import type { Pago } from '@/types/pago';
import { IconArrowLeft, IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import Spinner from '@/components/atoms/Spinner/Spinner';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import ErrorBanner from '@/components/atoms/ErrorBanner/ErrorBanner';
import PagoCard from '@/components/molecules/PagoCard/PagoCard';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import styles from './PagosDuplicadosPage.module.css';

export default function PagosDuplicadosPage() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const [groups, setGroups] = useState<DuplicadoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState<Pago | undefined>();
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getDuplicados();
      setGroups(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleting?.id) {
      setDeleting(undefined);
      return;
    }
    try {
      await deletePago(deleting.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo eliminar el pago');
    } finally {
      setDeleting(undefined);
    }
  }

  const totalPagos = groups.reduce((acc, g) => acc + g.cantidad, 0);

  return (
    <div className="page">
      <AppHeader
        title="Pagos duplicados"
        actions={
          <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
            <span className={styles.backBtn}>
              <IconArrowLeft size={14} stroke={1.5} />
              Volver
            </span>
          </Button>
        }
      />

      <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />

      {loading && (
        <div className={styles.center}>
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={<IconAlertTriangle size={48} stroke={1.5} />}
          title="No se pudieron cargar los duplicados"
          description="Revisa tu conexión e intenta de nuevo."
          action={<Button onClick={load}>Reintentar</Button>}
        />
      )}

      {!loading && !error && groups.length === 0 && (
        <EmptyState
          icon={<IconShieldCheck size={48} stroke={1.5} />}
          title="Sin duplicados"
          description="No hay pagos con referencia repetida en esta empresa"
        />
      )}

      {!loading && groups.length > 0 && (
        <>
          <p className={styles.summary}>
            <IconAlertTriangle size={16} stroke={1.8} />
            <span>
              <strong>{groups.length}</strong> grupos con referencias repetidas
              {' · '}<strong>{totalPagos}</strong> pagos involucrados
            </span>
          </p>

          <div className={styles.groupList}>
            {groups.map((g) => (
              <Card key={`${g.banco}__${g.referencia}`} className={styles.group}>
                <div className={styles.groupHeader}>
                  <div>
                    <span className={styles.banco}>{g.banco}</span>
                    <span className={styles.sep}>·</span>
                    <span className={styles.ref}>Ref {g.referencia}</span>
                  </div>
                  <span className={styles.count}>{g.cantidad} pagos</span>
                </div>
                <div className={styles.pagosList}>
                  {g.pagos.map((pago) => (
                    <PagoCard
                      key={pago.id}
                      pago={pago}
                      onDelete={perms.canDeletePago ? () => setDeleting(pago) : undefined}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {perms.canDeletePago && (
        <ConfirmDialog
          isOpen={!!deleting}
          onClose={() => setDeleting(undefined)}
          onConfirm={handleDelete}
          title="Eliminar pago"
          message={`Seguro que deseas eliminar este pago de Bs. ${deleting?.monto}?`}
          confirmLabel="Eliminar"
          confirmVariant="danger"
        />
      )}
    </div>
  );
}
