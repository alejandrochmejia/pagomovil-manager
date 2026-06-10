-- Métricas de la sección Operaciones del dashboard, calculadas sobre un rango
-- de fechas [p_desde, p_hasta] (en vez de totales globales / mes fijo).
-- Pagos se filtran por `fecha`; scans (scan_logs) y ediciones (audit_log) por `creado_en`.
-- Idempotente: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_stats_range(p_desde text, p_hasta text, p_empresa_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_desde date := p_desde::date;
  v_hasta date := p_hasta::date;
  v_total_scans bigint;
  v_avg_ms numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_scans FROM scan_logs
    WHERE empresa_id = p_empresa_id AND creado_en::date >= v_desde AND creado_en::date <= v_hasta;
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (scan_completed_at - scan_started_at)) * 1000), 0)
    INTO v_avg_ms FROM scan_logs
    WHERE empresa_id = p_empresa_id AND scan_completed_at IS NOT NULL
      AND creado_en::date >= v_desde AND creado_en::date <= v_hasta;

  SELECT jsonb_build_object(
    'cantidad', (SELECT COUNT(*) FROM pagos
      WHERE empresa_id = p_empresa_id AND estado = 'confirmado' AND fecha >= v_desde AND fecha <= v_hasta),
    'total_scans', v_total_scans,
    'tiempo_promedio_ms', ROUND(v_avg_ms),
    'sin_comprobante', (SELECT COUNT(*) FROM pagos
      WHERE empresa_id = p_empresa_id AND fecha >= v_desde AND fecha <= v_hasta
        AND (imagen_uri IS NULL OR imagen_uri LIKE 'capacitor://%')),
    'duplicados', (SELECT COUNT(*) FROM (
      SELECT banco, referencia FROM pagos
      WHERE empresa_id = p_empresa_id AND fecha >= v_desde AND fecha <= v_hasta
      GROUP BY banco, referencia HAVING COUNT(*) > 1) dup),
    'transacciones_editadas', (SELECT COUNT(*) FROM audit_log
      WHERE accion = 'editar' AND empresa_id = p_empresa_id
        AND creado_en::date >= v_desde AND creado_en::date <= v_hasta)
  ) INTO result;
  RETURN result;
END;
$function$;
