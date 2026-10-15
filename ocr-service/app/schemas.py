from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union


class HealthResponse(BaseModel):
    status: str
    service: str = 'ocr-python'


class FieldsResponse(BaseModel):
    cliente_nome: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    numero_contrato: Optional[str] = None
    valor_total: Optional[float] = None
    quantidade_parcelas: Optional[int] = None
    valor_parcela: Optional[float] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    forma_pagamento: Optional[str] = None
    vencimentos: List[str] = []
    juros: Optional[str] = None
    multa: Optional[str] = None


class OCRResponse(BaseModel):
    success: bool
    filename: str
    mime_type: str
    document_type: str  # pdf, image
    origin: str  # digital, scanned
    pages: int
    text: str
    confidence: Optional[float] = None
    fields: FieldsResponse
    warnings: List[str] = []
