# Plan de Pruebas y Auditoría de Bugs — pagomovil-manager

> Generado a partir de un análisis estático de todo el código (frontend `app/` + backend `server/` + funciones SQL). Cada hallazgo indica `archivo:línea`, severidad, impacto y fix sugerido.
>
> **Leyenda de estado:**
> - ✅ **Verificado** — confirmado leyendo el código exacto (y/o la base de datos real vía MCP).
> - 🔎 **Reportado** — detectado en la auditoría, alta confianza pero no re-verificado a mano.
> - ❓ **Sospecha** — requiere reproducción para confirmar.
>
> **Severidad:** 🔴 Crítico · 🟠 Alto · 🟡 Medio · 🔵 Bajo

---

## Resumen ejecutivo

| Severidad | Cantidad | Áreas principales |
|---|---|---|
| 🔴 Crítico | 4 | Multi-tenant (metas, cuenta_receptora_id), datos huérfanos cross-tenant, feature de control muerta |
| 🟠 Alto | 11 | RBAC, race conditions, errores silenciosos, máquina de estados, zona horaria, CSV injection |
| 🟡 Medio | 12 | Validaciones divergentes, métricas engañosas, OCR, transaccionalidad |
| 🔵 Bajo | 8 | Cosmético, mantenibilidad, edge cases poco frecuentes |

**Top 5 a atacar primero:** (1) `metas_mensuales UNIQUE(mes)`, (2) `cuenta_receptora_id` cross-tenant, (3) `scan_log_id` nunca enviado, (4) stale data al cambiar de empresa, (5) errores silenciosos en borrado/cambio de estado.

---

## BUGS — 🔴 Críticos

### 🔴 C1 — `metas_mensuales` con `UNIQUE (mes)` global rompe el multi-tenant ✅
- **Dónde:** `server/sql/0000_baseline_schema.sql:140` (constraint), consumido por `server/routers/metas.py:32-42`. **Verificado en la DB real:** la constraint es `UNIQUE (mes)`, no `(empresa_id, mes)`.
- **Qué pasa:** `upsert_meta` hace `SELECT ... WHERE mes=? AND empresa_id=?`; si no existe para esta empresa, hace `INSERT`. Pero el `INSERT` viola el `UNIQUE (mes)` global si **otra** empresa ya creó ese mes.
- **Impacto:** La primera empresa que define una meta para `2026-06` **bloquea ese mes para todas las demás** (cada `POST /metas` ajeno da 500). Funcionalidad de metas inutilizable con >1 empresa.
- **Fix:** `ALTER TABLE metas_mensuales DROP CONSTRAINT metas_mensuales_mes_key; ALTER TABLE metas_mensuales ADD CONSTRAINT metas_mensuales_empresa_mes_key UNIQUE (empresa_id, mes);` (migración + actualizar baseline).

### 🔴 C2 — `cuenta_receptora_id` no se valida contra la empresa (inyección cross-tenant de FK) ✅
- **Dónde:** `server/routers/pagos.py:494-526` (create) y `:529-577` (update); `server/schemas/pago.py:23,40`.
- **Qué pasa:** `PagoCreate/PagoUpdate` aceptan `cuenta_receptora_id` y se insertan tal cual. La FK solo exige que el id exista, no que sea de la misma empresa. Nunca se verifica pertenencia.
- **Impacto:** La empresa A puede crear/editar un pago apuntando a una `cuenta_receptora_id` de la empresa B (ids seriales, adivinables). Contamina breakdowns por cuenta, `matchCuenta` y reportes entre tenants.
- **Fix:** Antes de insertar/actualizar, si `cuenta_receptora_id` no es None: `SELECT id FROM cuentas_receptoras WHERE id=? AND empresa_id=?`; rechazar con 400/404 si no pertenece.

