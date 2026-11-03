import pytest

from app.config import settings
from conftest import motivo_tesseract_ausente, tesseract_disponivel


def test_arquivo_invalido_txt(client, fixtures_dir):
    with open(fixtures_dir / 'nao-e-documento.txt', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('nao-e-documento.txt', f, 'text/plain')}
        )
    # text/plain e rejeitado pelo MIME antes da extensao.
    assert resp.status_code in (400, 415)


def test_arquivo_invalido_extensao(client, fixtures_dir):
    with open(fixtures_dir / 'contrato.jpg', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato.exe', f, 'image/jpeg')}
        )
    assert resp.status_code == 400


def test_arquivo_grande(client, fixtures_dir):
    # grande.jpg tem ~14MB, acima do padrao de 10MB.
    with open(fixtures_dir / 'grande.jpg', 'rb') as f:
        resp = client.post('/ocr/extract', files={'file': ('grande.jpg', f, 'image/jpeg')})
    assert resp.status_code == 413


def test_pdf_acima_do_limite_de_paginas(client, fixtures_dir, monkeypatch):
    monkeypatch.setattr(settings, 'ocr_max_pdf_pages', 5)
    with open(fixtures_dir / 'contrato-30-paginas.pdf', 'rb') as f:
        resp = client.post(
            '/ocr/extract',
            files={'file': ('contrato-30-paginas.pdf', f, 'application/pdf')},
        )
    assert resp.status_code == 400
    assert 'paginas' in resp.json()['detail']


def test_mimetype_nao_suportado(client, fixtures_dir):
    with open(fixtures_dir / 'contrato.jpg', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato.html', f, 'text/html')}
        )
    assert resp.status_code == 415


def test_idioma_ocr_ausente(client, fixtures_dir, monkeypatch):
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    monkeypatch.setattr(settings, 'ocr_language', 'idioma_inexistente_xyz')
    with open(fixtures_dir / 'contrato.jpg', 'rb') as f:
        resp = client.post('/ocr/extract', files={'file': ('contrato.jpg', f, 'image/jpeg')})
    assert resp.status_code == 503
    assert 'idioma' in resp.json()['detail'].lower()
