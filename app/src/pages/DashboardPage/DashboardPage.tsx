import { useState, useCallback, useMemo } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useBcvRate } from '@/hooks/useBcvRate';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrencyBs, formatCurrencyUsd, formatCurrency } from '@/utils/format';
import type { KpiSection } from '@/types/common';
import {
  IconHome,
  IconCurrencyDollar,
  IconWallet,
  IconSettings,
  IconArrowsExchange,
  IconAlertTriangle,
} from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import SectionTabs from '@/components/atoms/SectionTabs/SectionTabs';
import Spinner from '@/components/atoms/Spinner/Spinner';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import Button from '@/components/atoms/Button/Button';
import DashboardResumen from '@/components/organisms/DashboardResumen/DashboardResumen';
import DashboardFinanzas from '@/components/organisms/DashboardFinanzas/DashboardFinanzas';
import DashboardCuentas from '@/components/organisms/DashboardCuentas/DashboardCuentas';
import DashboardOperaciones from '@/components/organisms/DashboardOperaciones/DashboardOperaciones';
import styles from './DashboardPage.module.css';

const ALL_TABS: { key: KpiSection; label: string; icon: React.ReactNode; needs: 'any' | 'full' | 'basic' }[] = [
  { key: 'resumen', label: 'Resumen', icon: <IconHome size={16} stroke={1.5} />, needs: 'any' },
  { key: 'finanzas', label: 'Finanzas', icon: <IconCurrencyDollar size={16} stroke={1.5} />, needs: 'full' },
  { key: 'cuentas', label: 'Cuentas', icon: <IconWallet size={16} stroke={1.5} />, needs: 'full' },
  { key: 'operaciones', label: 'Operaciones', icon: <IconSettings size={16} stroke={1.5} />, needs: 'full' },
];

export default function DashboardPage() {
  const perms = usePermissions();
  const tabs = useMemo(() => ALL_TABS.filter((t) => {
    if (t.needs === 'any') return true;
    if (t.needs === 'full') return perms.canSeeFullDashboard;
    if (t.needs === 'basic') return perms.canSeeBasicKpis;
    return false;
  }), [perms.canSeeFullDashboard, perms.canSeeBasicKpis]);

  const [section, setSection] = useState<KpiSection>('resumen');
  const [showUsd, setShowUsd] = useState(false);

  const {
    summary,
    breakdownCuenta,
    breakdownDia,
    breakdownHora,
    rangeStats,
    extra,
    monthly,
    range,
    setRange,
    loading,
    error,
    refresh,
  } = useDashboardStats(section);

  const { rate, loading: rateLoading, error: rateError, refresh: refreshRate } = useBcvRate();

  const fmt = useCallback(
    (bs: number) => {
      if (showUsd && rate) return formatCurrencyUsd(bs / rate.promedio);
      return formatCurrencyBs(bs);
    },
    [showUsd, rate],
  );

  const fmtShort = useCallback(
    (bs: number) => {
      if (showUsd && rate) return formatCurrency(bs / rate.promedio);
      return formatCurrency(bs);
    },
    [showUsd, rate],
  );

  if (loading && !summary) {
    return (
      <div className="page">
        <AppHeader title="Dashboard" />
        <div className={styles.loading}><Spinner /></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page">
        <AppHeader title="Dashboard" />
        <EmptyState
          icon={<IconAlertTriangle size={48} stroke={1.5} />}
          title={error ? 'No se pudieron cargar las estadísticas' : 'Sin datos'}
          description={error ? 'Revisa tu conexión e intenta de nuevo.' : 'Aún no hay información para mostrar.'}
          action={error ? <Button onClick={refresh}>Reintentar</Button> : undefined}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <AppHeader
        title="Dashboard"
        actions={rate && (
          <button
            className={styles.toggleBtn}
            onClick={() => setShowUsd((v) => !v)}
            aria-label="Cambiar moneda"
          >
            <IconArrowsExchange size={14} stroke={1.5} />
            <span>{showUsd ? 'Bs.' : 'USD'}</span>
          </button>
        )}
      />

      <SectionTabs
        tabs={tabs}
        active={section}
        onChange={(k) => setSection(k as KpiSection)}
      />

      {section === 'resumen' && (
        <DashboardResumen
          summary={summary}
          extra={extra}
          monthly={monthly}
          rate={rate}
          rateLoading={rateLoading}
          rateError={rateError}
          onRefreshRate={refreshRate}
          fmt={fmt}
          fmtShort={fmtShort}
        />
      )}

      {section === 'finanzas' && (
        <DashboardFinanzas
          summary={summary}
          breakdownDia={breakdownDia}
          breakdownHora={breakdownHora}
          range={range}
          onRangeChange={setRange}
          fmt={fmt}
          fmtShort={fmtShort}
        />
      )}

      {section === 'cuentas' && (
        <DashboardCuentas
          breakdownCuenta={breakdownCuenta}
          range={range}
          onRangeChange={setRange}
          fmt={fmt}
        />
      )}

      {section === 'operaciones' && (
        <DashboardOperaciones
          rangeStats={rangeStats}
          range={range}
          onRangeChange={setRange}
        />
      )}
    </div>
  );
}
