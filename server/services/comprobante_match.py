import re


def _digits(value) -> str:
    """Devuelve solo los dígitos de un valor (sirve para referencia y cédula)."""
    if value is None:
        return ""
    return re.sub(r"\D", "", str(value))


def _to_float(value) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def compare_scan_to_pago(extraidos: dict, pago: dict) -> tuple[bool, list[str]]:
    """Compara los datos del pagador extraídos por IA del comprobante contra los
    datos registrados del pago. Devuelve (no_coincide, campos_mismatch).

    Reglas (confirmadas con producto):
    - Disparan la marca de no-coincidencia: referencia, monto y cédula del pagador.
    - banco/fecha NO disparan el flag (son solo informativos -> no se evalúan aquí).
    - Un campo solo se compara si AMBOS lados tienen valor (lo que el OCR no
      extrajo no cuenta como mismatch, para evitar falsos positivos).
    - Monto: tolerancia relativa del 1% (comisión bancaria / redondeo del OCR).
    """
    mismatch: list[str] = []

    ref_scan = _digits(extraidos.get("referencia"))
    ref_pago = _digits(pago.get("referencia"))
    if ref_scan and ref_pago and ref_scan != ref_pago:
        mismatch.append("referencia")

    monto_scan = _to_float(extraidos.get("monto"))
    monto_pago = _to_float(pago.get("monto"))
    if monto_scan is not None and monto_pago is not None:
        if abs(monto_scan - monto_pago) > 0.01 * max(monto_scan, monto_pago, 1.0):
            mismatch.append("monto")

    ced_scan = _digits(extraidos.get("cedula"))
    ced_pago = _digits(pago.get("cedula"))
    if ced_scan and ced_pago and ced_scan != ced_pago:
        mismatch.append("cedula")

    return (len(mismatch) > 0, mismatch)
