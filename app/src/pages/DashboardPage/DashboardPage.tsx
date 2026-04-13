import { useState, useCallback, useMemo } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useBcvRate } from '@/hooks/useBcvRate';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrencyBs, formatCurrencyUsd, formatCurrency } from '@/utils/format';
import type { KpiSection } from '@/types/common';
import {
  IconHome,
  IconCurrencyDollar,
  IconBuildingBank,
  IconSettings,
  IconShieldCheck,
  IconArrowsExchange,
} from '@tabler/icons-react';
import AppHeader from '@/components/atoms/AppHeader/AppHeader';
import SectionTabs from '@/components/atoms/SectionTabs/SectionTabs';
import Spinner from '@/components/atoms/Spinner/Spinner';
import DashboardResumen from '@/components/organisms/DashboardResumen/DashboardResumen';
import DashboardFinanzas from '@/components/organisms/DashboardFinanzas/DashboardFinanzas';
import DashboardBancos from '@/components/organisms/DashboardBancos/DashboardBancos';
import DashboardOperaciones from '@/components/organisms/DashboardOperaciones/DashboardOperaciones';
import DashboardRiesgo from '@/components/organisms/DashboardRiesgo/DashboardRiesgo';
import styles from './DashboardPage.module.css';

const ALL_TABS: { key: KpiSection; label: string; icon: React.ReactNode; needs: 'any' | 'full' | 'basic' }[] = [
  { key: 'resumen', label: 'Resumen', icon: <IconHome size={16} stroke={1.5} />, needs: 'any' },
  { key: 'finanzas', label: 'Finanzas', icon: <IconCurrencyDollar size={16} stroke={1.5} />, needs: 'full' },
  { key: 'bancos', label: 'Bancos', icon: <IconBuildingBank size={16} stroke={1.5} />, needs: 'full' },
  { key: 'operaciones', label: 'Operaciones', icon: <IconSettings size={16} stroke={1.5} />, needs: 'full' },
  { key: 'riesgo', label: 'Riesgo', icon: <IconShieldCheck size={16} stroke={1.5} />, needs: 'full' },
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
    breakdownBanco,
    breakdownDia,
    breakdownHora,
    scanStats,
    range,
    setRange,
    loading,
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

  if (!summary) return null;

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
          rate={rate}
          rateLoading={rateLoading}
          rateError={rateError}
          onRefreshRate={refreshRate}
          fmt={fmt}
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

      {section === 'bancos' && (
        <DashboardBancos
          breakdownBanco={breakdownBanco}
          range={range}
          onRangeChange={setRange}
          fmt={fmt}
        />
      )}

      {section === 'operaciones' && (
        <DashboardOperaciones
          summary={summary}
          scanStats={scanStats}
        />
      )}

      {section === 'riesgo' && (
        <DashboardRiesgo summary={summary} />
      )}
    </div>
  );
}
