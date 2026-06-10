-- Fixes de auditoría (2026-06):
--  C1: metas_mensuales debe ser única por (empresa_id, mes), no por mes global.
--  A8: anclar todos los cálculos de fecha a America/Caracas (UTC-4) en vez de la
--      zona del servidor (UTC), para que "hoy"/semana/mes no se corran ~4h.
--  M5: duplicados_hoy debe contar solo los duplicados de HOY.
--  M4: tasa_correccion se deriva de scan_logs.campos_finales->>'corregido'
--      (poblado al vincular el pago), no de comparar jsonb completos.

-- C1 -------------------------------------------------------------------------
ALTER TABLE public.metas_mensuales DROP CONSTRAINT IF EXISTS metas_mensuales_mes_key;
ALTER TABLE public.metas_mensuales
  ADD CONSTRAINT metas_mensuales_empresa_mes_key UNIQUE (empresa_id, mes);

-- A8 + M5 --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_stats_summary(p_empresa_id bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_today date := (now() AT TIME ZONE 'America/Caracas')::date;
  v_yesterday date := (now() AT TIME ZONE 'America/Caracas')::date - 1;
  v_week_start date := date_trunc('week', (now() AT TIME ZONE 'America/Caracas')::date)::date;
  v_prev_week_start date := (date_trunc('week', (now() AT TIME ZONE 'America/Caracas')::date) - interval '7 days')::date;
  v_prev_week_end date := (date_trunc('week', (now() AT TIME ZONE 'America/Caracas')::date) - interval '1 day')::date;
  v_month_start date := date_trunc('month', (now() AT TIME ZONE 'America/Caracas')::date)::date;
  v_month_end date := (date_trunc('month', (now() AT TIME ZONE 'America/Caracas')::date) + interval '1 month' - interval '1 day')::date;
  v_mes_actual text := to_char((now() AT TIME ZONE 'America/Caracas')::date, 'YYYY-MM');
BEGIN
  SELECT jsonb_build_object(
    'total_hoy', COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha = v_today AND estado = 'confirmado' AND empresa_id = p_empresa_id), 0),
    'cantidad_hoy', (SELECT COUNT(*) FROM pagos WHERE fecha = v_today AND estado = 'confirmado' AND empresa_id = p_empresa_id),
    'total_ayer', COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha = v_yesterday AND estado = 'confirmado' AND empresa_id = p_empresa_id), 0),
    'cantidad_ayer', (SELECT COUNT(*) FROM pagos WHERE fecha = v_yesterday AND estado = 'confirmado' AND empresa_id = p_empresa_id),
    'total_semana', COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha >= v_week_start AND fecha <= v_today AND estado = 'confirmado' AND empresa_id = p_empresa_id), 0),
    'cantidad_semana', (SELECT COUNT(*) FROM pagos WHERE fecha >= v_week_start AND fecha <= v_today AND estado = 'confirmado' AND empresa_id = p_empresa_id),
    'total_semana_anterior', COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha >= v_prev_week_start AND fecha <= v_prev_week_end AND estado = 'confirmado' AND empresa_id = p_empresa_id), 0),
    'cantidad_semana_anterior', (SELECT COUNT(*) FROM pagos WHERE fecha >= v_prev_week_start AND fecha <= v_prev_week_end AND estado = 'confirmado' AND empresa_id = p_empresa_id),
    'total_mes', COALESCE((SELECT SUM(monto) FROM pagos WHERE fecha >= v_month_start AND fecha <= v_month_end AND estado = 'confirmado' AND empresa_id = p_empresa_id), 0),
    'cantidad_mes', (SELECT COUNT(*) FROM pagos WHERE fecha >= v_month_start AND fecha <= v_month_end AND estado = 'confirmado' AND empresa_id = p_empresa_id),
    'promedio_ticket', COALESCE((SELECT AVG(monto) FROM pagos WHERE fecha >= v_month_start AND fecha <= v_month_end AND estado = 'confirmado' AND empresa_id = p_empresa_id), 0),
    'duplicados_hoy', (SELECT COUNT(*) FROM (SELECT banco, referencia FROM pagos WHERE empresa_id = p_empresa_id AND fecha = v_today GROUP BY banco, referencia HAVING COUNT(*) > 1) dup),
    'transacciones_editadas', (SELECT COUNT(*) FROM audit_log WHERE accion = 'editar' AND empresa_id = p_empresa_id AND (creado_en AT TIME ZONE 'America/Caracas')::date >= v_month_start),
    'transacciones_anuladas', (SELECT COUNT(*) FROM pagos WHERE estado = 'anulado' AND empresa_id = p_empresa_id AND (actualizado_en AT TIME ZONE 'America/Caracas')::date >= v_month_start),
    'pendientes_revision', (SELECT COUNT(*) FROM pagos WHERE estado = 'pendiente' AND empresa_id = p_empresa_id),
    'sin_comprobante_total', (SELECT COUNT(*) FROM pagos WHERE empresa_id = p_empresa_id AND (imagen_uri IS NULL OR imagen_uri LIKE 'capacitor://%')),
    'no_coincidentes_total', (SELECT COUNT(*) FROM pagos WHERE empresa_id = p_empresa_id AND comprobante_no_coincidente = true),
    'meta_mes', (SELECT meta_ingresos FROM metas_mensuales WHERE mes = v_mes_actual AND empresa_id = p_empresa_id)
  ) INTO result;
  RETURN result;
END;
$function$;

-- M4 -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_scan_stats(p_empresa_id bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_total bigint;
  v_failed bigint;
  v_avg_ms numeric;
  v_corrected bigint;
BEGIN
  SELECT COUNT(*) INTO v_total FROM scan_logs WHERE empresa_id = p_empresa_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('tasa_rechazo', 0, 'tiempo_promedio_ms', 0, 'tasa_correccion', 0, 'total_scans', 0);
  END IF;
  SELECT COUNT(*) INTO v_failed FROM scan_logs WHERE scan_status LIKE 'failed_%' AND empresa_id = p_empresa_id;
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (scan_completed_at - scan_started_at)) * 1000), 0)
    INTO v_avg_ms FROM scan_logs WHERE scan_completed_at IS NOT NULL AND empresa_id = p_empresa_id;
  -- Un scan cuenta como "corregido" si al vincular el pago se detectaron campos
  -- distintos a los extraidos por la IA (flag guardado en campos_finales).
  SELECT COUNT(*) INTO v_corrected FROM scan_logs
    WHERE empresa_id = p_empresa_id
      AND scan_status = 'success'
      AND (campos_finales->>'corregido') = 'true';
  SELECT jsonb_build_object(
    'tasa_rechazo', ROUND((v_failed::numeric / v_total) * 100, 1),
    'tiempo_promedio_ms', ROUND(v_avg_ms),
    'tasa_correccion', ROUND((v_corrected::numeric / GREATEST(v_total - v_failed, 1)) * 100, 1),
    'total_scans', v_total
  ) INTO result;
  RETURN result;
END;
$function$;
