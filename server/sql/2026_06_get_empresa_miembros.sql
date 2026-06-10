-- Devuelve los miembros de una empresa con su email y nombre, leyendo auth.users
-- via SECURITY DEFINER (robusto: no depende de la admin API de GoTrue, que fallaba
-- y dejaba a los miembros como "desconocido"). La lo consume el backend en una sola
-- llamada en vez de N peticiones admin por usuario.

CREATE OR REPLACE FUNCTION public.get_empresa_miembros(p_empresa_id bigint)
 RETURNS TABLE(id bigint, user_id uuid, rol text, creado_en timestamptz, email text, nombre text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.user_id, m.rol, m.creado_en,
         u.email::text AS email,
         COALESCE(u.raw_user_meta_data->>'nombre', '') AS nombre
  FROM public.empresa_miembros m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.empresa_id = p_empresa_id
  ORDER BY m.creado_en ASC;
$function$;
