import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getStatsSummary,
  getStatsBreakdown,
  getStatsRange,
  getStatsExtra,
  getStatsMonthly,
  getDefaultDateRange,
} from '@/services/stats.service';
import {
  fetchStats,
  invalidateStats,
  peekStats,
  subscribeStatsInvalidate,
} from '@/services/stats.cache';
import type {
  StatsSummary,
  StatsBreakdown,
  StatsRange,
  StatsExtra,
  StatsMonthly,
  DateRange,
  KpiSection,
} from '@/types/common';

const summaryKey = (eid: string) => `summary:${eid}`;
const rangeKey = (eid: string, range: DateRange) => `range:${eid}:${range.from}:${range.to}`;
const extraKey = (eid: string) => `extra:${eid}`;
const monthlyKey = (eid: string) => `monthly:${eid}`;
const breakdownKey = (gb: 'cuenta' | 'dia' | 'hora', eid: string, range: DateRange) =>
  `breakdown:${gb}:${eid}:${range.from}:${range.to}`;

export function useDashboardStats(section: KpiSection) {
  const { empresaId } = useAuth();
  const eid = empresaId != null ? String(empresaId) : 'none';

  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [summary, setSummary] = useState<StatsSummary | null>(
    () => peekStats<StatsSummary>(summaryKey(eid)) ?? null,
  );
  const [breakdownCuenta, setBreakdownCuenta] = useState<StatsBreakdown[]>([]);
  const [breakdownDia, setBreakdownDia] = useState<StatsBreakdown[]>([]);
  const [breakdownHora, setBreakdownHora] = useState<StatsBreakdown[]>([]);
  const [rangeStats, setRangeStats] = useState<StatsRange | null>(null);
  const [extra, setExtra] = useState<StatsExtra | null>(
    () => peekStats<StatsExtra>(extraKey(eid)) ?? null,
  );
  const [monthly, setMonthly] = useState<StatsMonthly[]>(
    () => peekStats<StatsMonthly[]>(monthlyKey(eid)) ?? [],
  );
  const [loading, setLoading] = useState(() => !peekStats<StatsSummary>(summaryKey(eid)));
  const [error, setError] = useState(false);

  const loadSummary = useCallback(async () => {
    const key = summaryKey(eid);
    if (!peekStats<StatsSummary>(key)) setLoading(true);
    setError(false);
    try {
      const s = await fetchStats(key, getStatsSummary, { persist: true });
      setSummary(s);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eid]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadSection = useCallback(() => {
    if (section === 'resumen') {
      const kE = extraKey(eid);
      const kM = monthlyKey(eid);
      const cachedExtra = peekStats<StatsExtra>(kE);
      const cachedMonthly = peekStats<StatsMonthly[]>(kM);
      if (cachedExtra) setExtra(cachedExtra);
      if (cachedMonthly) setMonthly(cachedMonthly);
      fetchStats(kE, getStatsExtra, { persist: true }).then(setExtra).catch(() => setError(true));
      fetchStats(kM, getStatsMonthly, { persist: true }).then(setMonthly).catch(() => setError(true));
    } else if (section === 'finanzas') {
      const kDia = breakdownKey('dia', eid, range);
      const kHora = breakdownKey('hora', eid, range);
      const cachedDia = peekStats<StatsBreakdown[]>(kDia);
      const cachedHora = peekStats<StatsBreakdown[]>(kHora);
      if (cachedDia) setBreakdownDia(cachedDia);
      if (cachedHora) setBreakdownHora(cachedHora);
      fetchStats(kDia, () => getStatsBreakdown(range, 'dia')).then(setBreakdownDia).catch(() => setError(true));
      fetchStats(kHora, () => getStatsBreakdown(range, 'hora')).then(setBreakdownHora).catch(() => setError(true));
    } else if (section === 'cuentas') {
      const k = breakdownKey('cuenta', eid, range);
      const cached = peekStats<StatsBreakdown[]>(k);
      if (cached) setBreakdownCuenta(cached);
      fetchStats(k, () => getStatsBreakdown(range, 'cuenta')).then(setBreakdownCuenta).catch(() => setError(true));
    } else if (section === 'operaciones') {
      const k = rangeKey(eid, range);
      const cached = peekStats<StatsRange>(k);
      if (cached) setRangeStats(cached);
      fetchStats(k, () => getStatsRange(range)).then(setRangeStats).catch(() => setError(true));
    }
  }, [section, range, eid]);

  useEffect(() => {
    loadSection();
  }, [loadSection]);

  const reloadAll = useCallback(() => {
    loadSummary();
    loadSection();
  }, [loadSummary, loadSection]);

  useEffect(() => {
    return subscribeStatsInvalidate(() => {
      reloadAll();
    });
  }, [reloadAll]);

  const refresh = useCallback(() => {
    invalidateStats();
  }, []);

  return {
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
  } as const;
}
