import re
from typing import List, Optional

from ..schemas import FieldsResponse

CPF_REGEX = re.compile(r'\b(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})\b')
CNPJ_REGEX = re.compile(r'\b(\d{2}\.\d{2}\.\d{2}/\d{4}-\d{2}|\d{14})\b')
NUM_CONTRATO_REGEX = re.compile(
    r'(?:n[úu]mero\s*(?:do\s*)?contrato|contrato\s*n[úu]mero|contrato\s*n[º°o])'
    r'\s*[:#]?\s*([A-Za-z0-9\.\-/]+)',
    re.IGNORECASE,
)
VALOR_REGEX = re.compile(
    r'(?:valor(?:\s*total)?(?:\s*(?:do|em)\s*contrato)?)\s*(?::|#|-)?\s*(?:r\$)?\s*'
    r'([0-9]+\.[0-9]{3}(?:,[0-9]{2})?|[0-9]+,[0-9]{2})',
    re.IGNORECASE,
)
PARCELAS_REGEX = re.compile(
    r'(?:quantidade\s*de\s*parcelas?\s*[:#]?\s*(\d+)|(\d+)\s*parcelas?)',
    re.IGNORECASE,
)
VALOR_PARCELA_REGEX = re.compile(
    r'(?:valor\s*da\s*parcela|parcelas?\s*(?:de|no\s*valor\s*de))\s*(?::|#)?\s*(?:r\$)?\s*'
    r'([0-9]+\.[0-9]{3}(?:,[0-9]{2})?|[0-9]+,[0-9]{2})',
    re.IGNORECASE,
)
DATA_REGEX = re.compile(r'\b(\d{2}/\d{2}/\d{4})\b')
CLIENTE_NOME_REGEX = re.compile(
    r'(?:cliente|nome(?:\s*do\s*cliente)?)\s*[:#-]?\s*'
    r"([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ \.'-]{2,60})",
    re.IGNORECASE,
)
FORMA_PAGAMENTO_REGEX = re.compile(
    r'(?:forma\s*de\s*pagamento|pagamento)\s*[:#-]?\s*([^\n.;]{3,40})',
    re.IGNORECASE,
)
JUROS_REGEX = re.compile(r'\bjuros\s*(?:de\s*|a\s*)?([^\n.;]{1,40})', re.IGNORECASE)
MULTA_REGEX = re.compile(r'\bmulta\s*(?:de\s*|por\s*atraso\s*de\s*)?([^\n.;]{1,40})', re.IGNORECASE)


def _parse_valor(raw: str) -> Optional[float]:
    try:
        return float(raw.replace('.', '').replace(',', '.'))
    except (ValueError, AttributeError):
        return None


def _format_cpf_cnpj(digits: str) -> str:
    if len(digits) == 11:
        return f'{digits[0:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:11]}'
    if len(digits) == 14:
        return f'{digits[0:2]}.{digits[2:4]}.{digits[4:6]}/{digits[6:10]}-{digits[10:14]}'
    return digits


def extract_fields(text: str) -> FieldsResponse:
    fields = FieldsResponse(
        cliente_nome=None,
        cpf_cnpj=None,
        numero_contrato=None,
        valor_total=None,
        quantidade_parcelas=None,
        valor_parcela=None,
        data_inicio=None,
        data_fim=None,
        forma_pagamento=None,
        vencimentos=[],
        juros=None,
        multa=None,
    )
    if not text or not text.strip():
        return fields

    m = CPF_REGEX.search(text)
    if m:
        raw = m.group(1)
        digits = re.sub(r'\D', '', raw)
        if len(digits) == 11:
            fields.cpf_cnpj = _format_cpf_cnpj(digits)
    if not fields.cpf_cnpj:
        m = CNPJ_REGEX.search(text)
        if m:
            digits = re.sub(r'\D', '', m.group(1))
            if len(digits) == 14:
                fields.cpf_cnpj = _format_cpf_cnpj(digits)

    m = NUM_CONTRATO_REGEX.search(text)
    if m:
        fields.numero_contrato = m.group(1).strip()

    m = VALOR_REGEX.search(text)
    if m:
        fields.valor_total = _parse_valor(m.group(1))

    m = PARCELAS_REGEX.search(text)
    if m:
        raw_parcelas = m.group(1) or m.group(2)
        try:
            fields.quantidade_parcelas = int(raw_parcelas)
        except (ValueError, TypeError):
            pass

    m = VALOR_PARCELA_REGEX.search(text)
    if m:
        fields.valor_parcela = _parse_valor(m.group(1))

    datas: List[str] = DATA_REGEX.findall(text)
    if datas:
        fields.data_inicio = datas[0]
        if len(datas) > 1:
            fields.data_fim = datas[-1]
        fields.vencimentos = datas[:10]

    m = CLIENTE_NOME_REGEX.search(text)
    if m:
        nome = m.group(1).strip()
        if len(nome.split()) >= 1:
            fields.cliente_nome = nome

    m = FORMA_PAGAMENTO_REGEX.search(text)
    if m:
        fields.forma_pagamento = m.group(1).strip()

    m = JUROS_REGEX.search(text)
    if m:
        fields.juros = m.group(1).strip()

    m = MULTA_REGEX.search(text)
    if m:
        fields.multa = m.group(1).strip()

    return fields
