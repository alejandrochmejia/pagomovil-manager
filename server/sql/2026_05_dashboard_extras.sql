-- Aplicar en el SQL Editor de Supabase.
-- No modifica RPCs existentes; solo agrega dos nuevas.

-- 1) Extras del summary: mes pasado + ticket promedio historico
create or replace function public.get_stats_extra(p_empresa_id bigint)
returns json
language sql
stable
as $$
  with mes_anterior as (
    select
      coalesce(sum(monto), 0)::numeric as total,
      count(*)::bigint as cantidad
    from public.pagos
    where empresa_id = p_empresa_id
      and estado <> 'anulado'
      and fecha >= (date_trunc('month', current_date) - interval '1 month')::date
      and fecha <  date_trunc('month', current_date)::date
  ),
  historico as (
    select coalesce(avg(monto), 0)::numeric as promedio
    from public.pagos
    where empresa_id = p_empresa_id
      and estado <> 'anulado'
  )
  select json_build_object(
    'total_mes_anterior',         (select total    from mes_anterior),
    'cantidad_mes_anterior',      (select cantidad from mes_anterior),
    'ticket_promedio_historico',  (select promedio from historico)
  );
$$;

-- 2) Ingresos mensuales de los ultimos 12 meses (rellena meses sin pagos en 0)
create or replace function public.get_stats_monthly(p_empresa_id bigint)
returns table(mes text, total numeric, cantidad bigint)
language sql
stable
as $$
  with meses as (
    select generate_series(
      date_trunc('month', current_date) - interval '11 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date as inicio
  )
  select
    to_char(m.inicio, 'YYYY-MM') as mes,
    coalesce(sum(p.monto), 0)::numeric as total,
    count(p.id)::bigint as cantidad
  from meses m
  left join public.pagos p
    on p.empresa_id = p_empresa_id
   and p.estado <> 'anulado'
   and p.fecha >= m.inicio
   and p.fecha <  (m.inicio + interval '1 month')::date
  group by m.inicio
  order by m.inicio;
$$;
