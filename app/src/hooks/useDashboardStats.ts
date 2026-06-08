import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getStatsSummary,
  getStatsBreakdown,
  getScanStats,
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
  ScanStats,
  StatsExtra,
  StatsMonthly,
  DateRange,
  KpiSection,
} from '@/types/common';

const summaryKey = (eid: string) => `summary:${eid}`;
const scansKey = (eid: string) => `scans:${eid}`;
const extraKey = (eid: string) => `extra:${eid}`;
const monthlyKey = (eid: string) => `monthly:${eid}`;
const breakdownKey = (gb: 'banco' | 'dia' | 'hora', eid: string, range: DateRange) =>
  `breakdown:${gb}:${eid}:${range.from}:${range.to}`;

export function useDashboardStats(section: KpiSection) {
  const { empresaId } = useAuth();
  const eid = empresaId != null ? String(empresaId) : 'none';

  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [summary, setSummary] = useState<StatsSummary | null>(
    () => peekStats<StatsSummary>(summaryKey(eid)) ?? null,
  );
  const [breakdownBanco, setBreakdownBanco] = useState<StatsBreakdown[]>([]);
  const [breakdownDia, setBreakdownDia] = useState<StatsBreakdown[]>([]);
  const [breakdownHora, setBreakdownHora] = useState<StatsBreakdown[]>([]);
  const [scanStats, setScanStats] = useState<ScanStats | null>(
    () => peekStats<ScanStats>(scansKey(eid)) ?? null,
  );
  const [extra, setExtra] = useState<StatsExtra | null>(
    () => peekStats<StatsExtra>(extraKey(eid)) ?? null,
  );
  const [monthly, setMonthly] = useState<StatsMonthly[]>(
    () => peekStats<StatsMonthly[]>(monthlyKey(eid)) ?? [],
  );
  const [loading, setLoading] = useState(() => !peekStats<StatsSummary>(summaryKey(eid)));

  const loadSummary = useCallback(async () => {
    const key = summaryKey(eid);
    if (!peekStats<StatsSummary>(key)) setLoading(true);
    try {
      const s = await fetchStats(key, getStatsSummary, { persist: true });
      setSummary(s);
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
      fetchStats(kE, getStatsExtra, { persist: true }).then(setExtra);
      fetchStats(kM, getStatsMonthly, { persist: true }).then(setMonthly);
    } else if (section === 'finanzas') {
      const kDia = breakdownKey('dia', eid, range);
      const kHora = breakdownKey('hora', eid, range);
      const cachedDia = peekStats<StatsBreakdown[]>(kDia);
      const cachedHora = peekStats<StatsBreakdown[]>(kHora);
      if (cachedDia) setBreakdownDia(cachedDia);
      if (cachedHora) setBreakdownHora(cachedHora);
      fetchStats(kDia, () => getStatsBreakdown(range, 'dia')).then(setBreakdownDia);
      fetchStats(kHora, () => getStatsBreakdown(range, 'hora')).then(setBreakdownHora);
    } else if (section === 'bancos') {
      const k = breakdownKey('banco', eid, range);
      const cached = peekStats<StatsBreakdown[]>(k);
      if (cached) setBreakdownBanco(cached);
      fetchStats(k, () => getStatsBreakdown(range, 'banco')).then(setBreakdownBanco);
    } else if (section === 'operaciones') {
      const k = scansKey(eid);
      const cached = peekStats<ScanStats>(k);
      if (cached) setScanStats(cached);
      fetchStats(k, getScanStats, { persist: true }).then(setScanStats);
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
    breakdownBanco,
    breakdownDia,
    breakdownHora,
    scanStats,
    extra,
    monthly,
    range,
    setRange,
    loading,
    refresh,
  } as const;
}
