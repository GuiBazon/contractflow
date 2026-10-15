from pathlib import Path
import os
from typing import Optional

try:
    from PIL import Image, ImageOps, ImageFilter, ImageChops
except Exception:
    Image = None


def adaptive_binarize(img, radius: int = 25, offset: int = 16):
    """Binarizacao adaptativa local (media da vizinhanca).

    O Tesseract costuma falhar o threshold global (Otsu) em paginas
    rasterizadas de PDF escaneado: a interpolacao do rasterizador cria um
    fundo cinza texturizado que domina o histograma, e o texto acaba sendo
    apagado. Comparar cada pixel com a media local separa texto de fundo com
    ruido de forma robusta, independente do DPI.
    """
    if img.mode != 'L':
        img = img.convert('L')
    img = ImageOps.autocontrast(img)
    local = img.filter(ImageFilter.BoxBlur(radius))
    diff = ImageChops.subtract(local, img)
    return diff.point(lambda x: 0 if x > offset else 255)


def preprocess_image_obj(img, radius: int = 25, offset: int = 16):
    """Pre-processa uma imagem PIL para OCR: orientacao + binarizacao local."""
    if Image is None:
        return img
    img = ImageOps.exif_transpose(img)
    return adaptive_binarize(img, radius=radius, offset=offset)


def preprocess_image(image_path: str) -> str:
    if Image is None:
        return image_path
    try:
        img = Image.open(image_path)
        proc = preprocess_image_obj(img)
        # salva como png para melhor OCR
        out_path = str(Path(image_path).with_suffix('.proc.png'))
        proc.save(out_path, 'PNG')
        return out_path
    except Exception:
        return image_path
