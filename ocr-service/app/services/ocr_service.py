import os
import shutil
from pathlib import Path
from typing import Optional, Tuple

from ..config import settings
from ..schemas import OCRResponse
from .image_service import preprocess_image_obj
from .pdf_service import (
    count_pdf_pages,
    extract_embedded_images,
    extract_text_from_pdf,
    ocrmypdf_process,
    rasterize_pdf_pages,
)
from .text_extractor import extract_fields


class OCRDependencyError(Exception):
    """Dependencia de OCR ausente no ambiente (Tesseract, idioma, etc.)."""

def _windows_tesseract_candidates() -> tuple:
    candidates = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    ]
    local_appdata = os.environ.get('LOCALAPPDATA')
    if local_appdata:
        # Instalador UB-Mannheim em escopo usuario (padrao do winget sem admin).
        candidates.append(
            str(Path(local_appdata) / 'Programs' / 'Tesseract-OCR' / 'tesseract.exe')
        )
    return tuple(candidates)


def get_tesseract_cmd() -> Optional[str]:
    if settings.ocr_tesseract_path:
        return settings.ocr_tesseract_path
    env_cmd = os.environ.get('TESSERACT_CMD')
    if env_cmd:
        return env_cmd
    for candidate in _windows_tesseract_candidates():
        if Path(candidate).exists():
            return candidate
    return shutil.which('tesseract')


def configure_tesseract() -> Optional[str]:
    cmd = get_tesseract_cmd()
    if cmd:
        try:
            import pytesseract

            pytesseract.pytesseract.tesseract_cmd = cmd
        except Exception:
            pass
    return cmd


def is_tesseract_available() -> bool:
    try:
        import pytesseract  # noqa: F401
    except Exception:
        return False
    cmd = configure_tesseract()
    return bool(cmd and Path(cmd).exists())


def _raise_tesseract_error(error: Exception) -> None:
    name = type(error).__name__
    msg = str(error).lower()
    if name == 'TesseractNotFoundError' or 'not found' in msg or 'not recognized' in msg:
        raise OCRDependencyError(
            'Tesseract OCR nao encontrado. Instale com: '
            'winget install UB-Mannheim.TesseractOCR'
        ) from error
    if 'language' in msg or 'failed loading' in msg or 'tessdata' in msg:
        raise OCRDependencyError(
            f"Idioma OCR '{settings.ocr_language}' indisponivel. "
            'Instale o pacote de idioma correspondente do Tesseract (tessdata).'
        ) from error
    if 'timeout' in msg or 'timed out' in msg:
        raise ValueError('Tempo limite de OCR excedido') from error
    raise OCRDependencyError('OCR nao concluido: falha no Tesseract') from error


def _run_tesseract(target) -> Tuple[str, Optional[float]]:
    import pytesseract

    text = pytesseract.image_to_string(
        target,
        lang=settings.ocr_language,
        timeout=settings.ocr_timeout_seconds,
    )

    conf: Optional[float] = None
    try:
        data = pytesseract.image_to_data(
            target,
            lang=settings.ocr_language,
            output_type=pytesseract.Output.DICT,
            timeout=settings.ocr_timeout_seconds,
        )
        confs = [float(c) for c in data.get('conf', []) if str(c) not in ('-1', '')]
        if confs:
            conf = round(sum(confs) / len(confs), 2)
    except Exception:
        conf = None
    return text, conf


def ocr_image_object(pil_img) -> Tuple[str, Optional[float]]:
    """OCR real de uma imagem PIL (binarizacao adaptativa + Tesseract)."""
    try:
        import pytesseract  # noqa: F401
    except Exception:
        raise OCRDependencyError(
            'pytesseract nao instalado. Instale com: pip install pytesseract'
        )
    if not is_tesseract_available():
        raise OCRDependencyError(
            'Tesseract OCR nao encontrado. Instale com: '
            'winget install UB-Mannheim.TesseractOCR '
            'e, se necessario, configure OCR_TESSERACT_PATH no .env'
        )
    configure_tesseract()

    try:
        target = preprocess_image_obj(
            pil_img,
            radius=settings.ocr_preprocess_radius,
            offset=settings.ocr_preprocess_offset,
        )
        return _run_tesseract(target)
    except OCRDependencyError:
        raise
    except Exception as e:
        _raise_tesseract_error(e)


def ocr_image(image_path: str) -> Tuple[str, Optional[float]]:
    try:
        from PIL import Image
    except Exception:
        raise OCRDependencyError(
            'Pillow nao instalado. Instale com: pip install pillow'
        )
    try:
        with Image.open(image_path) as img:
            img.load()
            return ocr_image_object(img)
    except OCRDependencyError:
        raise
    except Exception as e:
        _raise_tesseract_error(e)


def _consolidar_paginas(textos: list, confiancas: list):
    chunks = [t.strip() for t in textos if t and t.strip()]
    if not chunks:
        return None, None
    confs = [c for c in confiancas if c is not None]
    mean_conf = round(sum(confs) / len(confs), 2) if confs else None
    return '\n'.join(chunks), mean_conf