### 🔴 C3 — `scan_log_id` nunca se envía al crear un pago escaneado → "comprobante no coincide" muerto ✅
- **Dónde:** `app/src/pages/ScanPage/ScanPage.tsx:49-55` y `app/src/components/molecules/ScanPreview/ScanPreview.tsx:147-160` (`buildPagoData` no incluye `scan_log_id`).
- **Qué pasa:** El backend `_evaluar_coincidencia` (`pagos.py:106-125,515`) retorna `None` si `scan_log_id` es falsy. Como el flujo de escaneo nunca lo envía, **nunca** se evalúa la coincidencia ni se enlaza `scan_logs.pago_id`.
- **Impacto:** Para todo pago creado por escaneo (la vía principal de la app), el flag `comprobante_no_coincidente`, el filtro "No coincidentes" y la alerta de detalle quedan inservibles. La versión de *edición* sí lo hace bien (`PagosPage.handleSubmit`), confirmando el olvido.
- **Fix:** En `ScanPreview.buildPagoData()` añadir `scan_log_id: scanResult.scan_log_id`. (`PagoCreate` ya lo acepta.)

### 🔴 C4 — `scan_logs.update(pago_id)` en `create_pago` sin filtro de empresa (escritura cross-tenant) ✅
- **Dónde:** `server/routers/pagos.py:522-523`.
- **Qué pasa:** `supabase.table("scan_logs").update({"pago_id": ...}).eq("id", scan_log_id)` filtra solo por `id`, no por `empresa_id` (a diferencia de `update_pago` que sí añade `.eq("empresa_id", ...)`).
- **Impacto:** Un pago de la empresa A con un `scan_log_id` de la empresa B sobrescribe la fila de scan_logs de B (corrompe su trazabilidad scan↔pago). Defensa en profundidad rota.
- **Fix:** Añadir `.eq("empresa_id", empresa_id)` a la actualización (y combinar con C2/validación de `scan_log_id` por empresa).

---

## BUGS — 🟠 Altos

### 🟠 A1 — Stale data al cambiar de empresa: caché y estado del hook no se limpian ✅
- **Dónde:** `app/src/contexts/AuthContext.tsx:115-125` (`logout`/`switchEmpresa` no llaman `invalidateStats`), `app/src/hooks/useDashboardStats.ts:39-52`.
- **Qué pasa:** `switchEmpresa` solo cambia `empresaId`. El hook no se remonta: `summary/extra/monthly` (y `breakdown*`/`rangeStats`, que nunca se resetean) siguen mostrando datos de la empresa anterior hasta que llega el refetch. Como `loading && !summary` es `false`, no hay spinner. Además `logout` no borra `pagomovil_stats:*` de localStorage (TTL 60s).
- **Impacto:** Al cambiar de empresa se ven cifras/cuentas de la anterior durante cientos de ms. (Mitigado: las claves de caché incluyen el `empresaId`, así que no se sirve dato incorrecto de forma estable — es transitorio.)
- **Fix:** Llamar `invalidateStats()` (e `invalidateCuentas()`) en `switchEmpresa` y `logout`; resetear el estado del hook cuando cambie `empresaId`; incluir `pagomovil_stats:*` en `clearSession`.

### 🟠 A2 — Race condition en `useDashboardStats`: resultados obsoletos pisan a los nuevos ✅
- **Dónde:** `app/src/hooks/useDashboardStats.ts:73-107`.
- **Qué pasa:** `fetchStats(...).then(setX)` sin guard de "request actual" (sin `AbortController` ni flag `ignore` en el cleanup). Al cambiar rango/sección/empresa rápido, si el request viejo resuelve después, sobrescribe el nuevo.
- **Impacto:** Gráficos/ticket promedio terminan mostrando un rango que ya no es el seleccionado (más probable con red móvil).
- **Fix:** Patrón `let ignore=false; ...then(d=>{ if(!ignore) setX(d) }); return ()=>{ignore=true}`, o contador de petición.

### 🟠 A3 — Errores silenciosos en borrado / cambio de estado / resolver ✅
- **Dónde:** `PagosPage.tsx:225-229,293-306`, `PagosDuplicadosPage.tsx:41-46`, `CuentasPage.tsx:80-86`.
- **Qué pasa:** `await deletePago/updatePago/resolverNoCoincidente` sin `try/catch`. Ante error (red, 403, 404) el `ConfirmDialog` no se cierra, no se recarga y **no se muestra nada**.
- **Impacto:** Borrar como rol sin permiso o sin red → modal "colgado", fallo mudo. (Justo el tipo de error que se pidió avisar.)
- **Fix:** `try/catch` con error visible y mover los `setDeleting(undefined)`/reload a `finally`.

