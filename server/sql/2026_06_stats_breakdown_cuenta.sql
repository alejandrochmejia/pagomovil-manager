-- Añade la agrupación `cuenta` a get_stats_breakdown para alimentar la sección
-- "Cuentas" del dashboard (estadísticas por cuenta receptora en vez de por banco).
-- Agrupa por el nombre (alias) de la cuenta receptora; los pagos sin cuenta
-- asignada (cuenta_receptora_id NULL) se agregan bajo "Sin cuenta asignada".
-- Idempotente: CREATE OR REPLACE conserva los casos banco/dia/hora existentes.

CREATE OR REPLACE FUNCTION public.get_stats_breakdown(p_desde text, p_hasta text, p_group_by text, p_empresa_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_group_by = 'banco' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO result
    FROM (
      SELECT banco AS grupo, SUM(monto)::numeric AS total, COUNT(*)::int AS cantidad
      FROM pagos WHERE fecha >= p_desde::date AND fecha <= p_hasta::date AND estado = 'confirmado' AND empresa_id = p_empresa_id
      GROUP BY banco ORDER BY total DESC
    ) r;
  ELSIF p_group_by = 'cuenta' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO result
    FROM (
      SELECT COALESCE(cr.nombre, 'Sin cuenta asignada') AS grupo,
             SUM(p.monto)::numeric AS total,
             COUNT(*)::int AS cantidad
      FROM pagos p
      LEFT JOIN cuentas_receptoras cr ON cr.id = p.cuenta_receptora_id
      WHERE p.fecha >= p_desde::date AND p.fecha <= p_hasta::date AND p.estado = 'confirmado' AND p.empresa_id = p_empresa_id
      GROUP BY COALESCE(cr.nombre, 'Sin cuenta asignada') ORDER BY total DESC
    ) r;
  ELSIF p_group_by = 'dia' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO result
    FROM (
      SELECT fecha::text AS grupo, SUM(monto)::numeric AS total, COUNT(*)::int AS cantidad
      FROM pagos WHERE fecha >= p_desde::date AND fecha <= p_hasta::date AND estado = 'confirmado' AND empresa_id = p_empresa_id
      GROUP BY fecha ORDER BY fecha ASC
    ) r;
  ELSIF p_group_by = 'hora' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO result
    FROM (
      SELECT COALESCE(LEFT(hora, 2), 'N/A') AS grupo, SUM(monto)::numeric AS total, COUNT(*)::int AS cantidad
      FROM pagos WHERE fecha >= p_desde::date AND fecha <= p_hasta::date AND estado = 'confirmado' AND empresa_id = p_empresa_id
      GROUP BY COALESCE(LEFT(hora, 2), 'N/A') ORDER BY grupo ASC
    ) r;
  ELSE
    result := '[]'::jsonb;
  END IF;
  RETURN result;
END;
$function$;
