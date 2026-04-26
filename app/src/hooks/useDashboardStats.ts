import { useState, useEffect, useCallback } from 'react';
import {
  getStatsSummary,
  getStatsBreakdown,
  getScanStats,
  getDefaultDateRange,
} from '@/services/stats.service';
import { fetchStats, invalidateStats, peekStats } from '@/services/stats.cache';
import type { StatsSummary, StatsBreakdown, ScanStats, DateRange, KpiSection } from '@/types/common';

const KEY_SUMMARY = 'summary';
const KEY_SCANS = 'scans';
const breakdownKey = (groupBy: 'banco' | 'dia' | 'hora', range: DateRange) =>
  `breakdown:${groupBy}:${range.from}:${range.to}`;

export function useDashboardStats(section: KpiSection) {
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [summary, setSummary] = useState<StatsSummary | null>(
    () => peekStats<StatsSummary>(KEY_SUMMARY) ?? null,
  );
  const [breakdownBanco, setBreakdownBanco] = useState<StatsBreakdown[]>([]);
  const [breakdownDia, setBreakdownDia] = useState<StatsBreakdown[]>([]);
  const [breakdownHora, setBreakdownHora] = useState<StatsBreakdown[]>([]);
  const [scanStats, setScanStats] = useState<ScanStats | null>(
    () => peekStats<ScanStats>(KEY_SCANS) ?? null,
  );
  const [loading, setLoading] = useState(() => !peekStats<StatsSummary>(KEY_SUMMARY));

  const loadSummary = useCallback(async () => {
    const cached = peekStats<StatsSummary>(KEY_SUMMARY);
    if (!cached) setLoading(true);
    try {
      const s = await fetchStats(KEY_SUMMARY, getStatsSummary);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (section === 'finanzas') {
      const cachedDia = peekStats<StatsBreakdown[]>(breakdownKey('dia', range));
      const cachedHora = peekStats<StatsBreakdown[]>(breakdownKey('hora', range));
      if (cachedDia) setBreakdownDia(cachedDia);
      if (cachedHora) setBreakdownHora(cachedHora);
      fetchStats(breakdownKey('dia', range), () => getStatsBreakdown(range, 'dia')).then(setBreakdownDia);
      fetchStats(breakdownKey('hora', range), () => getStatsBreakdown(range, 'hora')).then(setBreakdownHora);
    } else if (section === 'bancos') {
      const cached = peekStats<StatsBreakdown[]>(breakdownKey('banco', range));
      if (cached) setBreakdownBanco(cached);
      fetchStats(breakdownKey('banco', range), () => getStatsBreakdown(range, 'banco')).then(setBreakdownBanco);
    } else if (section === 'operaciones') {
      const cached = peekStats<ScanStats>(KEY_SCANS);
      if (cached) setScanStats(cached);
      fetchStats(KEY_SCANS, getScanStats).then(setScanStats);
    }
  }, [section, range]);

  const refresh = useCallback(() => {
    invalidateStats();
    loadSummary();
    if (section === 'finanzas') {
      fetchStats(breakdownKey('dia', range), () => getStatsBreakdown(range, 'dia')).then(setBreakdownDia);
      fetchStats(breakdownKey('hora', range), () => getStatsBreakdown(range, 'hora')).then(setBreakdownHora);
    } else if (section === 'bancos') {
      fetchStats(breakdownKey('banco', range), () => getStatsBreakdown(range, 'banco')).then(setBreakdownBanco);
    } else if (section === 'operaciones') {
      fetchStats(KEY_SCANS, getScanStats).then(setScanStats);
    }
  }, [section, range, loadSummary]);

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
