import json

from services.gemini import normalize_montos, clean_json_response, parse_scan_result


def test_normalize_montos_desde_total():
    monto, comision, total = normalize_montos({"montoTotal": 110, "comision": 10})
    assert monto == 100 and total == 110


def test_normalize_montos_desde_monto():
    monto, comision, total = normalize_montos({"monto": 100, "comision": 5})
    assert total == 105


def test_clean_json_response_quita_fences():
    assert clean_json_response('```json\n{"a":1}\n```') == '{"a":1}'


def test_parse_scan_result_referencia_a_string():
    raw = json.dumps({"monto": 50, "banco": "BDV", "referencia": 12345})
    r = parse_scan_result(raw)
    assert r.monto == 50
    assert r.referencia == "12345"
