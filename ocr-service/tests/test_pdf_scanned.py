import pytest
from PIL import Image

from conftest import motivo_tesseract_ausente, tesseract_disponivel


def test_pdf_escaneado_via_tesseract(client, fixtures_dir):
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    with open(fixtures_dir / 'contrato-escaneado.pdf', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato-escaneado.pdf', f, 'application/pdf')}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data['success'] is True
    assert data['document_type'] == 'pdf'
    assert data['origin'] == 'scanned'
    # OCR real: o texto do contrato precisa ser reconhecido de verdade.
    assert len(data['text'].strip()) >= 30
    # Confianca so se existir de forma real (numerica 0-100) ou null.
    conf = data['confidence']
    assert conf is None or (isinstance(conf, (int, float)) and 0 <= conf <= 100)


def test_rasterizacao_propria_le_pdf_escaneado(client, fixtures_dir):
    """O caminho principal (pypdfium2 + binarizacao) le o PDF sem cair no fallback."""
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    with open(fixtures_dir / 'contrato-escaneado.pdf', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato-escaneado.pdf', f, 'application/pdf')}
        )
    data = resp.json()
    assert len(data['text'].strip()) >= 30
    # Sem aviso de fallback => a rasterizacao propria resolveu o documento.
    assert not any('embutidas' in w for w in data['warnings'])
    # Confianca real do Tesseract foi computada no caminho de rasterizacao.
    assert isinstance(data['confidence'], (int, float))
    assert 0 <= data['confidence'] <= 100
    # Campos reais extraidos do texto reconhecido.
    assert data['fields']['cpf_cnpj'] == '529.982.247-25'
    assert data['fields']['numero_contrato'] == 'CTR-2026-001'


def test_fallback_imagens_embutidas(client, fixtures_dir, monkeypatch):
    """Se a rasterizacao falhar, o fallback de /XObject /Image ainda le o PDF."""
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    import app.services.ocr_service as svc

    monkeypatch.setattr(svc, 'rasterize_pdf_pages', lambda *a, **k: [])
    with open(fixtures_dir / 'contrato-escaneado.pdf', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato-escaneado.pdf', f, 'application/pdf')}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data['origin'] == 'scanned'
    assert len(data['text'].strip()) >= 30
    assert any('embutidas' in w for w in data['warnings'])
    assert data['fields']['cpf_cnpj'] == '529.982.247-25'


def test_pdf_escaneado_multiplas_paginas(client, fixtures_dir, tmp_path):
    """Rasterizacao + OCR de um PDF escaneado com mais de uma pagina."""
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())

    # Monta um PDF de 2 paginas de imagem a partir de fixtures reais existentes.
    img1 = Image.open(fixtures_dir / 'contrato.jpg').convert('RGB')
    img2 = Image.open(fixtures_dir / 'contrato.png').convert('RGB')
    multi = tmp_path / 'contrato-2-paginas.pdf'
    img1.save(multi, save_all=True, append_images=[img2], format='PDF')

    with open(multi, 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato-2-paginas.pdf', f, 'application/pdf')}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data['origin'] == 'scanned'
    assert data['pages'] == 2
    assert len(data['text'].strip()) >= 30