def _ocr_rasterized_pdf(pdf_path: str, warnings: list):
    """OCR real de PDF escaneado: rasteriza (pypdfium2) + binariza + Tesseract.

    Caminho principal para PDF escaneado. Retorna (texto, confianca) ou
    (None, None) se nada foi reconhecido.
    """
    pages = rasterize_pdf_pages(
        pdf_path,
        dpi=settings.ocr_pdf_raster_dpi,
        max_pages=settings.ocr_max_pdf_pages,
    )
    if not pages:
        return None, None

    textos: list = []
    confs: list = []
    for page_img in pages:
        try:
            text, conf = ocr_image_object(page_img)
        except OCRDependencyError:
            raise
        except ValueError:
            warnings.append('Tempo limite excedido ao OCR de uma pagina rasterizada')
            continue
        except Exception:
            warnings.append('Falha ao processar uma pagina rasterizada do PDF')
            continue
        if text and text.strip():
            textos.append(text)
            confs.append(conf)
    return _consolidar_paginas(textos, confs)


def _ocr_embedded_images(pdf_path: str, warnings: list):
    """OCR real das imagens embutidas de um PDF escaneado (fallback do rasterizador).

    Retorna (texto_concatenado, confianca_media) ou (None, None) se nada lido.
    """
    images = extract_embedded_images(pdf_path)
    if not images:
        return None, None

    textos: list = []
    confs: list = []
    for image in images:
        try:
            text, conf = ocr_image_object(image)
        except OCRDependencyError:
            raise
        except Exception:
            warnings.append('Falha ao processar uma imagem extraida do PDF')
            continue
        if text.strip():
            textos.append(text)
            confs.append(conf)
    return _consolidar_paginas(textos, confs)


def process_pdf(file_path: str, filename: str, mime_type: str) -> OCRResponse:
    warnings = []
    pages = count_pdf_pages(file_path)
    if pages is not None and pages > settings.ocr_max_pdf_pages:
        raise ValueError(
            f'PDF com {pages} paginas excede o limite de {settings.ocr_max_pdf_pages}'
        )

    text = extract_text_from_pdf(file_path)
    origin = 'digital' if len(text.strip()) >= settings.ocr_min_text_chars else 'scanned'
    confidence: Optional[float] = None

    if origin == 'scanned':
        if not is_tesseract_available():
            raise OCRDependencyError(
                'PDF escaneado e o Tesseract OCR nao esta disponivel. '
                'Instale com: winget install UB-Mannheim.TesseractOCR'
            )
        ocr_ok = False

        # 1) Rasterizacao propria (pypdfium2) + binarizacao adaptativa.
        # Caminho principal: nao depende de Ghostscript e trata o fundo
        # texturizado que o threshold interno do OCRmyPDF nao resolve.
        raster_text, raster_conf = _ocr_rasterized_pdf(file_path, warnings)
        if raster_text and raster_text.strip():
            text = raster_text
            confidence = raster_conf
            ocr_ok = True

        # 2) OCRmyPDF (mantido como alternativa; gera camada de texto).
        if not ocr_ok:
            out_pdf = str(Path(file_path).with_suffix('.ocr.pdf'))
            try:
                if ocrmypdf_process(file_path, out_pdf):
                    ocr_text = extract_text_from_pdf(out_pdf)
                    if ocr_text.strip():
                        text = ocr_text
                        ocr_ok = True
                    else:
                        warnings.append(
                            'OCR executado mas nenhum texto foi reconhecido no PDF'
                        )
                else:
                    warnings.append(
                        'OCRmyPDF nao concluiu o OCR do PDF. Verifique Tesseract e Ghostscript instalados'
                    )
            finally:
                try:
                    if Path(out_pdf).exists():
                        os.unlink(out_pdf)
                except OSError:
                    pass

        # 3) Fallback: OCR real das imagens embutidas no PDF.
        if not ocr_ok:
            img_text, img_conf = _ocr_embedded_images(file_path, warnings)
            if img_text and img_text.strip():
                text = img_text
                confidence = img_conf
                warnings.append(
                    'Usada extracao das imagens embutidas do PDF (rasterizador sem conteudo)'
                )
            elif not text.strip():
                warnings.append('Nenhum texto reconhecido no PDF escaneado')

    if not text.strip():
        warnings.append('Nenhum texto extraido do documento')

    return OCRResponse(
        success=True,
        filename=filename,
        mime_type=mime_type,
        document_type='pdf',
        origin=origin,
        pages=pages if pages is not None else 1,
        text=text,
        confidence=confidence,
        fields=extract_fields(text),
        warnings=warnings,
    )


def process_image(file_path: str, filename: str, mime_type: str) -> OCRResponse:
    text, conf = ocr_image(file_path)
    warnings = []
    if len(text.strip()) < settings.ocr_min_text_chars:
        warnings.append('Texto extraido pequeno - revisar documento')
    return OCRResponse(
        success=True,
        filename=filename,
        mime_type=mime_type,
        document_type='image',
        origin='scanned',
        pages=1,
        text=text,
        confidence=conf,
        fields=extract_fields(text),
        warnings=warnings,
    )


def process_file(file_path: str, filename: str, mime_type: str) -> OCRResponse:
    ext = Path(file_path).suffix.lower()
    if ext == '.pdf':
        return process_pdf(file_path, filename, mime_type)
    return process_image(file_path, filename, mime_type)
