import { api } from './api';
import type { Pago } from '@/types/pago';
import type { DateRange, DashboardStats } from '@/types/common';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function getDashboardStats(range: DateRange): Promise<DashboardStats> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [pagosHoy, pagosMes, pagosRango] = await Promise.all([
    api<Pago[]>(`/pagos?desde=${today}&hasta=${today}`),
    api<Pago[]>(`/pagos?desde=${monthStart}&hasta=${monthEnd}`),
    api<Pago[]>(`/pagos?desde=${range.from}&hasta=${range.to}`),
  ]);

  const totalHoy = pagosHoy.reduce((sum, p) => sum + Number(p.monto), 0);
  const totalMes = pagosMes.reduce((sum, p) => sum + Number(p.monto), 0);

  const pagosPorBancoMap = new Map<string, { total: number; cantidad: number }>();
  const pagosPorDiaMap = new Map<string, { total: number; cantidad: number }>();

  for (const pago of pagosRango) {
    const monto = Number(pago.monto);
    const bancoEntry = pagosPorBancoMap.get(pago.banco) ?? { total: 0, cantidad: 0 };
    bancoEntry.total += monto;
    bancoEntry.cantidad += 1;
    pagosPorBancoMap.set(pago.banco, bancoEntry);

    const diaEntry = pagosPorDiaMap.get(pago.fecha) ?? { total: 0, cantidad: 0 };
    diaEntry.total += monto;
    diaEntry.cantidad += 1;
    pagosPorDiaMap.set(pago.fecha, diaEntry);
  }

  const pagosPorBanco = Array.from(pagosPorBancoMap.entries())
    .map(([banco, data]) => ({ banco, ...data }))
    .sort((a, b) => b.total - a.total);

  const pagosPorDia = Array.from(pagosPorDiaMap.entries())
    .map(([fecha, data]) => ({ fecha, ...data }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    totalHoy,
    totalMes,
    cantidadHoy: pagosHoy.length,
    cantidadMes: pagosMes.length,
    promedioMes: pagosMes.length > 0 ? totalMes / pagosMes.length : 0,
    pagosPorBanco,
    pagosPorDia,
  };
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
