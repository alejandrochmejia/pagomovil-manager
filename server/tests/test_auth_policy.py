from routers.auth import _password_meets_policy


def test_acepta_contrasenas_validas():
    assert _password_meets_policy("Abcd1234")   # min/may/num
    assert _password_meets_policy("abcD!xyz")    # min/may/simbolo


def test_rechaza_contrasenas_debiles():
    assert not _password_meets_policy("short1")        # < 8 caracteres
    assert not _password_meets_policy("alllowercase")  # 1 sola categoria
    assert not _password_meets_policy("12345678")      # 1 sola categoria
