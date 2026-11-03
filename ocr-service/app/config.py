from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # OCR
    ocr_language: str = 'por'
    ocr_min_text_chars: int = 30
    ocr_max_file_size_mb: int = 10
    ocr_max_pdf_pages: int = 30
    ocr_timeout_seconds: int = 120
    ocr_max_concurrency: int = 2
    ocr_pdf_rasterizer: str = 'auto'
    ocr_tesseract_path: Optional[str] = None
    ocr_ghostscript_path: Optional[str] = None
    ocr_temp_dir: Optional[str] = None

    # Rasterizacao propria de PDF escaneado (pypdfium2) + binarizacao local.
    ocr_pdf_raster_dpi: int = 300
    ocr_preprocess_radius: int = 25
    ocr_preprocess_offset: int = 16


settings = Settings()
