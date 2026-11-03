// Integracao Node -> Python OCR (ocr-service/).
//
// Sem mocks: quando o servico Python esta de pe em 127.0.0.1:8000, os testes de
// fluxo real rodam de verdade (Node envia o arquivo, Python processa com
// Tesseract/OCRmyPDF e devolve o texto). Os testes de fallback e desativacao
// garantem que o OCR Node nao e interrompido.

const path = require('path');
const http = require('http');
const {
  getPythonOcrUrl,
  extrairComPythonOcr,
  checkPythonOcrHealth,
  normalizarOrigem,
} = require('../../src/services/pythonOcrService');

const FIXTURES = path.join(__dirname, '..', 'fixtures');
const PDF_DIGITAL = path.join(FIXTURES, 'contrato-digital.pdf');
const PDF_ESCANEADO = path.join(FIXTURES, 'contrato-escaneado.pdf');
const JPG = path.join(FIXTURES, 'contrato.jpg');
const PNG = path.join(FIXTURES, 'contrato.png');
const TIMEOUT_REAL = 180000;

function nota(msg) {
  process.stdout.write(`\n[test] ${msg}\n`);
}

async function exigirServicoPython() {
  const health = await checkPythonOcrHealth();
  if (!health || health.status !== 'ok') {
    throw new Error(
      `Servico Python OCR indisponivel em ${getPythonOcrUrl()} — rode "python run.py" em ocr-service/ para executar os testes de fluxo real.`
    );
  }
  return health;
}

beforeEach(() => {
  delete process.env.PYTHON_OCR_URL;
  delete process.env.PYTHON_OCR_TIMEOUT_MS;
});

afterEach(() => {
  delete process.env.PYTHON_OCR_URL;
  delete process.env.PYTHON_OCR_TIMEOUT_MS;
  delete process.env.PYTHON_OCR_ENABLED;
});

test('desativado: NUNCA altera o comportamento (fallback imediato)', async () => {
  process.env.PYTHON_OCR_ENABLED = 'false';
  const r = await extrairComPythonOcr({ caminho: PDF_DIGITAL, tipoArquivo: 'application/pdf' });
  expect(r.usado).toBe(false);
  expect(r.motivo).toBe('desativado');
});

test('ativado e servico fora do ar: fallback para o OCR Node (sem quebrar)', async () => {
  // Porta 9 (discard) normalmente sem atendimento -> erro de rede/timeout.
  process.env.PYTHON_OCR_ENABLED = 'true';
  process.env.PYTHON_OCR_URL = 'http://127.0.0.1:9';
  process.env.PYTHON_OCR_TIMEOUT_MS = '1500';
  const r = await extrairComPythonOcr({ caminho: PDF_DIGITAL, tipoArquivo: 'application/pdf' });
  expect(r.usado).toBe(false);
  expect(['timeout', 'erro_rede']).toContain(r.motivo);
});

test('origem Python e mapeada para o formato interno do OCR Node', () => {
  expect(normalizarOrigem('digital')).toBe('pdf-texto');
  expect(normalizarOrigem('scanned')).toBe('ocr');
});