### 🟠 A4 — Sin máquina de estados: un pago `anulado` puede "revivir" a `confirmado` 🔎
- **Dónde:** `server/routers/pagos.py:529-577`.
- **Qué pasa:** `update_pago` escribe `estado` sin comparar con el actual. `anulado`/`rechazado` → `confirmado` es posible.
- **Impacto:** Revivir un anulado lo vuelve a sumar en los KPIs (`get_stats_summary` cuenta solo `confirmado`) → manipulación de totales. Un cajero también puede hacerlo (`pagos_editar`).
- **Fix:** Validar transiciones (desde `anulado` no se sale; definir qué estados puede tocar el cajero); rechazar transición inválida con 409.

### 🟠 A5 — El rol `cajero` no está limitado a "hoy" en mutaciones ni en duplicados 🔎
- **Dónde:** `pagos.py` — `_constrain_dates_by_role` (`:150-160`) solo se aplica en `list_pagos` y exports; no en `update_pago` (`:529`), `delete_pago` (`:602`), `resolver` (`:580`), `check-duplicate` (`:211`), `/duplicados` (`:187`).
- **Qué pasa:** Un cajero puede editar/borrar un pago de cualquier fecha pasando su `id`, y ver el histórico vía check-duplicate/duplicados.
- **Impacto:** La regla "cajero = solo hoy" es solo de listado; es bypasseable para escritura y para consultar histórico.
- **Fix:** Cargar el pago y verificar `fecha == today` (cajero) / rango 7d (supervisor) antes de mutar; aplicar la restricción de fecha también en check-duplicate/duplicados.

### 🟠 A6 — `can_change_role` permite que un admin degrade a otro admin ✅
- **Dónde:** `server/rbac.py:40` (`target_current_role in (manageable | {target_current_role})`).
- **Qué pasa:** El `| {target_current_role}` hace que la condición sea siempre verdadera para el rol propio del target. `can_change_role('admin','admin','cajero')` → `True`.
- **Impacto:** Un admin puede degradar a otro admin (o a sí mismo) a supervisor/cajero/contador. Escalada lateral / guerra de admins. (No puede promover a admin/dueño.)
- **Fix:** Quitar el `| {target_current_role}` y exigir que el rol actual del target esté estrictamente en `manageable`; bloquear auto-modificación salvo política explícita.

### 🟠 A7 — Invitaciones nunca expiran: `accept_invitation` ignora `expira_en` ✅
- **Dónde:** `server/routers/empresas.py:208-218`.
- **Qué pasa:** El query filtra por `token` + `estado='pendiente'`, pero **nunca** compara `expira_en` (default `now()+7d`). El mensaje "no encontrada o expirada" es engañoso.
- **Impacto:** Una invitación caducada hace meses (incluso con rol `admin`) sigue siendo aceptable por quien tenga el token. Acceso persistente no intencionado.
- **Fix:** Filtrar `.gt("expira_en", now)` (o comparar en Python) y marcar expiradas.

### 🟠 A8 — Inconsistencia de zona horaria (UTC servidor vs. America/Caracas, UTC-4) 🔎
- **Dónde:** `get_stats_summary` (`0000_baseline_schema.sql:315-338`, usa `CURRENT_DATE`/`date_trunc`), `get_stats_range` (`2026_06_stats_range.sql:20-40`, mezcla `fecha` con `creado_en::date`), y `getDefaultDateRange`/presets en el cliente (`stats.service.ts`, `DateRangePicker.tsx`).
- **Qué pasa:** Los pagos se filtran por `fecha` (date), pero scans/ediciones por `creado_en::date` evaluado en la TZ del servidor (UTC). El cliente calcula "hoy" en hora local del dispositivo.
- **Impacto:** Cerca de medianoche en Venezuela, "Total hoy", `total_scans`, etc. quedan corridos ~4h; un cajero puede ver "Sin pagos" tras registrar uno. Métricas de un día concreto desalineadas entre `cantidad` y `total_scans`.
- **Fix:** Anclar todos los límites a `America/Caracas` (`(now() AT TIME ZONE 'America/Caracas')::date`) en SQL y derivar "hoy" del servidor en la TZ de la empresa.

