import pytest
from pydantic import ValidationError

from schemas.pago import PagoCreate


def _base(**over):
    data = dict(monto=10, banco="BDV", cedula="V-12345678", fecha="2026-06-08", referencia="123")
    data.update(over)
    return data


def test_pago_valido():
    p = PagoCreate(**_base(hora="14:30", estado="anulado"))
    assert p.estado == "anulado"
    assert p.origen == "manual"


@pytest.mark.parametrize("over", [
    {"monto": 0},
    {"monto": -5},
    {"estado": "loquesea"},
    {"fecha": "08/06/2026"},
    {"hora": "2pm"},
])
def test_pago_invalido(over):
    with pytest.raises(ValidationError):
        PagoCreate(**_base(**over))
