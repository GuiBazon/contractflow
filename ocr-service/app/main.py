import io
import os

from fastapi import FastAPI, File, HTTPException, UploadFile

from .config import settings
from .schemas import HealthResponse, OCRResponse
from .services.ocr_service import OCRDependencyError, process_file
from .utils.files import ALLOWED_GENERIC_MIMES, ALLOWED_MIMES, save_upload_file

app = FastAPI(title='OCR Python Service', version='1.0.0')


@app.get('/health', response_model=HealthResponse)
async def health():
    return HealthResponse(status='ok', service='ocr-python')


@app.post('/ocr/extract', response_model=OCRResponse)
async def extract_ocr(file: UploadFile = File(...)):
    content = await file.read()
    max_bytes = settings.ocr_max_file_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f'Arquivo excede o limite de {settings.ocr_max_file_size_mb}MB',
        )

    content_type = (file.content_type or '').lower().split(';')[0].strip()
    if (
        content_type
        and content_type not in ALLOWED_MIMES
        and content_type not in ALLOWED_GENERIC_MIMES
    ):
        raise HTTPException(
            status_code=415, detail=f'Tipo de arquivo nao suportado: {content_type}'
        )

    file_path = None
    try:
        file_path, unique_name = save_upload_file(
            io.BytesIO(content), file.filename or 'document'
        )
        return process_file(
            file_path,
            file.filename or unique_name,
            content_type or 'application/octet-stream',
        )
    except OCRDependencyError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail='Erro interno ao processar OCR')
    finally:
        if file_path:
            try:
                os.unlink(file_path)
            except OSError:
                pass
