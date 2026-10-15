import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from ..config import settings

# Import no carregamento do modulo (thread principal). O pypdfium2 carrega uma
# biblioteca nativa; importar de forma tardia dentro de uma worker thread do
# uvicorn/TestClient pode provocar access violation no Windows. Se o pacote nao
# estiver instalado, o rasterizador fica indisponivel e o OCR cai nos outros
# caminhos (OCRmyPDF / imagens embutidas).
try:
    import pypdfium2 as pdfium
except Exception:  # pragma: no cover - ambiente sem pypdfium2
    pdfium = None


def count_pdf_pages(pdf_path: str) -> Optional[int]:
    try:
        import pypdf

        reader = pypdf.PdfReader(pdf_path)
        return len(reader.pages)
    except Exception:
        return None


def pdf_has_text(pdf_path: str, min_chars: int = 30) -> bool:
    try:
        import pypdf

        reader = pypdf.PdfReader(pdf_path)
        text = ''
        for page in reader.pages[:10]:
            text += page.extract_text() or ''
            if len(text) >= min_chars:
                break
        return len(text.strip()) >= min_chars
    except Exception:
        return False


def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        import pypdf

        reader = pypdf.PdfReader(pdf_path)
        text = ''
        for page in reader.pages:
            text += page.extract_text() or ''
            text += '\n'
        return text
    except Exception:
        return ''


def extract_embedded_images(pdf_path: str) -> list:
    """Extrai as imagens incorporadas das paginas do PDF.

    Usado como caminho de OCR real para PDFs escaneados cujo rasterizador
    (pypdfium/Ghostscript) nao desenha o conteudo (ex.: imagem embutida que
    o renderizador ignora). Retorna lista de PIL.Image.
    """
    try:
        import io

        import pypdf
        from PIL import Image

        reader = pypdf.PdfReader(pdf_path)
        images = []
        for page in reader.pages:
            resources = page.get('/Resources')
            xobject = resources.get('/XObject') if resources else None
            if not xobject:
                continue
            for stream in xobject.values():
                try:
                    obj = stream.get_object()
                    if obj.get('/Subtype') != '/Image':
                        continue
                    image = Image.open(io.BytesIO(obj.get_data()))
                    image.load()
                    images.append(image)
                except Exception:
                    continue
        return images
    except Exception:
        return []


def rasterize_pdf_pages(pdf_path: str, dpi: int = 300, max_pages: Optional[int] = None) -> list:
    """Rasteriza cada pagina do PDF em uma imagem PIL usando pypdfium2.

    Caminho principal para PDF escaneado: e deterministico (nao depende de
    Ghostscript) e devolve a pagina renderizada, que depois recebe a
    binarizacao adaptativa antes do Tesseract.
    """
    if pdfium is None:
        return []

    images = []
    doc = None
    try:
        doc = pdfium.PdfDocument(pdf_path)
        scale = max(dpi, 72) / 72.0
        for page in doc:
            if max_pages is not None and len(images) >= max_pages:
                break
            bitmap = page.render(scale=scale)
            images.append(bitmap.to_pil())
    except Exception:
        return images
    finally:
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass
    return images


def ocrmypdf_process(pdf_path: str, output_path: str) -> bool:
    cmd = [
        sys.executable,
        '-m',
        'ocrmypdf',
        '--skip-text',
        '--output-type',
        'pdf',
        '--language',
        settings.ocr_language,
        '--tesseract-timeout',
        str(settings.ocr_timeout_seconds),
        '--jobs',
        '1',
        '--quiet',
    ]
    if settings.ocr_pdf_rasterizer and settings.ocr_pdf_rasterizer != 'auto':
        cmd.extend(['--pdf-renderer', settings.ocr_pdf_rasterizer])
    cmd.extend([str(pdf_path), str(output_path)])

    env = os.environ.copy()
    path_prefix = []
    if settings.ocr_ghostscript_path:
        gs = Path(settings.ocr_ghostscript_path)
        if gs.is_file():
            path_prefix.append(str(gs.parent))
        elif gs.is_dir():
            path_prefix.append(str(gs))
    # O OCRmyPDF invoca o executavel do Tesseract pelo PATH do subprocesso.
    try:
        from .ocr_service import get_tesseract_cmd

        tesseract_cmd = get_tesseract_cmd()
        if tesseract_cmd:
            candidate_dir = str(Path(tesseract_cmd).parent)
            if Path(candidate_dir).exists():
                path_prefix.append(candidate_dir)
    except Exception:
        pass
    if path_prefix:
        env['PATH'] = os.pathsep.join(path_prefix + [env.get('PATH', '')])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=settings.ocr_timeout_seconds + 30,
            env=env,
        )
        out = Path(output_path)
        return result.returncode == 0 and out.exists() and out.stat().st_size > 0
    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False
