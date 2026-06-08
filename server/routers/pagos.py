import base64
import csv
import io
import json
import re
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from config import (
    supabase,
    COMPROBANTES_BUCKET,
    SIGNED_URL_TTL,
    MAX_IMAGE_MB,
    MAX_IMAGE_BYTES,
)
from rbac import require_permission, get_user_with_role
from schemas.pago import PagoCreate, PagoUpdate
from services.pdf_export import generate_pagos_pdf

PDF_MAX_ROWS = 5000

router = APIRouter(prefix="/pagos", tags=["pagos"])


_DATA_URI_RE = re.compile(r"^data:image/(?P<ext>jpeg|jpg|png|webp);base64,(?P<data>.+)$", re.IGNORECASE)


def _upload_comprobante(empresa_id: int, data_uri: str) -> str:
    """Decodifica un data URI y sube la imagen al bucket privado `comprobantes`.
    Devuelve el path dentro del bucket (no una URL). Si el formato no coincide,
    devuelve el valor original sin tocarlo."""
    m = _DATA_URI_RE.match(data_uri)
    if not m:
        return data_uri
    ext = m.group("ext").lower()
    if ext == "jpg":
        ext = "jpeg"
    try:
        raw = base64.b64decode(m.group("data"), validate=True)
    except Exception:
        return data_uri
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"La imagen del comprobante supera el limite de {MAX_IMAGE_MB:g} MB",
        )
    path = f"empresa_{empresa_id}/{uuid.uuid4().hex}.{ext}"
    supabase.storage.from_(COMPROBANTES_BUCKET).upload(
        path,
        raw,
        file_options={"content-type": f"image/{ext}", "upsert": "false"},
    )
    return path


def _comprobante_path(value: str | None) -> str | None:
    """Si `value` apunta a un objeto del bucket `comprobantes`, devuelve su path
    interno; None si no requiere firma (data URI inline, ruta de dispositivo,
    nulo o URL externa)."""
    if not value:
        return None
    public_marker = f"/object/public/{COMPROBANTES_BUCKET}/"
    if public_marker in value:  # URL publica legacy -> extraer path
        return value.split(public_marker, 1)[1].split("?", 1)[0].lstrip("/")
    sign_marker = f"/object/sign/{COMPROBANTES_BUCKET}/"
    if sign_marker in value:  # ya venia firmada -> re-firmar el mismo path
        return value.split(sign_marker, 1)[1].split("?", 1)[0].lstrip("/")
    if value.startswith(("data:", "capacitor://", "http://", "https://")):
        return None
    return value.lstrip("/")  # path crudo dentro del bucket


def _sign_comprobantes_in_place(items: list[dict]) -> None:
    """Reemplaza imagen_uri por una URL firmada de corta duracion para las filas
    cuyo comprobante vive en Storage. Las imagenes inline y rutas de dispositivo
    se dejan intactas. Hace una sola llamada batch a Storage por pagina."""
    index: dict[str, list[dict]] = {}
    for item in items:
        path = _comprobante_path(item.get("imagen_uri"))
        if path:
            index.setdefault(path, []).append(item)
    if not index:
        return
    try:
        signed = supabase.storage.from_(COMPROBANTES_BUCKET).create_signed_urls(
            list(index.keys()), SIGNED_URL_TTL
        )
    except Exception:
        return  # ante un fallo de Storage dejamos el valor original
    for entry in signed:
        if entry.get("error"):
            continue
        url = entry.get("signedURL") or entry.get("signedUrl")
        key = (entry.get("path") or "").lstrip("/")
        for item in index.get(key, []):
            item["imagen_uri"] = url

EXPORT_PAGE_SIZE = 500
EXPORT_COLUMNS = [
    "id", "fecha", "hora", "monto", "banco", "cedula", "telefono",
    "referencia", "concepto", "estado", "origen", "cuenta_receptora_id",
    "creado_en", "actualizado_en",
]


def _audit(tabla: str, registro_id: int, accion: str, empresa_id: int, cambios: dict | None = None):
    supabase.table("audit_log").insert({
        "tabla": tabla,
        "registro_id": registro_id,
        "accion": accion,
        "empresa_id": empresa_id,
        "cambios": json.loads(json.dumps(cambios)) if cambios else None,
    }).execute()


