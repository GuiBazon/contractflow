// Ponte OPCIONAL para o servico Python de OCR (ocr-service/).
//
// Desativada por padrao (PYTHON_OCR_ENABLED=false). Enquanto desativada,
// NENHUM comportamento do OCR Node atual (ocrService.js) e alterado.
//
// Fluxo:  Mobile -> Node/Express -> POST http://127.0.0.1:8000/ocr/extract -> Python
//         -> resultado estruturado -> Node -> Mobile
//
// Regras:
//  - Python SOMENTE processa o documento (nao toca no MySQL nem persiste nada).
//  - Se o Python estiver desativado, indisponivel, com timeout ou com resposta
//    invalida, o chamador deve seguir com o fallback do OCR Node (tesseract.js).
//  - A resposta e validada aqui: so devolvemos text string + metadados reais.

const fs = require('fs');
const path = require('path');

const PYTHON_OCR_DEFAULT_TIMEOUT_MS = 120000;

function isPythonOcrEnabled() {
  return process.env.PYTHON_OCR_ENABLED === 'true';
}

function getPythonOcrUrl() {
  return (process.env.PYTHON_OCR_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
}

function getPythonOcrTimeoutMs() {
  const n = Number(process.env.PYTHON_OCR_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : PYTHON_OCR_DEFAULT_TIMEOUT_MS;
}

// GET /health do servico Python. Retorna o JSON ou null se indisponivel.
async function checkPythonOcrHealth() {
  const resp = await fetch(`${getPythonOcrUrl()}/health`, {
    method: 'GET',
    signal: AbortSignal.timeout(getPythonOcrTimeoutMs()),
  });
  if (!resp.ok) return null;
  return resp.json();
}

function normalizarOrigem(origin) {
  // Mapeia a origem do Python para o que o OCR Node ja usa internamente.
  if (origin === 'digital') return 'pdf-texto';
  if (origin === 'scanned') return 'ocr';
  return 'python';
}

function validarRespostaPython(json) {
  if (!json || typeof json !== 'object') return null;
  if (typeof json.text !== 'string') return null;
  if (!Number.isInteger(json.pages)) return null;
  return json;
}

// Envia um Blob para POST /ocr/extract e devolve o JSON bruto do Python.
// Sem timeout tratamento de fallback: usado por fluxos que ja tem o buffer.
async function postBlobPython(blob, filename, mimetype) {
  const form = new FormData();
  form.append('file', new Blob([blob], { type: mimetype || 'application/octet-stream' }), filename || 'document');
  const resp = await fetch(`${getPythonOcrUrl()}/ocr/extract`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(getPythonOcrTimeoutMs()),
  });
  if (!resp.ok) throw new Error(`OCR Python respondeu ${resp.status}`);
  return resp.json();
}

// Compatibilidade: envia um buffer (antecessor do extrairComPythonOcr).
// Retorna null quando desativado; lanca erro quando o Python falha.
async function extractWithPythonOcr(buffer, filename, mimetype) {
  if (!isPythonOcrEnabled()) return null;
  return postBlobPython(buffer, filename, mimetype);
}

// Envia o arquivo do disco para POST /ocr/extract e valida a resposta.
// Nunca lanca excecao: retorna { usado:true, result } em caso de sucesso ou
// { usado:false, motivo } em qualquer falha (o chamador cai no OCR Node).
async function extrairComPythonOcr({ caminho, tipoArquivo, nomeArquivo }) {
  if (!isPythonOcrEnabled()) {
    return { usado: false, motivo: 'desativado' };
  }

  const url = `${getPythonOcrUrl()}/ocr/extract`;
  const nome = nomeArquivo || path.basename(caminho || 'document');
  const mimetype = tipoArquivo || 'application/octet-stream';

  let buffer;
  try {
    buffer = fs.readFileSync(caminho);
  } catch (error) {
    console.warn(`[ocr-python] arquivo ilegivel (${error && error.message}) — fallback OCR Node`);
    return { usado: false, motivo: 'arquivo_ilegivel' };
  }

  try {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimetype }), nome);

    const resp = await fetch(url, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(getPythonOcrTimeoutMs()),
    });

    if (resp.status === 503) {
      console.warn('[ocr-python] servico indisponivel (503) — fallback OCR Node');
      return { usado: false, motivo: 'indisponivel_503' };
    }
    if (!resp.ok) {
      console.warn(`[ocr-python] servico respondeu ${resp.status} — fallback OCR Node`);
      return { usado: false, motivo: `http_${resp.status}` };
    }

    const json = validarRespostaPython(await resp.json());
    if (!json) {
      console.warn('[ocr-python] resposta invalida (sem text/pages validos) — fallback OCR Node');
      return { usado: false, motivo: 'resposta_invalida' };
    }
    if (!String(json.text).trim()) {
      console.warn('[ocr-python] Python retornou documento sem texto — fallback OCR Node');
      return { usado: false, motivo: 'texto_vazio' };
    }

    console.log(
      `[ocr-python] OCR concluido via Python (origem=${json.origin || '?'}, paginas=${json.pages}, texto_len=${json.text.length})`
    );

    return {
      usado: true,
      result: {
        text: json.text,
        confianca:
          typeof json.confidence === 'number' && Number.isFinite(json.confidence)
            ? json.confidence
            : null,
        origem: normalizarOrigem(json.origin),
        paginas: json.pages,
        avisos: Array.isArray(json.warnings) ? json.warnings : [],
      },
    };
  } catch (error) {
    const nome = error && error.name;
    const msg = String((error && error.message) || '').toLowerCase();
    // AbortSignal.timeout() do Node recente lanca DOMException 'TimeoutError'
    // (o Node antigo lancava 'AbortError'). Cobrimos os dois nomes e a
    // mensagem para classificar o timeout corretamente.
    if (nome === 'AbortError' || nome === 'TimeoutError' || msg.includes('timeout')) {
      console.warn(`[ocr-python] timeout apos ${getPythonOcrTimeoutMs()}ms — fallback OCR Node`);
      return { usado: false, motivo: 'timeout' };
    }
    console.warn(
      `[ocr-python] falha ao acessar ${url} (${error && error.message}) — fallback OCR Node`
    );
    return { usado: false, motivo: 'erro_rede' };
  }
}

module.exports = {
  isPythonOcrEnabled,
  getPythonOcrUrl,
  getPythonOcrTimeoutMs,
  checkPythonOcrHealth,
  extractWithPythonOcr,
  extrairComPythonOcr,
  normalizarOrigem,
  validarRespostaPython,
};