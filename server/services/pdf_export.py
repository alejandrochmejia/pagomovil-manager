import io
from datetime import datetime
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PRIMARY_RGB = (0.145, 0.388, 0.922)  # azul primario aprox #2563eb
HEADER_HEIGHT = 60
FOOTER_HEIGHT = 30


def _format_bs(value) -> str:
    try:
        d = Decimal(str(value))
    except Exception:
        return "Bs. 0,00"
    # Estilo venezolano: punto miles, coma decimal
    formatted = f"{d:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"Bs. {formatted}"


def _draw_logo(canvas, x: float, y: float, radius: float = 14):
    """Dibuja un círculo con texto 'Bs' como logo del sistema."""
    canvas.setFillColorRGB(1, 1, 1)
    canvas.setStrokeColorRGB(1, 1, 1)
    canvas.circle(x, y, radius, stroke=False, fill=True)
    canvas.setFillColorRGB(*PRIMARY_RGB)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawCentredString(x, y - 4, "Bs")


def _make_header_drawer(empresa_name: str, date_range: dict | None):
    def draw(canvas, doc):
        canvas.saveState()
        width, height = letter

        # Banda superior con color primario
        canvas.setFillColorRGB(*PRIMARY_RGB)
        canvas.rect(0, height - HEADER_HEIGHT, width, HEADER_HEIGHT, fill=True, stroke=False)

        # Logo
        _draw_logo(canvas, x=40, y=height - 30, radius=14)

        # Título y empresa
        canvas.setFillColorRGB(1, 1, 1)
        canvas.setFont("Helvetica-Bold", 14)
        canvas.drawString(65, height - 26, "Pago Movil Manager")
        if empresa_name:
            canvas.setFont("Helvetica", 9)
            canvas.drawString(65, height - 40, empresa_name)

        # Información del lado derecho: rango y timestamp
        canvas.setFont("Helvetica", 9)
        if date_range and (date_range.get("from") or date_range.get("to")):
            desde = date_range.get("from") or "—"
            hasta = date_range.get("to") or "—"
            canvas.drawRightString(width - 40, height - 26, f"Periodo: {desde}  a  {hasta}")
        canvas.drawRightString(
            width - 40,
            height - 40,
            f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        )

        # Footer con número de página
        canvas.setFillColorRGB(0.4, 0.4, 0.4)
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(width / 2, 18, f"Pagina {doc.page}")

        canvas.restoreState()

    return draw


def generate_pagos_pdf(
    items: list[dict],
    date_range: dict | None,
    empresa_name: str,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=HEADER_HEIGHT + 16,
        bottomMargin=FOOTER_HEIGHT,
        leftMargin=30,
        rightMargin=30,
        title="Reporte de Pagos",
    )

    base_styles = getSampleStyleSheet()
    cell_style = ParagraphStyle(
        "cell",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
    )
    summary_style = ParagraphStyle(
        "summary",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )

    total_count = len(items)
    total_amount = Decimal("0")
    confirmados = 0
    for item in items:
        if item.get("estado") == "confirmado":
            confirmados += 1
            try:
                total_amount += Decimal(str(item.get("monto") or 0))
            except Exception:
                pass

    story: list = []
    summary_html = (
        f"<b>{total_count}</b> pagos en el rango "
        f"&middot; <b>{confirmados}</b> confirmados "
        f"&middot; Total confirmado: <b>{_format_bs(total_amount)}</b>"
    )
    story.append(Paragraph(summary_html, summary_style))
    story.append(Spacer(1, 10))

    if not items:
        empty_style = ParagraphStyle(
            "empty",
            parent=base_styles["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#94a3b8"),
            alignment=1,
        )
        story.append(Spacer(1, 20))
        story.append(Paragraph("Sin pagos en el rango seleccionado.", empty_style))
    else:
        headers = ["Fecha", "Monto", "Banco", "Cedula", "Referencia", "Concepto"]
        rows: list[list] = [headers]
        for item in items:
            fecha = item.get("fecha", "")
            hora = item.get("hora")
            fecha_cell = f"{fecha}\n{hora}" if hora else str(fecha)
            rows.append([
                Paragraph(fecha_cell.replace("\n", "<br/>"), cell_style),
                _format_bs(item.get("monto", 0)),
                Paragraph(str(item.get("banco") or ""), cell_style),
                Paragraph(str(item.get("cedula") or ""), cell_style),
                Paragraph(str(item.get("referencia") or ""), cell_style),
                Paragraph(str(item.get("concepto") or ""), cell_style),
            ])

        col_widths = [55, 75, 90, 70, 95, 130]
        table = Table(rows, repeatRows=1, colWidths=col_widths)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
        ]))
        story.append(table)

    drawer = _make_header_drawer(empresa_name, date_range)
    doc.build(story, onFirstPage=drawer, onLaterPages=drawer)
    return buf.getvalue()