def _sanitize_search(q: str) -> str:
    # Strip PostgREST-significant chars to prevent filter injection
    return re.sub(r"[,()*\\]", "", q).strip()[:100]


def _constrain_dates_by_role(rol: str, desde: str | None, hasta: str | None) -> tuple[str | None, str | None]:
    today = date.today().isoformat()
    if rol == "cajero":
        return today, today
    if rol == "supervisor":
        min_date = (date.today() - timedelta(days=7)).isoformat()
        if not desde or desde < min_date:
            desde = min_date
        if not hasta or hasta > today:
            hasta = today
    return desde, hasta


def _apply_filters(query, desde: str | None, hasta: str | None, q: str | None):
    if desde:
        query = query.gte("fecha", desde)
    if hasta:
        query = query.lte("fecha", hasta)
    if q:
        term = _sanitize_search(q)
        if term:
            filters = [
                f"banco.ilike.*{term}*",
                f"cedula.ilike.*{term}*",
                f"referencia.ilike.*{term}*",
                f"concepto.ilike.*{term}*",
                f"telefono.ilike.*{term}*",
            ]
            try:
                monto_val = float(term)
                filters.append(f"monto.eq.{monto_val}")
            except ValueError:
                pass
            query = query.or_(",".join(filters))
    return query


@router.get("/duplicados")
async def list_duplicados(ctx: dict = Depends(get_user_with_role)):
    empresa_id = ctx["empresa_id"]
    res = supabase.rpc("get_pagos_duplicados", {"p_empresa_id": empresa_id}).execute()
    pagos = res.data or []
    groups: dict[tuple[str, str], list[dict]] = {}
    order: list[tuple[str, str]] = []
    for p in pagos:
        key = (p.get("banco") or "", p.get("referencia") or "")
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(p)
    return [
        {
            "banco": k[0],
            "referencia": k[1],
            "cantidad": len(groups[k]),
            "pagos": groups[k],
        }
        for k in order
    ]


@router.get("/check-duplicate")
async def check_duplicate(
    referencia: str = Query(..., min_length=1, max_length=64),
    monto: float | None = Query(None, gt=0),
    fecha: str | None = Query(None),
    cedula: str | None = Query(None, max_length=32),
    ctx: dict = Depends(get_user_with_role),
):
    empresa_id = ctx["empresa_id"]
    select_cols = "id, monto, banco, referencia, fecha, hora, cedula, creado_en"
    matches: list[dict] = []
    seen_ids: set[int] = set()

    ref_clean = referencia.strip()
    if ref_clean:
        res = (
            supabase.table("pagos")
            .select(select_cols)
            .eq("empresa_id", empresa_id)
            .eq("referencia", ref_clean)
            .limit(5)
            .execute()
        )
        for row in res.data or []:
            row["match_type"] = "referencia"
            matches.append(row)
            seen_ids.add(row["id"])

    if monto is not None and fecha and cedula:
        cedula_clean = cedula.strip()
        if cedula_clean:
            res = (
                supabase.table("pagos")
                .select(select_cols)
                .eq("empresa_id", empresa_id)
                .eq("fecha", fecha)
                .eq("cedula", cedula_clean)
                .eq("monto", monto)
                .limit(5)
                .execute()
            )
            for row in res.data or []:
                if row["id"] in seen_ids:
                    continue
                row["match_type"] = "monto_fecha_cedula"
                matches.append(row)
                seen_ids.add(row["id"])

    return {"duplicate": len(matches) > 0, "matches": matches}


_ESTADOS_VALIDOS = {"confirmado", "pendiente", "rechazado", "anulado"}


