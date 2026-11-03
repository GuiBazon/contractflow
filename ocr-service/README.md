# OCR Python Service

Serviço especializado de OCR para o ContractFlow. Processa PDFs (digitais e escaneados), JPG, JPEG e PNG, retornando texto, campos estruturados, origem (`digital`/`scanned`), páginas e confiança **real** do Tesseract. Não acessa banco de dados — apenas processamento de documentos.

## Arquitetura

```
Mobile
  ↓
Node / Express  (api/)
  ├─ PYTHON_OCR_ENABLED=false → usa o OCR Node atual (tesseract.js + sharp + pdf-parse)
  └─ PYTHON_OCR_ENABLED=true  → POST http://127.0.0.1:8000/ocr/extract
        ↓
     Python OCR (este serviço)
        ↓
     texto real + confiança real + campos
        ↓
     Node valida e integra (fallback para o OCR Node se o Python falhar)
        ↓
     Mobile (RevisaoContrato)
```

O Python **somente** processa o documento. Criação de cliente/contrato/parcelas/documento/histórico continua no Node/MySQL, após a confirmação do usuário.

## Requisitos

- Python 3.10+
- Tesseract OCR (para OCR de imagens/PDFs escaneados) + idioma `por`
- OCRmyPDF (via pip, já em `requirements.txt`)
- Ghostscript (recomendado; o OCRmyPDF 17 usa `pypdfium2` por padrão quando o Ghostscript não existe)

## Instalação

### Tesseract OCR + idioma português (Windows)

```powershell
winget install UB-Mannheim.TesseractOCR
```

O instalador entrega os idiomas `eng` e `osd`. Para o português (`por`), baixe o
traineddata oficial em `%LOCALAPPDATA%\Programs\Tesseract-OCR\tessdata\` (escopo
sem admin) ou `C:\Program Files\Tesseract-OCR\tessdata\`:

```powershell
curl.exe -sL -o "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tessdata\por.traineddata" `
  "https://github.com/tesseract-ocr/tessdata_fast/raw/main/por.traineddata"
```

### Ghostscript (opcional)

```powershell
winget install ArtifexSoftware.GhostScript
```

> Nota: o OCRmyPDF 17.x usa `pypdfium2` como rasterizador padrão (`--rasterizer
> auto`), então o fluxo principal não depende do Ghostscript.

### Rasterização própria + binarização (PDF escaneado)

Para PDFs escaneados o serviço rasteriza as páginas com `pypdfium2` (DPI
`OCR_PDF_RASTER_DPI`, padrão 300) e aplica **binarização adaptativa** (média local
com `OCR_PREPROCESS_RADIUS`/`OCR_PREPROCESS_OFFSET`). O fundo cinza ruidoso gerado
pelo render do `pypdfium2` derrota o limiar global (Otsu) padrão do Tesseract; a
binarização adaptativa recupera o texto (validado no fixture `contrato-escaneado.pdf`:
342 caracteres lidos, confiança ~94, sem avisos). Ordem de processamento de um PDF
escaneado:

1. rasterização própria (`pypdfium2`) + binarização adaptativa + Tesseract;
2. OCRmyPDF (se a etapa 1 não produzir texto);
3. extração das imagens embutidas (`/XObject /Image`) + Tesseract (último recurso).

Nenhuma confiança ou campo é fabricado em nenhum dos caminhos.

### Pacotes Python

```bash
cd ocr-service
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
# source .venv/bin/activate
pip install -r requirements.txt
```

## Configuração

Copie `.env.example` para `.env` e ajuste se necessário.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| OCR_LANGUAGE | por | Idioma do Tesseract |
| OCR_MAX_FILE_SIZE_MB | 10 | Tamanho máximo do arquivo |
| OCR_MAX_PDF_PAGES | 30 | Máximo de páginas de PDF |
| OCR_TIMEOUT_SECONDS | 120 | Timeout de OCR por documento |
| OCR_MIN_TEXT_CHARS | 30 | Mínimo de caracteres para considerar PDF digital |
| OCR_TEMP_DIR | (sistema) | Diretório de arquivos temporários |
| OCR_TESSERACT_PATH | (auto) | Caminho do executável do Tesseract |
| OCR_GHOSTSCRIPT_PATH | (auto) | Caminho do Ghostscript |
| OCR_PDF_RASTERIZER | auto | Rasterizador do OCRmyPDF |
| OCR_MAX_CONCURRENCY | 2 | Máximo de OCRs simultâneos |
| OCR_PDF_RASTER_DPI | 300 | DPI da rasterização própria (pypdfium2) |
| OCR_PREPROCESS_RADIUS | 25 | Raio da média local na binarização adaptativa |
| OCR_PREPROCESS_OFFSET | 16 | Offset do limiar na binarização adaptativa |

O serviço localiza o Tesseract nesta ordem: `OCR_TESSERACT_PATH` → variável
`TESSERACT_CMD` → caminhos padrão do Windows (Program Files e
`%LOCALAPPDATA%\Programs\Tesseract-OCR`) → `PATH`.

## Executar