### 🟠 A9 — CSV injection en export ✅(lógica)
- **Dónde:** `server/routers/pagos.py:413-414`.
- **Qué pasa:** Las celdas (`concepto`, `banco`, `referencia` — provienen de usuario/OCR) se escriben sin neutralizar valores que empiezan por `= + - @`.
- **Impacto:** Un `concepto = "=HYPERLINK(...)"` se evalúa al abrir el CSV en Excel/LibreOffice (exfiltración/phishing). Lo dispara un contador/admin que confía en el archivo.
- **Fix:** Prefijar con `'` (comilla simple) o `\t` toda celda que empiece por `= + - @`.

### 🟠 A10 — `fmt`/`fmtShort` y `formatCurrency` muestran `$ NaN` / `$ ∞` con tasa BCV 0 o inválida 🔎
- **Dónde:** `DashboardPage.tsx:62-76`, `app/src/utils/format.ts:4-18`, `bcv.service.ts:43-57`.
- **Qué pasa:** `bs / rate.promedio` sin validar; si el feed (dolarapi) devuelve `0`/`null`/no numérico, se cachea y produce `Infinity`/`NaN`, que `Intl.NumberFormat` formatea como `"∞"`/`"NaN"`. El objeto `{promedio:0}` es truthy, así que el toggle USD se muestra igual.
- **Impacto:** Con un payload degradado del feed, todo el dashboard/listado en modo USD muestra `$ ∞`/`$ NaN`.
- **Fix:** Validar `Number.isFinite(promedio) && promedio>0` en `fetchBcvRate`/`getCachedRate`; guarda `if (!Number.isFinite(x)) return '—'` en `formatCurrency`.

### 🟠 A11 — `supervisor` no ve los KPIs que su rol promete (tabs `needs:'full'`) 🔎
- **Dónde:** `app/src/pages/DashboardPage/DashboardPage.tsx:26-40`.
- **Qué pasa:** Las tabs Finanzas/Cuentas/Operaciones son `needs:'full'` (solo dueno/admin/contador). Ninguna usa `needs:'basic'`, así que `canSeeBasicKpis`/`dashboard_kpi_basico` es código muerto en esta página. El `supervisor` solo ve "Resumen".
- **Impacto:** Inconsistencia con `dashboard_kpi_basico` (que incluye supervisor en `rbac.py:9`) y con `ROL_DESCRIPTIONS`.
- **Fix:** Definir qué tabs son `basic` y asignarlas, o revisar el gating para alinearlo con la intención del permiso.

---

## BUGS — 🟡 Medios

