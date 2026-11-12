# OCR Python — guia rápido (Windows / PowerShell)

O Python é um **serviço opcional** de reconhecimento de documentos. A API Node/Express continua responsável por autenticação, revisão, contratos e MySQL. **Não é necessário iniciar o Python para o ContractFlow funcionar**: com `PYTHON_OCR_ENABLED=false`, a API usa o OCR do Node.

## 1. Instalar (somente na primeira vez)

Abra um PowerShell na **raiz do repositório**:

```powershell
cd ocr-service
python --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Requer **Python 3.10+**. Para reconhecer **imagens e PDFs escaneados**, também é necessário instalar o **Tesseract OCR** no Windows e o pacote de idioma português (`por`). Confira com `tesseract --list-langs`; a lista deve conter `por`. Se o executável não estiver no PATH, configure `OCR_TESSERACT_PATH` em `ocr-service/.env` (copie de `.env.example`). Para PDF com texto selecionável, o serviço extrai texto diretamente.

## 2. Ligar o serviço Python

Ainda em `ocr-service/`:

```powershell
.\.venv\Scripts\python.exe run.py
```

Deixe esse terminal aberto. O serviço escuta em **http://127.0.0.1:8000**.

**Testar** em um segundo terminal, também na pasta `ocr-service/`:

```powershell
curl.exe http://127.0.0.1:8000/health
curl.exe -F "file=@..\api\tests\fixtures\contrato-texto.pdf" http://127.0.0.1:8000/ocr/extract
```

- `/health` deve retornar `"status":"ok"`.
- `/ocr/extract` deve retornar JSON com `text`, `origin` e `pages`.
- O PDF acima é **digital**. Para comprovar reconhecimento visual, teste também `contrato.png` ou `contrato-escaneado.pdf` em `api/tests/fixtures/` (requer Tesseract e idioma `por`).

## 3. Conectar o Python à API do ContractFlow

Abra `api/.env` e configure:

```dotenv
PYTHON_OCR_ENABLED=true
PYTHON_OCR_URL=http://127.0.0.1:8000
PYTHON_OCR_TIMEOUT_MS=120000
```

**Reinicie a API**: no terminal `api/`, pressione **Ctrl+C** e execute `npm run dev`. Mantenha o serviço Python aberto. A Web e o Mobile continuam chamando **a API Node**, não a porta 8000.

Envie um documento por **Importar contrato** na Web/Mobile. No terminal da API, a mensagem `[ocr-python] OCR concluido via Python` confirma que o Python foi usado. Se o Python falhar, a API registra o motivo e **volta ao OCR do Node** (fallback).

## 4. Desligar e voltar ao funcionamento normal

1. Em `api/.env`, mude para **`PYTHON_OCR_ENABLED=false`**.
2. **Reinicie a API** (Ctrl+C e `npm run dev` em `api/`) para aplicar a alteração.
3. No terminal do serviço Python, pressione **Ctrl+C**.

Pronto: Web, Mobile, API e MySQL continuam funcionando; apenas o serviço Python deixa de ser utilizado. **Não desligue a API nem o Docker/MySQL** ao encerrar o Python.

## Se der erro

- `python` não encontrado: instale o Python 3.10+ e reabra o terminal.
- `No module named ...`: repita a instalação com `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.
- `por` não aparece em `tesseract --list-langs`: instale o modelo de idioma português; imagens/escaneados podem falhar.
- `/health` não abre: confira se o Python continua rodando na porta 8000.
- API não usa o Python: confirme `PYTHON_OCR_ENABLED=true` em **api/.env** e reinicie a API.

> **Apresentação:** só ative o serviço Python se ele já tiver sido testado nesse computador. Caso contrário, demonstre o OCR Node e explique o microsserviço Python como integração opcional.
