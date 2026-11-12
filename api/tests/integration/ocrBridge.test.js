const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const http = require('http');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
jest.mock('tesseract.js', () => ({ createWorker: jest.fn() }));
const { createWorker } = require('tesseract.js');
const { extrairTextoDeArquivo } = require('../../src/services/ocrService');

const fixture = path.join(__dirname, '../fixtures/contrato-texto.pdf');
let tempDir, server, calls, worker;
async function startService(handler) {
  server = http.createServer((req, res) => { calls++; req.resume(); req.on('end', () => handler(req, res)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.PYTHON_OCR_ENABLED = 'true';
  process.env.PYTHON_OCR_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.PYTHON_OCR_TIMEOUT_MS = '1000';
}
async function pdfPages(n) {
  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks = [];
  doc.on('data', part => chunks.push(part));
  const finished = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  for (let i = 0; i < n; i++) doc.addPage().text(`Página ${i + 1} do contrato`);
  doc.end();
  return finished;
}
beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contractflow-ocr-bridge-'));
  calls = 0;
  worker = { recognize: jest.fn().mockResolvedValue({ data: { text: 'Texto reconhecido pelo Tesseract local' } }), terminate: jest.fn().mockResolvedValue() };
  createWorker.mockReset().mockResolvedValue(worker);
  delete process.env.PYTHON_OCR_ENABLED; delete process.env.PYTHON_OCR_URL; delete process.env.PYTHON_OCR_TIMEOUT_MS;
});
afterEach(async () => {
  if (server) { await new Promise(resolve => server.close(resolve)); server = null; }
  delete process.env.PYTHON_OCR_ENABLED; delete process.env.PYTHON_OCR_URL; delete process.env.PYTHON_OCR_TIMEOUT_MS;
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('Python é optativo e não é consultado quando desativado', async () => {
  await startService((_req, res) => res.end());
  process.env.PYTHON_OCR_ENABLED = 'false';
  const result = await extrairTextoDeArquivo({ caminho: fixture, tipoArquivo: 'application/pdf' });
  expect(result.text).toContain('OCR-DEMO-001');
  expect(calls).toBe(0); expect(createWorker).not.toHaveBeenCalled();
});

test('Python recebe PDF válido e fornece texto e avisos', async () => {
  await startService((req, res) => {
    expect(req.method).toBe('POST'); expect(req.url).toBe('/ocr/extract');
    expect(req.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ text: 'Texto obtido pelo serviço Python', pages: 1, origin: 'digital', warnings: ['Revise os dados.'] }));
  });
  const result = await extrairTextoDeArquivo({ caminho: fixture, tipoArquivo: 'application/pdf' });
  expect(result).toEqual({ text: 'Texto obtido pelo serviço Python', aviso: 'Revise os dados.' });
  expect(calls).toBe(1); expect(createWorker).not.toHaveBeenCalled();
});

test.each([
  ['resposta 503', (res) => { res.writeHead(503); res.end(); }],
  ['resposta inválida', (res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ text: 'texto', pages: 11 })); }],
])('%s do Python usa o PDF local como fallback', async (_label, reply) => {
  await startService((_req, res) => reply(res));
  const result = await extrairTextoDeArquivo({ caminho: fixture, tipoArquivo: 'application/pdf' });
  expect(calls).toBe(1); expect(result.text).toContain('OCR-DEMO-001'); expect(createWorker).not.toHaveBeenCalled();
});

test('timeout do Python retorna ao processamento local', async () => {
  await startService((_req, res) => { res.on('close', () => res.destroy()); });
  process.env.PYTHON_OCR_TIMEOUT_MS = '100';
  const result = await extrairTextoDeArquivo({ caminho: fixture, tipoArquivo: 'application/pdf' });
  expect(calls).toBe(1); expect(result.text).toContain('OCR-DEMO-001');
});

test('Python indisponível deixa imagem seguir para OCR local', async () => {
  await startService((_req, res) => { res.writeHead(503); res.end(); });
  const image = path.join(__dirname, '../fixtures/contrato.png');
  const result = await extrairTextoDeArquivo({ caminho: image, tipoArquivo: 'image/png' });
  expect(calls).toBe(1); expect(result.text).toContain('Tesseract local');
  expect(worker.recognize).toHaveBeenCalledTimes(1);
});

test('limite de duas leituras concorrentes também vale com Python', async () => {
  await startService((_req, res) => {
    setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ text: 'Texto do Python', pages: 1 })); }, 50);
  });
  const request = () => extrairTextoDeArquivo({ caminho: fixture, tipoArquivo: 'application/pdf' });
  const first = request(); const second = request();
  await expect(request()).rejects.toMatchObject({ status: 429 });
  const results = await Promise.all([first, second]);
  expect(results.map(result => result.text)).toEqual(['Texto do Python', 'Texto do Python']);
});

test('PDF inválido, com mais de 10 páginas ou acima de 10 MiB não é enviado ao Python', async () => {
  await startService((_req, res) => res.end());
  const invalid = path.join(tempDir, 'invalid.pdf'), long = path.join(tempDir, 'long.pdf'), large = path.join(tempDir, 'large.pdf');
  await fs.writeFile(invalid, 'nao e pdf'); await fs.writeFile(long, await pdfPages(11));
  const file = await fs.open(large, 'w'); await file.truncate(10 * 1024 * 1024 + 1); await file.close();
  await expect(extrairTextoDeArquivo({ caminho: invalid, tipoArquivo: 'application/pdf' })).rejects.toMatchObject({ status: 400 });
  await expect(extrairTextoDeArquivo({ caminho: long, tipoArquivo: 'application/pdf' })).rejects.toMatchObject({ status: 413 });
  await expect(extrairTextoDeArquivo({ caminho: large, tipoArquivo: 'application/pdf' })).rejects.toMatchObject({ status: 413 });
  expect(calls).toBe(0);
});

test('fallback de imagem corrige orientação antes do Tesseract', async () => {
  const image = path.join(tempDir, 'photo.jpg');
  await sharp({ create: { width: 120, height: 200, channels: 3, background: '#c6c6c6' } }).jpeg().withMetadata({ orientation: 6 }).toFile(image);
  const result = await extrairTextoDeArquivo({ caminho: image, tipoArquivo: 'image/jpeg' });
  expect(result.text).toContain('Tesseract local');
  const metadata = await sharp(worker.recognize.mock.calls[0][0]).metadata();
  expect(metadata.format).toBe('jpeg'); expect(metadata.orientation).toBeUndefined();
  expect(metadata.width).toBeGreaterThan(metadata.height); expect(worker.terminate).toHaveBeenCalledTimes(1);
});

test('assinatura inválida de imagem não é enviada ao Python', async () => {
  await startService((_req, res) => res.end());
  const image = path.join(tempDir, 'fake.jpg'); await fs.writeFile(image, 'nao e imagem');
  await expect(extrairTextoDeArquivo({ caminho: image, tipoArquivo: 'image/jpeg' })).rejects.toMatchObject({ status: 400 });
  expect(calls).toBe(0);
});