// Sobe um servidor HTTP local REAL (nao e mock do OCR) para exercitar os
// caminhos de erro da ponte: resposta 5xx, resposta invalida e timeout.
function iniciarServidorFake(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

describe('falhas do servico Python (servidor HTTP local)', () => {
  test('erro HTTP (500) aciona fallback Node', async () => {
    const { server, port } = await iniciarServidorFake((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ detail: 'boom' }));
    });
    try {
      process.env.PYTHON_OCR_ENABLED = 'true';
      process.env.PYTHON_OCR_URL = `http://127.0.0.1:${port}`;
      const r = await extrairComPythonOcr({ caminho: PDF_DIGITAL, tipoArquivo: 'application/pdf' });
      expect(r.usado).toBe(false);
      expect(r.motivo).toBe('http_500');
    } finally {
      server.close();
    }
  });

  test('resposta invalida (sem text/pages) aciona fallback Node', async () => {
    const { server, port } = await iniciarServidorFake((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ algo: 'sem texto' }));
    });
    try {
      process.env.PYTHON_OCR_ENABLED = 'true';
      process.env.PYTHON_OCR_URL = `http://127.0.0.1:${port}`;
      const r = await extrairComPythonOcr({ caminho: PDF_DIGITAL, tipoArquivo: 'application/pdf' });
      expect(r.usado).toBe(false);
      expect(r.motivo).toBe('resposta_invalida');
    } finally {
      server.close();
    }
  });

  test('timeout aciona fallback Node', async () => {
    const { server, port } = await iniciarServidorFake((req, res) => {
      // Nunca responde: força o timeout do cliente. O timer fica unref para
      // não manter o event loop vivo e travar o encerramento do Jest.
      const t = setTimeout(() => res.end('{}'), 5000);
      t.unref();
    });
    try {
      process.env.PYTHON_OCR_ENABLED = 'true';
      process.env.PYTHON_OCR_URL = `http://127.0.0.1:${port}`;
      process.env.PYTHON_OCR_TIMEOUT_MS = '1000';
      const r = await extrairComPythonOcr({ caminho: PDF_DIGITAL, tipoArquivo: 'application/pdf' });
      expect(r.usado).toBe(false);
      expect(r.motivo).toBe('timeout');
    } finally {
      server.close();
    }
  }, 20000);
});


describe('fluxo real Node -> Python (requer servico Python de pe)', () => {
  beforeAll(async () => {
    delete process.env.PYTHON_OCR_URL;
    delete process.env.PYTHON_OCR_TIMEOUT_MS;
    const health = await exigirServicoPython();
    nota(`servico Python disponivel: ${JSON.stringify(health)}`);
  }, TIMEOUT_REAL);

  test(
    'PDF digital: Python devolve texto selecionavel (origin digital)',
    async () => {
      process.env.PYTHON_OCR_ENABLED = 'true';
      const r = await extrairComPythonOcr({
        caminho: PDF_DIGITAL,
        tipoArquivo: 'application/pdf',
      });
      expect(r.usado).toBe(true);
      expect(r.result.text.length).toBeGreaterThan(0);
      expect(r.result.origem).toBe('pdf-texto');
    },
    TIMEOUT_REAL
  );

  test(
    'PDF escaneado: Python devolve texto via OCR real (origin scanned)',
    async () => {
      process.env.PYTHON_OCR_ENABLED = 'true';
      const r = await extrairComPythonOcr({
        caminho: PDF_ESCANEADO,
        tipoArquivo: 'application/pdf',
      });
      expect(r.usado).toBe(true);
      expect(r.result.text.length).toBeGreaterThan(0);
      expect(r.result.origem).toBe('ocr');
    },
    TIMEOUT_REAL
  );

  test(
    'JPG: Python devolve texto com OCR real (origin scanned)',
    async () => {
      process.env.PYTHON_OCR_ENABLED = 'true';
      const r = await extrairComPythonOcr({ caminho: JPG, tipoArquivo: 'image/jpeg' });
      expect(r.usado).toBe(true);
      expect(r.result.text.length).toBeGreaterThan(0);
      expect(r.result.origem).toBe('ocr');
    },
    TIMEOUT_REAL
  );

  test(
    'PNG: Python devolve texto com OCR real (origin scanned)',
    async () => {
      process.env.PYTHON_OCR_ENABLED = 'true';
      const r = await extrairComPythonOcr({ caminho: PNG, tipoArquivo: 'image/png' });
      expect(r.usado).toBe(true);
      expect(r.result.text.length).toBeGreaterThan(0);
      expect(r.result.origem).toBe('ocr');
    },
    TIMEOUT_REAL
  );
});