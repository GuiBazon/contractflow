from app.config import settings


def test_pdf_digital_extrai_texto_sem_ocr(client, fixtures_dir):
    with open(fixtures_dir / 'contrato-digital.pdf', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato-digital.pdf', f, 'application/pdf')}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data['success'] is True
    assert data['document_type'] == 'pdf'
    assert data['origin'] == 'digital'
    assert data['pages'] >= 1
    assert len(data['text'].strip()) >= settings.ocr_min_text_chars
    # Digital: confianca de OCR nao se aplica.
    assert data['confidence'] is None


def test_pdf_digital_campos_sem_inventar(client, fixtures_dir):
    with open(fixtures_dir / 'contrato-digital.pdf', 'rb') as f:
        resp = client.post(
            '/ocr/extract', files={'file': ('contrato-digital.pdf', f, 'application/pdf')}
        )
    fields = resp.json()['fields']
    assert fields['vencimentos'] == [] or isinstance(fields['vencimentos'], list)
