import pytest

from conftest import motivo_tesseract_ausente, tesseract_disponivel

CAMPOS_ESPERADOS = {
    'cliente_nome',
    'cpf_cnpj',
    'numero_contrato',
    'valor_total',
    'quantidade_parcelas',
    'valor_parcela',
    'data_inicio',
    'data_fim',
    'forma_pagamento',
    'vencimentos',
    'juros',
    'multa',
}


def _assert_resposta_imagem(resp):
    assert resp.status_code == 200
    data = resp.json()
    assert data['success'] is True
    assert data['document_type'] == 'image'
    assert data['origin'] == 'scanned'
    assert data['pages'] == 1
    assert isinstance(data['text'], str)
    assert isinstance(data['warnings'], list)
    assert set(data['fields'].keys()) == CAMPOS_ESPERADOS
    # Confianca so existe se for real (numerica, 0-100) ou null.
    conf = data['confidence']
    assert conf is None or (isinstance(conf, (int, float)) and 0 <= conf <= 100)
    return data


def test_ocr_jpg(client, fixtures_dir):
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    with open(fixtures_dir / 'contrato.jpg', 'rb') as f:
        resp = client.post('/ocr/extract', files={'file': ('contrato.jpg', f, 'image/jpeg')})
    data = _assert_resposta_imagem(resp)
    assert len(data['text'].strip()) > 0


def test_ocr_png(client, fixtures_dir):
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    with open(fixtures_dir / 'contrato.png', 'rb') as f:
        resp = client.post('/ocr/extract', files={'file': ('contrato.png', f, 'image/png')})
    data = _assert_resposta_imagem(resp)
    assert len(data['text'].strip()) > 0


def test_confianca_nao_inventada(client, fixtures_dir):
    if not tesseract_disponivel():
        pytest.skip(motivo_tesseract_ausente())
    with open(fixtures_dir / 'contrato.jpg', 'rb') as f:
        resp = client.post('/ocr/extract', files={'file': ('contrato.jpg', f, 'image/jpeg')})
    conf = resp.json()['confidence']
    assert conf is None or (isinstance(conf, (int, float)) and 0 <= conf <= 100)
