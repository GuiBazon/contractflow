import os
import tempfile
import uuid
from pathlib import Path
from typing import BinaryIO, Tuple

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
ALLOWED_MIMES = {'application/pdf', 'image/jpeg', 'image/png'}
# Tipos genericos que nao permitem validar o conteudo; a extensao decide.
ALLOWED_GENERIC_MIMES = {'application/octet-stream', 'binary/octet-stream'}


def get_temp_dir() -> Path:
    temp_root = os.environ.get('OCR_TEMP_DIR') or tempfile.gettempdir()
    temp_dir = Path(temp_root) / 'contractflow_ocr'
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir


def save_upload_file(file_obj: BinaryIO, filename: str) -> Tuple[str, str]:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f'Extensao nao permitida: {ext or "(sem extensao)"}')
    unique_name = f'{uuid.uuid4().hex}{ext}'
    file_path = get_temp_dir() / unique_name
    with open(file_path, 'wb') as buffer:
        while True:
            chunk = file_obj.read(1024 * 1024)
            if not chunk:
                break
            buffer.write(chunk)
    return str(file_path), unique_name
