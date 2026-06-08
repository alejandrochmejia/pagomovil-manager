-- Security hardening: bloqueantes de produccion #1 (RLS), #2 (bucket), #5 (scan quota)
-- Aplicado al proyecto en vivo via Supabase MCP (migracion security_hardening_2026_06).

-- (#5) Indice para las consultas de cuota de escaneo por empresa/ventana de tiempo
-- (ver routers/scan.py::_check_scan_quota).
create index if not exists idx_scan_logs_empresa_started
  on public.scan_logs (empresa_id, scan_started_at desc);

-- (#2) Bucket de comprobantes -> privado. La lectura se hace exclusivamente con
-- URLs firmadas de corta duracion generadas por el backend (service_role).
-- Ver routers/pagos.py::_sign_comprobantes_in_place.
update storage.buckets set public = false where id = 'comprobantes';

-- Quitar la politica de lectura publica del bucket (anon/authenticated).
drop policy if exists comprobantes_public_read on storage.objects;

-- (#1) RLS reasegurado en todas las tablas de negocio. El backend opera con
-- service_role (bypassa RLS) y aisla por empresa a nivel de aplicacion; con RLS
-- habilitado y sin politicas, los roles anon/authenticated quedan denegados por
-- defecto (defensa en profundidad ante exposicion accidental de PostgREST).
-- El frontend NUNCA usa supabase-js: todo el acceso pasa por el backend FastAPI.
alter table public.pagos              enable row level security;
alter table public.cuentas_receptoras enable row level security;
alter table public.scan_logs          enable row level security;
alter table public.audit_log          enable row level security;
alter table public.metas_mensuales    enable row level security;
alter table public.empresas           enable row level security;
alter table public.empresa_miembros   enable row level security;
alter table public.invitaciones       enable row level security;
alter table public.bcv_rates          enable row level security;
