from services.comprobante_match import compare_scan_to_pago


def _scan(**kw):
    base = {"monto": 100.0, "referencia": "123456789", "cedula": "V-12345678"}
    base.update(kw)
    return base


def _pago(**kw):
    base = {"monto": 100.0, "referencia": "123456789", "cedula": "V-12345678"}
    base.update(kw)
    return base


def test_match_exacto():
    no_coincide, campos = compare_scan_to_pago(_scan(), _pago())
    assert no_coincide is False
    assert campos == []


def test_monto_dentro_de_tolerancia_1pct():
    # 100 vs 100.5 -> 0.5% <= 1% -> coincide
    no_coincide, campos = compare_scan_to_pago(_scan(monto=100.0), _pago(monto=100.5))
    assert no_coincide is False


def test_monto_fuera_de_tolerancia():
    # 100 vs 105 -> 5% > 1% -> no coincide
    no_coincide, campos = compare_scan_to_pago(_scan(monto=100.0), _pago(monto=105.0))
    assert no_coincide is True
    assert "monto" in campos


def test_cedula_ignora_prefijo():
    # V-12345678 vs J-12345678 -> mismos dígitos -> coincide
    no_coincide, _ = compare_scan_to_pago(_scan(cedula="V-12345678"), _pago(cedula="J-12345678"))
    assert no_coincide is False


def test_cedula_distinta():
    no_coincide, campos = compare_scan_to_pago(_scan(cedula="V-12345678"), _pago(cedula="V-87654321"))
    assert no_coincide is True
    assert "cedula" in campos


def test_referencia_solo_digitos():
    # "REF-123 456" vs "123456" -> mismos dígitos -> coincide
    no_coincide, _ = compare_scan_to_pago(_scan(referencia="REF-123 456"), _pago(referencia="123456"))
    assert no_coincide is False


def test_referencia_distinta():
    no_coincide, campos = compare_scan_to_pago(_scan(referencia="111"), _pago(referencia="222"))
    assert no_coincide is True
    assert "referencia" in campos


def test_campo_ocr_ausente_no_es_mismatch():
    # El OCR no extrajo referencia ni cédula -> no debe marcar mismatch por ellos.
    no_coincide, campos = compare_scan_to_pago(
        {"monto": 100.0, "referencia": None, "cedula": None}, _pago()
    )
    assert no_coincide is False
    assert campos == []


def test_banco_y_fecha_no_disparan_flag():
    # Aunque difieran banco y fecha, no se evalúan -> coincide.
    no_coincide, campos = compare_scan_to_pago(
        _scan(banco="Banesco", fecha="2026-01-01"),
        _pago(banco="BDV", fecha="2026-06-08"),
    )
    assert no_coincide is False


def test_multiple_mismatch():
    no_coincide, campos = compare_scan_to_pago(
        _scan(monto=100.0, referencia="111", cedula="V-1"),
        _pago(monto=200.0, referencia="222", cedula="V-2"),
    )
    assert no_coincide is True
    assert set(campos) == {"monto", "referencia", "cedula"}