@router.get("")
async def list_pagos(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    q: str | None = Query(None),
    sin_comprobante: bool = Query(False),
    estado: str | None = Query(None),
    duplicados: bool = Query(False),
    editados: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    ctx: dict = Depends(get_user_with_role),
):
    desde, hasta = _constrain_dates_by_role(ctx["rol"], desde, hasta)
    start = (page - 1) * page_size
    end = start + page_size - 1
    empresa_id = ctx["empresa_id"]

    restricted_ids: list[int] | None = None
    if duplicados:
        dup_res = supabase.rpc("get_pagos_duplicados", {"p_empresa_id": empresa_id}).execute()
        restricted_ids = [row["id"] for row in (dup_res.data or [])]
    if editados:
        ed_res = supabase.rpc("get_pagos_editados_ids", {"p_empresa_id": empresa_id}).execute()
        ed_ids = [row if isinstance(row, int) else row.get("get_pagos_editados_ids") for row in (ed_res.data or [])]
        ed_ids = [i for i in ed_ids if i is not None]
        restricted_ids = list(set(restricted_ids) & set(ed_ids)) if restricted_ids is not None else ed_ids
    if restricted_ids is not None and not restricted_ids:
        return {"items": [], "total": 0, "page": page, "page_size": page_size, "has_more": False}

    query = (
        supabase.table("pagos")
        .select("*", count="exact")
        .eq("empresa_id", empresa_id)
        .order("fecha", desc=True)
        .order("id", desc=True)
    )
    query = _apply_filters(query, desde, hasta, q)
    if sin_comprobante:
        query = query.or_("imagen_uri.is.null,imagen_uri.like.capacitor://*")
    if estado and estado in _ESTADOS_VALIDOS:
        query = query.eq("estado", estado)
    if restricted_ids is not None:
        query = query.in_("id", restricted_ids)

    res = query.range(start, end).execute()
    total = res.count or 0
    items = res.data or []
    _sign_comprobantes_in_place(items)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (start + len(items)) < total,
    }


