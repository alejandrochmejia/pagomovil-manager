import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getStatsSummary,
  getStatsBreakdown,
  getScanStats,
  getDefaultDateRange,
} from '@/services/stats.service';
import { fetchStats, invalidateStats, peekStats } from '@/services/stats.cache';
import type { StatsSummary, StatsBreakdown, ScanStats, DateRange, KpiSection } from '@/types/common';

const summaryKey = (eid: string) => `summary:${eid}`;
const scansKey = (eid: string) => `scans:${eid}`;
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

  useEffect(() => {
    if (section === 'finanzas') {
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

  const refresh = useCallback(() => {
    invalidateStats();
    loadSummary();
    if (section === 'finanzas') {
      fetchStats(breakdownKey('dia', eid, range), () => getStatsBreakdown(range, 'dia')).then(setBreakdownDia);
      fetchStats(breakdownKey('hora', eid, range), () => getStatsBreakdown(range, 'hora')).then(setBreakdownHora);
    } else if (section === 'bancos') {
      fetchStats(breakdownKey('banco', eid, range), () => getStatsBreakdown(range, 'banco')).then(setBreakdownBanco);
    } else if (section === 'operaciones') {
      fetchStats(scansKey(eid), getScanStats, { persist: true }).then(setScanStats);
    }
  }, [section, range, eid, loadSummary]);

  return {
    summary,
    breakdownBanco,
    breakdownDia,
    breakdownHora,
    scanStats,
    range,
    setRange,
    loading,
    refresh,
  } as const;
}
