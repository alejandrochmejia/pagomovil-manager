from routers.pagos import _comprobante_path, _sanitize_search


def test_comprobante_path_preserva_inline_y_dispositivo():
    assert _comprobante_path(None) is None
    assert _comprobante_path("data:image/jpeg;base64,AAAA") is None
    assert _comprobante_path("capacitor://localhost/_capacitor_file_/x.jpg") is None


def test_comprobante_path_firma_paths_y_urls_publicas():
    assert _comprobante_path("empresa_1/abc.jpeg") == "empresa_1/abc.jpeg"
    public = "https://x.supabase.co/storage/v1/object/public/comprobantes/empresa_2/z.png"
    assert _comprobante_path(public) == "empresa_2/z.png"


def test_sanitize_search_evita_inyeccion_y_acota():
    assert _sanitize_search("a,b(c)*d\\e") == "abcde"
    assert len(_sanitize_search("x" * 500)) == 100
