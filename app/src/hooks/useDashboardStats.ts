import { useState, useEffect, useCallback } from 'react';
import {
  getStatsSummary,
  getStatsBreakdown,
  getScanStats,
  getDefaultDateRange,
} from '@/services/stats.service';
import type { StatsSummary, StatsBreakdown, ScanStats, DateRange, KpiSection } from '@/types/common';

export function useDashboardStats(section: KpiSection) {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [breakdownBanco, setBreakdownBanco] = useState<StatsBreakdown[]>([]);
  const [breakdownDia, setBreakdownDia] = useState<StatsBreakdown[]>([]);
  const [breakdownHora, setBreakdownHora] = useState<StatsBreakdown[]>([]);
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getStatsSummary();
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar summary al montar
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Cargar breakdowns segun la seccion activa
  useEffect(() => {
    if (section === 'finanzas') {
      Promise.all([
        getStatsBreakdown(range, 'dia').then(setBreakdownDia),
        getStatsBreakdown(range, 'hora').then(setBreakdownHora),
      ]);
    } else if (section === 'bancos') {
      getStatsBreakdown(range, 'banco').then(setBreakdownBanco);
    } else if (section === 'operaciones') {
      getScanStats().then(setScanStats);
    }
  }, [section, range]);

  const refresh = useCallback(() => {
    loadSummary();
    if (section === 'finanzas') {
      getStatsBreakdown(range, 'dia').then(setBreakdownDia);
      getStatsBreakdown(range, 'hora').then(setBreakdownHora);
    } else if (section === 'bancos') {
      getStatsBreakdown(range, 'banco').then(setBreakdownBanco);
    } else if (section === 'operaciones') {
      getScanStats().then(setScanStats);
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
