-- Feature: detección de comprobantes que no coinciden con los datos del pago.
-- Aplicado al proyecto en vivo via Supabase MCP (migración comprobante_no_coincidente_2026_06).

-- Columna + índice parcial (solo filas marcadas, que son minoría).
alter table public.pagos
  add column if not exists comprobante_no_coincidente boolean not null default false;

create index if not exists idx_pagos_no_coincidente
  on public.pagos (empresa_id) where comprobante_no_coincidente = true;

-- get_stats_summary: añadir conteo no_coincidentes_total.
-- (ver definición completa de la función en 0000_baseline_schema.sql; aquí solo
--  se documenta que se añadió la clave 'no_coincidentes_total' al jsonb_build_object:
--    'no_coincidentes_total', (SELECT COUNT(*) FROM pagos
--       WHERE empresa_id = p_empresa_id AND comprobante_no_coincidente = true)
--  Re-deployar con CREATE OR REPLACE FUNCTION.)