@router.get("/export.json")
async def export_pagos_json(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    q: str | None = Query(None),
    ctx: dict = Depends(require_permission("exportar")),
):
    desde, hasta = _constrain_dates_by_role(ctx["rol"], desde, hasta)
    empresa_id = ctx["empresa_id"]

    def row_iter():
        yield "[\n"
        page = 1
        first = True
        while True:
            start = (page - 1) * EXPORT_PAGE_SIZE
            end = start + EXPORT_PAGE_SIZE - 1
            query = (
                supabase.table("pagos")
                .select(",".join(EXPORT_COLUMNS))
                .eq("empresa_id", empresa_id)
                .order("fecha", desc=True)
                .order("id", desc=True)
            )
            query = _apply_filters(query, desde, hasta, q)
            res = query.range(start, end).execute()
            rows = res.data or []
            if not rows:
                break
            buf_parts: list[str] = []
            for row in rows:
                serialized = json.dumps(row, default=str, ensure_ascii=False)
                if first:
                    buf_parts.append(f"  {serialized}")
                    first = False
                else:
                    buf_parts.append(f",\n  {serialized}")
            yield "".join(buf_parts)
            if len(rows) < EXPORT_PAGE_SIZE:
                break
            page += 1
        yield "\n]\n"

    filename = f"pagos-{datetime.now().strftime('%Y-%m-%d-%H%M')}.json"
    return StreamingResponse(
        row_iter(),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export.csv")
async def export_pagos_csv(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    q: str | None = Query(None),
    ctx: dict = Depends(require_permission("exportar")),
):
    desde, hasta = _constrain_dates_by_role(ctx["rol"], desde, hasta)
    empresa_id = ctx["empresa_id"]

    def row_iter():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(EXPORT_COLUMNS)
        # UTF-8 BOM (﻿) for Excel compatibility with accented chars
        yield "﻿" + buf.getvalue()

        page = 1
        while True:
            start = (page - 1) * EXPORT_PAGE_SIZE
            end = start + EXPORT_PAGE_SIZE - 1
            query = (
                supabase.table("pagos")
                .select(",".join(EXPORT_COLUMNS))
                .eq("empresa_id", empresa_id)
                .order("fecha", desc=True)
                .order("id", desc=True)
            )
            query = _apply_filters(query, desde, hasta, q)
            res = query.range(start, end).execute()
            rows = res.data or []
            if not rows:
                break

            chunk = io.StringIO()
            chunk_writer = csv.writer(chunk)
            for row in rows:
                chunk_writer.writerow([row.get(col, "") if row.get(col) is not None else "" for col in EXPORT_COLUMNS])
            yield chunk.getvalue()

            if len(rows) < EXPORT_PAGE_SIZE:
                break
            page += 1

    filename = f"pagos-{datetime.now().strftime('%Y-%m-%d-%H%M')}.csv"
    return StreamingResponse(
        row_iter(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/export.pdf")
async def export_pagos_pdf(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    q: str | None = Query(None),
    ctx: dict = Depends(require_permission("exportar")),
):
    desde, hasta = _constrain_dates_by_role(ctx["rol"], desde, hasta)
    empresa_id = ctx["empresa_id"]

    emp_res = (
        supabase.table("empresas")
        .select("nombre")
        .eq("id", empresa_id)
        .limit(1)
        .execute()
    )
    empresa_name = emp_res.data[0]["nombre"] if emp_res.data else ""

    items: list[dict] = []
    page = 1
    truncated = False
    while True:
        start = (page - 1) * EXPORT_PAGE_SIZE
        end = start + EXPORT_PAGE_SIZE - 1
        query = (
            supabase.table("pagos")
            .select(",".join(EXPORT_COLUMNS))
            .eq("empresa_id", empresa_id)
            .order("fecha", desc=True)
            .order("id", desc=True)
        )
        query = _apply_filters(query, desde, hasta, q)
        res = query.range(start, end).execute()
        rows = res.data or []
        if not rows:
            break
        items.extend(rows)
        if len(items) >= PDF_MAX_ROWS:
            items = items[:PDF_MAX_ROWS]
            truncated = True
            break
        if len(rows) < EXPORT_PAGE_SIZE:
            break
        page += 1

    if truncated:
        # Marcar truncamiento agregando un item ficticio? No, mejor pasar a la metadata.
        pass

    pdf_bytes = generate_pagos_pdf(
        items,
        {"from": desde, "to": hasta} if (desde or hasta) else None,
        empresa_name,
    )
    filename = f"pagos-{datetime.now().strftime('%Y-%m-%d-%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", status_code=201)
async def create_pago(
    pago: PagoCreate,
    background: BackgroundTasks,
    ctx: dict = Depends(require_permission("pagos_crear")),
):
    empresa_id = ctx["empresa_id"]
    scan_log_id = pago.scan_log_id
    data = pago.model_dump(exclude_none=True)
    data.pop("scan_log_id", None)
    data["empresa_id"] = empresa_id
    imagen_uri = data.get("imagen_uri")
    if imagen_uri and imagen_uri.startswith("data:image/"):
        try:
            data["imagen_uri"] = _upload_comprobante(empresa_id, imagen_uri)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"No se pudo subir el comprobante: {e}")
    res = supabase.table("pagos").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="No se pudo crear el pago")
    created = res.data[0]
    if scan_log_id:
        supabase.table("scan_logs").update({"pago_id": created["id"]}).eq("id", scan_log_id).execute()
    background.add_task(_audit, "pagos", created["id"], "crear", empresa_id)
    _sign_comprobantes_in_place([created])
    return created


@router.put("/{pago_id}")
async def update_pago(
    pago_id: int,
    pago: PagoUpdate,
    background: BackgroundTasks,
    ctx: dict = Depends(require_permission("pagos_editar")),
):
    empresa_id = ctx["empresa_id"]
    data = pago.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = supabase.table("pagos").update(data).eq("id", pago_id).eq("empresa_id", empresa_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    background.add_task(_audit, "pagos", pago_id, "editar", empresa_id, data)
    return res.data[0]


@router.delete("/{pago_id}", status_code=204)
async def delete_pago(
    pago_id: int,
    background: BackgroundTasks,
    ctx: dict = Depends(require_permission("pagos_eliminar")),
):
    empresa_id = ctx["empresa_id"]
    res = supabase.table("pagos").delete().eq("id", pago_id).eq("empresa_id", empresa_id).execute()
    if res.data:
        background.add_task(_audit, "pagos", pago_id, "eliminar", empresa_id)
