import { api } from './api';
import type {
  StatsSummary,
  StatsBreakdown,
  ScanStats,
  StatsExtra,
  StatsMonthly,
  DateRange,
} from '@/types/common';
import { format, startOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function getStatsSummary(): Promise<StatsSummary> {
  return api<StatsSummary>('/stats/summary');
}

export async function getStatsBreakdown(
  range: DateRange,
  groupBy: 'banco' | 'dia' | 'hora',
): Promise<StatsBreakdown[]> {
  return api<StatsBreakdown[]>(
    `/stats/breakdown?desde=${range.from}&hasta=${range.to}&group_by=${groupBy}`,
  );
}

export async function getScanStats(): Promise<ScanStats> {
  return api<ScanStats>('/stats/scans');
}

export async function getStatsExtra(): Promise<StatsExtra> {
  return api<StatsExtra>('/stats/extra');
}

export async function getStatsMonthly(): Promise<StatsMonthly[]> {
  return api<StatsMonthly[]>('/stats/monthly');
}

export function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfDay(now), 'yyyy-MM-dd'),
  };
}

export function getTodayRange(): DateRange {
  const now = new Date();
  const today = format(startOfDay(now), 'yyyy-MM-dd');
  return { from: today, to: today };
}