- **🟡 M1 — Validación de referencia divergente** ✅ — `ScanPreview.tsx:185` solo exige no-vacío; `PagoForm.tsx:63` exige `^\d{4,20}$`; backend permite 1–40. Resultado: referencias que entran por escaneo no se pueden editar en PagoForm, y PagoForm bloquea refs de 21–40 dígitos válidas para el backend. *Fix:* unificar regex (`^\d{4,40}$`) en ambos.
- **🟡 M2 — Cédula mal parseada al editar** ✅ — `PagoForm.tsx:37-42` y `CuentaForm.tsx:21-26`: `tipoCedula` usa `charAt(0)` pero el número usa `.replace(/^[VJEG]-/,'')` (exige guion). Una cédula guardada como `V12345678` (sin guion) produce `V-V12345678` → "Cédula inválida" sobre un dato que parecía bueno. *Fix:* normalizar como en `ScanPreview.tsx:50-56`.
- **🟡 M3 — `int(X-Empresa-Id)` sin try/except → 500** ✅ — `rbac.py:69,86`: un header no numérico da 500 en vez de 400 (a diferencia de `dependencies.py:33-35`). Afecta todos los endpoints con `require_permission`/`get_user_with_role`. *Fix:* try/except → 400.
- **🟡 M4 — `tasa_correccion` siempre 0** ✅ — `get_scan_stats` compara `campos_extraidos` vs `campos_finales`, pero `campos_finales` **nunca se escribe** en ningún lado del repo. Métrica muerta. *Fix:* poblar `campos_finales` al crear/editar pago con scan, o derivar de `campos_corregidos`, o eliminar la métrica.
- **🟡 M5 — `duplicados_hoy` no es "de hoy"** 🔎 — `baseline:336` cuenta grupos `(banco, referencia)` con `COUNT>1` sobre toda la historia, sin filtro de fecha ni de estado. Un duplicado de hace meses infla la métrica para siempre. *Fix:* filtrar por fecha y decidir exclusión de `anulado`.
- **🟡 M6 — Criterio `confirmado` vs `<>'anulado'` inconsistente entre RPCs** 🔎 — `baseline:267-308` define `get_stats_extra`/`get_stats_monthly` con `='confirmado'`, pero `2026_05_dashboard_extras.sql:5-58` las redefine con `<>'anulado'`. Según el orden de aplicación, los totales de comparación mensual mezclan criterios. *Fix:* unificar (probablemente `='confirmado'`) y dejar una sola definición. **Acción:** verificar cuál está desplegada en la DB.
- **🟡 M7 — Teléfono del OCR sin validar/normalizar** ✅ — `ScanPreview.tsx:153` envía `scanResult.telefono` crudo (no pasa por `isValidPhone`/`normalizePhone`); un valor >20 chars dispara 422 genérico. *Fix:* `normalizePhone` y omitir si no valida.
- **🟡 M8 — Modal se cierra (backdrop/back Android) durante el submit** 🔎 — `Modal.tsx:15,41` + forms en ScanPage/PagosPage/CuentasPage. Si se cierra a media operación, la promesa sigue y `navigate`/`closeEditModal` corren sobre un componente desmontado; se pierde el `submitError`. *Fix:* `disableClose` mientras `submitting`.
- **🟡 M9 — `_upload_comprobante` deja huérfanos en Storage si el insert/update falla** 🔎 — `pagos.py:506-520,542-571`: la imagen se sube antes del insert; un 404/500 posterior deja el objeto huérfano. *Fix:* validar pertenencia del pago antes de subir; limpiar (best-effort) ante fallo.
- **🟡 M10 — PDF truncado a 5000 filas sin aviso y con total parcial** ✅ — `pagos.py:469-485` calcula `truncated` pero el bloque es `pass`; el resumen del PDF suma solo 5000 filas. CSV/JSON no truncan → inconsistencia. *Fix:* mostrar aviso de truncamiento y total real (COUNT/SUM aparte).
- **🟡 M11 — Filtro de búsqueda por monto con float (`monto.eq.1e-07`)** ✅ — `pagos.py:178-180`: `float("0.0000001")` → `'1e-07'` y enteros grandes → `'…0.0'` en el filtro PostgREST → resultados incorrectos. *Fix:* formato estable (`f"{v:.2f}"`).
- **🟡 M12 — `create_empresa`/`accept_invitation` no transaccionales** ✅ — `empresas.py:46-70,224-231`: inserts en dos pasos sin rollback; un fallo intermedio deja empresa sin dueño o invitación zombie. Aceptar dos invitaciones a la misma empresa, o ser ya miembro, da 500 por el `UNIQUE(empresa_id,user_id)`. *Fix:* RPC transaccional; capturar la violación de unique → 400.

---

## BUGS — 🔵 Bajos