```bash
python run.py
# ou
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints

### `GET /health`

```json
{ "status": "ok", "service": "ocr-python" }
```

### `POST /ocr/extract`

Multipart `file` (PDF, JPG, JPEG, PNG).

- PDF: detecta texto pesquisável (>= `OCR_MIN_TEXT_CHARS`). Com texto suficiente,
  extrai direto (origem `digital`, sem OCR desnecessário). Sem texto, roda a
  rasterização própria + binarização adaptativa + Tesseract (origem `scanned`),
  com OCRmyPDF e extração de imagens embutidas como fallback.
- Imagem: corrige orientação (EXIF), pré-processa e roda o Tesseract.

Resposta:

```json
{
  "success": true,
  "filename": "contrato.pdf",
  "mime_type": "application/pdf",
  "document_type": "pdf",
  "origin": "digital",
  "pages": 1,
  "text": "...",
  "confidence": null,
  "fields": {
    "cliente_nome": null,
    "cpf_cnpj": null,
    "numero_contrato": null,
    "valor_total": null,
    "quantidade_parcelas": null,
    "valor_parcela": null,
    "data_inicio": null,
    "data_fim": null,
    "forma_pagamento": null,
    "vencimentos": [],
    "juros": null,
    "multa": null
  },
  "warnings": []
}
```

Segurança: extensão validada, MIME validado quando informado, tamanho máximo,
máximo de páginas, arquivos temporários com nomes aleatórios, limpeza em
`finally`, sem expor caminhos internos ou stack trace.

Campos inexistentes não são inventados: ficam `null` ou `[]`. A confiança é a
real do Tesseract (`0–100`) ou `null` quando não aplicável (PDF digital) ou
indisponível.

## Testes

```bash
cd ocr-service
.venv\Scripts\python.exe -m pytest -v    # ou: pytest -v
```

**16 testes** (saúde, validação de entrada, PDF digital, PDF escaneado,
rasterização própria, fallback de imagens embutidas e imagens JPG/PNG).

- `pytest.ini` desabilita o `faulthandler` (`-p no:faulthandler`): o
  `import pypdfium2` dispara um falso "access violation" em
  `FPDF_InitLibraryWithConfig` (o PDFium usa tratamento de exceção SEH) que o
  faulthandler do pytest reporta. O processo encerra com código 0 normalmente; o
  código não depende desse comportamento.

As fixtures são reaproveitadas de `api/tests/fixtures/` (JPG, PNG, PDF digital,
PDF escaneado, PDF com múltiplas páginas, arquivo grande, arquivo inválido, PDF
acima do limite de páginas).

## Integração com o Node

O arquivo `api/src/services/pythonOcrService.js` prepara a ponte:

- `PYTHON_OCR_ENABLED=false` (padrão): **nenhum** comportamento do OCR Node muda.
- `PYTHON_OCR_ENABLED=true`: o `extrairTextoDeArquivo` de `ocrService.js` tenta
  `POST http://127.0.0.1:8000/ocr/extract` com timeout, tratamento de erro,
  tratamento de 503/timeout, validação da resposta e logs claros.

Fallback: se o Python estiver indisponível, com timeout, responder 503/4xx ou
devolver resposta inválida/texto vazio, o Node **não quebra o fluxo** e recai no
OCR Node atual (tesseract.js/sharp/pdf-parse continuam existindo e sendo usados).

Variáveis (no `.env` da API):

```
PYTHON_OCR_ENABLED=false
PYTHON_OCR_URL=http://127.0.0.1:8000
PYTHON_OCR_TIMEOUT_MS=120000
```

Testes da integração (Jest, exigem o servidor Python de pé para o fluxo real):

```bash
cd api
npx jest tests/__tests__/pythonOcr.integration.test.js --runInBand
# integração + reconciliação de vencimentos:
npx jest tests/__tests__/contratoImport.test.js
```

Os testes de **fluxo real** (`pythonOcr.integration`) não usam mock: quando o
serviço Python está de pé em `127.0.0.1:8000`, o Node envia o arquivo real e o
Python lê com Tesseract/OCRmyPDF. Os testes de fallback/desativação e os
cenários de erro (5xx, resposta inválida, timeout) usam um servidor HTTP local.

O controle de confirmação (Node) também **reconcilia** vencimentos ×
quantidade de parcelas na importação (contratos reais listam só alguns
vencimentos): quando a lista não bate, a agenda mensal completa é gerada a
partir da data de início — ver `normalizarVencimentosImportados` em
`api/src/services/contratoService.js`.

## Limitações

- Confiança: é a real do Tesseract (ou média real das linhas). PDF digital e
  OCR via OCRmyPDF não expõem confiança — retorna `null` em vez de inventar.
- PDFs escaneados dependem de Tesseract instalado; sem ele, responde 503 com a
  instrução de instalação.
- O fundo cinza do render de PDF é resolvido pela binarização adaptativa; se uma
  página não puder ser renderizada (conteúdo vetorial sem texto de imagem), a
  fallback de extração das imagens embutidas (`/XObject /Image`) é usada.
- `import pypdfium2` emite um falso "access violation" (SEH do PDFium) reportado
  apenas pelo `faulthandler` — desativado em `pytest.ini`; não afeta o serviço.
- A confiança depende do idioma do Tesseract (`OCR_LANGUAGE`, padrão `por`);
  sem o `por` instalado, o OCR responde 503.