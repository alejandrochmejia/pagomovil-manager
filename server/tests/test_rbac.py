from rbac import has_permission, can_change_role


def test_cajero_permissions():
    assert has_permission("cajero", "scan")
    assert has_permission("cajero", "pagos_crear")
    assert not has_permission("cajero", "pagos_eliminar")
    assert not has_permission("cajero", "gestion_usuarios")


def test_contador_es_solo_lectura():
    assert has_permission("contador", "pagos_ver_all")
    assert has_permission("contador", "exportar")
    assert not has_permission("contador", "pagos_crear")
    assert not has_permission("contador", "scan")


def test_dueno_es_inmutable_y_no_asignable():
    # Nadie puede cambiar el rol de un dueno...
    assert not can_change_role("admin", "dueno", "cajero")
    # ...ni asignar el rol dueno a nadie.
    assert not can_change_role("dueno", "admin", "dueno")


def test_jerarquia_de_gestion_de_roles():
    assert can_change_role("admin", "cajero", "supervisor")
    assert can_change_role("dueno", "supervisor", "contador")
    # un cajero no gestiona roles
    assert not can_change_role("cajero", "cajero", "supervisor")