- **🔵 B1 — `bcv_rates` sin `empresa_id` (tabla global)** ✅ — confirmado en DB (cols: `fecha, promedio, fetched_at`). Probablemente **intencional** (la tasa BCV es pública y única por día). Riesgo real bajo: el `POST` está abierto a cualquier usuario autenticado sin permiso y dos empresas podrían pisarse (pero ambas leen del mismo feed). *Fix opcional:* proteger el `POST` con permiso o documentar que es global.
- **🔵 B2 — `empresas.py` no usa el RBAC central** ✅ — usa helpers locales `_get_rol`/`_require_admin_or_dueno` en vez de `require_permission("gestion_usuarios")`. Hoy coincide; riesgo de desincronización futura. *Fix:* usar `require_permission`.
- **🔵 B3 — `invite_member` no verifica si el email ya es miembro** ✅ — `empresas.py:161-191` solo bloquea invitaciones pendientes duplicadas. *Fix:* rechazar si ya pertenece.
- **🔵 B4 — Doble debounce en búsqueda de Pagos (~600ms) sin AbortController** ✅ — `SearchBar.tsx:24-29` + `PagosPage.tsx:87-88,138-141`. Inconsistente con CuentasPage. *Fix:* quitar el debounce duplicado y añadir guard de "última respuesta gana".
- **🔵 B5 — `findClosestBanco` por substring → falsos positivos** ✅ — `matchCuenta.ts:24-29,72-83`: nombres cortos (BOD/BNC/Plaza) pueden hacer match dentro de texto ruidoso del OCR. *Fix:* igualdad exacta para nombres ≤4 chars; `includes` solo para tokens largos.
- **🔵 B6 — `key={i}` en `<Cell>` del PieChart** ✅ — `DashboardCuentas.tsx:74-76`: los colores pueden saltar al cambiar el dataset. *Fix:* `key={d.grupo}`.
- **🔵 B7 — `useNetworkStatus` y `setState` síncrono en effect** ✅ — `useNetworkStatus.ts:25` (también es el único error de `pnpm lint`). Estado inicial `true` ignora `navigator.onLine` hasta el effect → parpadeo del banner offline. *Fix:* init perezoso con `navigator.onLine`.
- **🔵 B8 — `DateRangePicker` propaga rango inválido (to < from)** ✅ — `DateRangePicker.tsx:55-82` muestra error pero igual emite `onChange`, disparando un fetch con `desde>hasta`. *Fix:* no emitir/fetchear si el rango es inválido.

---

## PLAN DE PRUEBAS POR MÓDULO

> Marcar cada caso como ✅ pasa / ❌ falla / ⏭️ N/A. Prioriza los marcados **(regresión de bug)**.

### 1. Autenticación y sesión
- [ ] Login con credenciales válidas → carga empresas y entra al dashboard.
- [ ] Login con credenciales inválidas → mensaje de error claro.
- [ ] Registro: política de contraseña (mín. 8, 3 de 4 categorías) rechaza débiles.
- [ ] Registro de usuario nuevo sin empresa → redirige a `/onboarding` (no flash indebido).
- [ ] Token expirado: una request 401 dispara **un solo** refresh y reintenta; si el refresh falla → redirige a login.
- [ ] Varias requests 401 concurrentes → un solo `POST /auth/refresh` (dedupe).
- [ ] `getMe` con token recién inválido tras login **(borde)**.
- [ ] Logout limpia token, refresh, empresa_id **y** `pagomovil_stats:*` **(regresión A1)**.
- [ ] `X-Empresa-Id` ausente → 400; no numérico (`abc`) → debe ser **400, no 500** **(regresión M3)**.

### 2. Multi-tenant y RBAC (probar con CADA rol: dueno, admin, supervisor, cajero, contador)
- [ ] Usuario de empresa A con `X-Empresa-Id: B` (no miembro) → 403 en todos los endpoints.
- [ ] `PUT/DELETE` de un `pago_id` de la empresa B desde A → 404 (no debe tocar datos ajenos).
- [ ] Crear/editar pago con `cuenta_receptora_id` de otra empresa → **debe rechazar** **(regresión C2)**.
- [ ] Crear pago con `scan_log_id` de otra empresa → `scan_logs` de la otra empresa **no** se modifica **(regresión C4)**.
- [ ] Crear meta `2026-07` en empresa A y luego en B → **ambas deben funcionar** **(regresión C1)**.
- [ ] Cambiar de empresa en el dashboard → **no** se ven cifras de la empresa anterior en ningún frame **(regresión A1)**.
- [ ] Matriz de permisos UI vs backend por rol: qué tabs ve cada rol, qué acciones puede ejecutar; confirmar que la UI no ofrece algo que el backend rechaza (y viceversa). Verificar `supervisor` y los KPIs **(regresión A11)**.
- [ ] Admin intenta cambiar rol del `dueno` → 403; asignar rol `dueno` → 403.
- [ ] **Admin A degrada a Admin B a cajero** → definir política; hoy se permite **(regresión A6)**.
- [ ] Admin se auto-modifica el rol → política definida.

