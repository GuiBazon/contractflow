import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Fixtures reaproveitadas do OCR Node (mesmos documentos de contrato).
FIXTURES_DIR = ROOT_DIR.parent / 'api' / 'tests' / 'fixtures'


def tesseract_disponivel() -> bool:
    from app.services.ocr_service import is_tesseract_available

    return is_tesseract_available()


def motivo_tesseract_ausente() -> str:
    return (
        'Tesseract OCR nao instalado neste ambiente. '
        'Instale com: winget install UB-Mannheim.TesseractOCR'
    )


@pytest.fixture(scope='session')
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope='session')
def fixtures_dir() -> Path:
    assert FIXTURES_DIR.exists(), f'Fixtures nao encontradas em {FIXTURES_DIR}'
    return FIXTURES_DIR