### 3. Pagos — CRUD y validación
- [ ] Crear pago manual válido (todos los campos) → 201 y aparece en la lista.
- [ ] `monto`: 0, negativo, `1e13` (> máx) → 422; `1e12` → OK.
- [ ] `fecha` imposible (`2026-13-40`) y `hora` (`99:99`) pasan el regex → ver si la DB las acepta **(borde)**.
- [ ] `estado` fuera del enum → 422; `PagoUpdate` vacío → 400.
- [ ] Editar pago: cédula guardada sin guion (`V12345678`) precarga bien tipo+número **(regresión M2)**.
- [ ] Transición de estado: revivir un `anulado` a `confirmado` → política definida **(regresión A4)**.
- [ ] Borrar pago sin red / como rol sin permiso → modal se cierra y muestra error **(regresión A3)**.
- [ ] Cambiar estado desde la card con API caída → feedback visible **(regresión A3)**.

### 4. Pagos — filtros, búsqueda, paginación
- [ ] Cargar `/pagos?estado=...&duplicados=true&editados=true&sin_comprobante=true&no_coincidentes=true&desde=...&hasta=...` → todos los chips activos y rango leído de la URL.
- [ ] Modal de filtros: aplicar, limpiar (dropdown estado vuelve a "Todos"), quitar chips uno a uno.
- [ ] Búsqueda por texto (debounce) y por monto exacto (incl. `0.0000001` y enteros grandes) **(regresión M11)**; teclear rápido no muestra resultados de una query anterior **(regresión B4)**.
- [ ] `loadMore` paginando con inserciones/borrados concurrentes → sin keys duplicadas.
- [ ] Cajero: list/exports forzados a hoy; **check-duplicate, /duplicados, update y delete también respetan la restricción** **(regresión A5)**.
- [ ] Supervisor: rango forzado a 7 días.

### 5. Escaneo / OCR
- [ ] Escanear (cámara) y subir (galería) → preview con datos extraídos.
- [ ] Editar monto/cédula/referencia en el preview para que **no** coincidan → el pago queda `comprobante_no_coincidente=true` y aparece en el filtro **(regresión C3)**.
- [ ] Guardar sin tocar nada → `scan_logs.pago_id` enlazado **(regresión C3/C4)**.
- [ ] OCR no detecta banco/cédula → el preview obliga a completarlos (no se envía vacío); error legible si falta **(regresión de la tarea anterior)**.
- [ ] OCR con referencia de 1–3 o 21–40 dígitos → coherencia ScanPreview vs PagoForm **(regresión M1)**.
- [ ] OCR con teléfono ruidoso / >20 chars → normalizado u omitido, no 422 mudo **(regresión M7)**.
- [ ] OCR con banco ruidoso que contenga "BOD"/"BNC"/"Plaza" → no auto-seleccionar banco equivocado **(regresión B5)**.
- [ ] Comprobante con formato VE: monto `1.234,56`, fecha `09/06/2026` → normalizar a número y `YYYY-MM-DD` (hoy puede dar 422).
- [ ] Imagen > límite (`MAX_IMAGE_BYTES`) → 413 con mensaje claro.
- [ ] Gemini sin texto / bloqueado → 502 controlado y `scan_log` en `failed_*` (sin AttributeError).
- [ ] Cuota de scans por minuto: ráfaga concurrente → ver si excede `SCAN_RATE_PER_MIN` (TOCTOU).
- [ ] Cerrar el modal a media subida (backdrop/back Android) **(regresión M8)**.
- [ ] `tasa_correccion` tras corregir un campo escaneado → debe ser >0 (hoy siempre 0) **(regresión M4)**.

### 6. Cuentas receptoras
- [ ] CRUD con validación de cédula/teléfono; editar cuenta con cédula sin guion **(regresión M2)**.
- [ ] Crear cuenta desde ScanPreview → aparece en el `<Select>` de cuenta receptora (invalidación de `cuentas.store`).
- [ ] Cambiar de empresa → `useCuentas` recarga (no muestra cuentas de la anterior).
- [ ] Borrar cuenta con pagos asociados → pagos quedan en "Sin cuenta asignada" (FK SET NULL); borrar id inexistente → 404 deseable.

### 7. Dashboard / estadísticas
- [ ] Cada sección (Resumen, Finanzas, Cuentas, Operaciones) carga sin error.
- [ ] Cambiar rango rápido entre presets con red lenta → datos terminan en el último rango **(regresión A2)**.
- [ ] Ticket promedio por rango = Σmonto/Σpagos del periodo (vs. `promedio_ticket` mensual del Resumen).
- [ ] Breakdown por cuenta agrupa por nombre y "Sin cuenta asignada".
- [ ] Tarjetas de Operaciones (Transacciones, Total scans, Sin comprobante, Duplicados, Editadas, Tiempo promedio) reflejan el rango y navegan a `/pagos?...&desde&hasta`.
- [ ] `duplicados_hoy` y "editadas": confirmar el periodo real que representan **(regresión M5)**.
- [ ] Comparación mes actual vs anterior coherente (criterio confirmado/anulado) **(regresión M6)**.
- [ ] Toggle USD con tasa faltante / `0` / `null` → muestra "—"/Bs, nunca `$ NaN`/`$ ∞` **(regresión A10)**.
- [ ] Cerca de medianoche (TZ VE) "Total hoy" no salta de día 4h antes **(regresión A8)**.

### 8. Exportación
- [ ] CSV/PDF/JSON en web (descarga blob) y Android (Filesystem + Share).
- [ ] CSV con `concepto = "=1+1"` → neutralizado **(regresión A9)**.
- [ ] PDF con >5000 filas → aviso de truncamiento y total correcto **(regresión M10)**.
- [ ] Export con error de backend → mensaje visible (ya cubierto). Acentos correctos (BOM UTF-8).
- [ ] Solo roles con permiso `exportar` (dueno/admin/contador) pueden exportar; cajero/supervisor → 403.

### 9. Configuración, miembros e invitaciones
- [ ] Cambiar rol de miembro (admin): puede asignar supervisor/cajero/contador; no puede tocar dueño **(regresión A6)**.
- [ ] Invitar a un email ya miembro → 400 limpio, no invitación zombie **(regresión B3, M12)**.
- [ ] Aceptar invitación caducada (`expira_en` en el pasado) → debe rechazar **(regresión A7)**.
- [ ] Aceptar dos invitaciones a la misma empresa / ya siendo miembro → 400, no 500 **(regresión M12)**.
- [ ] Crear empresa nº 4 (límite 3) → bloqueado; simular fallo entre inserts → sin empresa huérfana **(regresión M12)**.
- [ ] Editar perfil/empresa; cambiar tema/fuente (persistencia tras recargar; StatusBar en Android).

### 10. Transversal (Capacitor / Android / red)
- [ ] Botón atrás físico cierra overlays uno a uno; overlays anidados no se cierran en cascada.
- [ ] Offline: banner sin parpadeo; reintentos al volver la red.
- [ ] Hash router: deep-links (`#/pagos?...`) funcionan desde `file://`.
- [ ] Permisos de cámara/galería denegados → manejo claro.

---

## Verificado que está BIEN (no tocar)
- Dedupe de `refreshSession` (`auth.service.ts`).
- Mapeo de la mayoría de permisos `usePermissions` ↔ `rbac.py` (salvo el gating de tabs de A11).
- `update_pago`/`delete_pago`/`resolver` **sí** filtran por `empresa_id` (solo `create`→`scan_logs` no, ver C4).
- `comprobante_no_coincidente` no es seteable desde el cliente (ausente de los schemas).
- Claves de caché de stats incluyen `empresa_id` (el problema de A1 es el estado del hook, no las claves).

## Siguientes pasos sugeridos
1. **Arreglar los 🔴 + 🟠 de seguridad/datos** (C1–C4, A6, A7, A5) — son los de mayor riesgo.
2. **Añadir tests automatizados:** pytest para `rbac.py`/validación de schemas/funciones SQL (ya existe `server/tests/test_schemas.py` como base); Vitest + React Testing Library para hooks críticos (`useDashboardStats`, `usePermissions`) y validadores.
3. **Suite e2e** (Playwright) para los flujos de regresión marcados arriba.
