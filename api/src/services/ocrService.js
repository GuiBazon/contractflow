// Servico de OCR (RF10/RF11). O resultado aqui e SEMPRE uma sugestao
// que deve passar por revisao e confirmacao do usuario (RN09/RN17/RN18).

const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execute = promisify(execFile);
const { isDate } = require('../utils/validators');
const { HttpError } = require('../utils/http');
let active = 0;

// Valor textual "R$ 1.234,56" ou "1.000,00" -> 1234.56
function parseValor(texto) {
  if (!texto) return null;
  const match = String(texto).replace(/\s/g, '').match(/(?<!\d)((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(?!\d)/);
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function parseData(texto) {
  if (!texto) return null;
  const m = String(texto).match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!m) return null;
  const date = `${m[3]}-${m[2]}-${m[1]}`;
  return isDate(date) ? date : null;
}

function parseCpfCnpj(texto) {
  if (!texto) return null;
  const m = String(texto).match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  return m ? m[0] : null;
}

function extrairDados(texto) {
  const t = String(texto || '').replace(/\r/g, '\n').replace(/número/gi, 'numero');
  const campos = [];
  const dados = {};

  const cliente = t.match(/cliente[::\s]+\s*([^\n]+)/i);
  if (cliente) {
    dados.cliente_nome = cliente[1].trim().replace(/\s{2,}/g, ' ');
    campos.push('cliente_nome');
  }

  const cpfCnpj = parseCpfCnpj(t);
  if (cpfCnpj) {
    dados.cpf_cnpj = cpfCnpj;
    campos.push('cpf_cnpj');
  }

  const numero = t.match(/(?:numero|n\.?o|no\.?)\s*[.:-]?\s*([A-Za-z0-9\-/]+)/i);
  if (numero && !/parcelas?/i.test(numero[1])) {
    dados.numero = numero[1].trim();
    campos.push('numero');
  }

  const valorTotal = t.match(/(?:valor\s*total|total\s*do\s*contrato|valor\s*do\s*contrato)[.:\s]*\s*(R\$\s*[\d.,]+)/i)
    || t.match(/(?:valor)[.:\s]*\s*(R\$\s*[\d.,]+)/i);
  if (valorTotal) {
    const v = parseValor(valorTotal[1]);
    if (v !== null) {
      dados.valor_total = v;
      campos.push('valor_total');
    }
  }

  const qtdParcelas = t.match(/(\d{1,3})\s*(?:x\s*|(?:parcelas?|presta[cs]o(?:es)?)\s*(?:de|no\s*valor))/i);
  if (qtdParcelas) {
    dados.quantidade_parcelas = Number(qtdParcelas[1]);
    campos.push('quantidade_parcelas');
  }

  const valorParcela = t.match(/(\d{1,3})\s*x\s*de\s*(R\$\s*[\d.,]+)|(?:parcela|presta[cs]ao)\s*de\s*(R\$\s*[\d.,]+)/i);
  if (valorParcela) {
    const v = parseValor(valorParcela[2] || valorParcela[3]);
    if (v !== null) {
      dados.valor_parcela = v;
      campos.push('valor_parcela');
    }
  }

  // datas de vencimento (linhas isoladas de data ou precedidas de "vencimento")
  const vencimentos = [];
  const dataLines = t.match(/[^\n]*(\d{2}\/\d{2}\/\d{4})[^\n]*/g) || [];
  for (const line of dataLines) {
    const d = parseData(line);
    if (d && !vencimentos.includes(d)) vencimentos.push(d);
  }
  if (vencimentos.length > 0) {
    dados.vencimentos = vencimentos;
    dados.data_inicio = vencimentos[0];
    dados.data_fim = vencimentos[vencimentos.length - 1];
    campos.push('vencimentos');
    campos.push('data_inicio');
    campos.push('data_fim');
  }

  const formas = [
    { nome: 'BOLETO', regex: /boleto/i },
    { nome: 'PIX', regex: /\bPIX\b/i },
    { nome: 'CARTAO_CREDITO', regex: /cart[aã]o\s*de\s*cr[eé]dito/i },
    { nome: 'CARTAO_DEBITO', regex: /cart[aã]o\s*de\s*d[eé]bito/i },
    { nome: 'TRANSFERENCIA', regex: /transfer[eê]ncia/i },
    { nome: 'DINHEIRO', regex: /dinheiro/i },
  ];
  for (const forma of formas) {
    if (forma.regex.test(t)) {
      dados.forma_pagamento = forma.nome;
      campos.push('forma_pagamento');
      break;
    }
  }

  const tipo = t.match(/(?:tipo\s*de\s*contrato|contrato\s*de)[.:\s]+\s*([^\n]+)/i);
  if (tipo) {
    dados.tipo = tipo[1].trim().slice(0, 100);
    campos.push('tipo');
  }

  // confianca heuristicA (RNF17): quanto mais campos, maior a confianca
  const confianca = campos.length > 0 ? Math.min(95, 40 + campos.length * 8) : 0;

  return { dados, campos, confianca };
}

async function recognizeFiles(files) {
  const cachePath = path.resolve(__dirname, '../../.cache/ocr');
  await fs.mkdir(cachePath, { recursive: true });
  const langPath = path.join(path.dirname(require.resolve('@tesseract.js-data/por')), '4.0.0_best_int');
  const worker = await createWorker('por', 1, { langPath, cachePath, logger: () => {} });
  try {
    const parts = [];
    for (const file of files) {
      let timer;
      try {
        const result = await Promise.race([
          worker.recognize(file),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new HttpError(408, 'O OCR excedeu o tempo de processamento; use um documento menor')), 60000); }),
        ]);
        parts.push((result.data.text || '').trim());
      } finally { clearTimeout(timer); }
    }
    return parts.join('\n');
  } finally { await worker.terminate(); }
}

async function extrairTextoDeArquivo({ caminho, tipoArquivo }) {
  if (active >= 2) throw new HttpError(429, 'OCR ocupado; tente novamente em alguns instantes');
  active += 1;
  let temp;
  try {
    const buffer = await fs.readFile(caminho);
    if (tipoArquivo === 'application/pdf') {
      if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new HttpError(400, 'Documento PDF inválido');
      let parsed;
      try { parsed = await pdfParse(new Uint8Array(buffer), { max: 10 }); }
      catch { throw new HttpError(400, 'Não foi possível ler o PDF; verifique se está válido e sem senha'); }
      if (parsed.numpages > 10) throw new HttpError(413, 'Documentos de OCR aceitam até 10 páginas');
      const text = (parsed.text || '').trim();
      if (text.length >= 20) return { text };
      temp = await fs.mkdtemp(path.join(os.tmpdir(), 'contractflow-pdf-'));
      try {
        await execute(process.env.PDFTOPPM_BIN || 'pdftoppm', ['-png', '-scale-to', '2200', '-f', '1', '-l', '10', caminho, path.join(temp, 'page')], { timeout: 60000, maxBuffer: 1024 * 1024 });
      } catch (err) {
        if (err.code === 'ENOENT') throw new HttpError(503, 'Conversor de PDF indisponível no servidor');
        throw new HttpError(400, 'Não foi possível converter o PDF para OCR');
      }
      const files = (await fs.readdir(temp)).filter(f => f.endsWith('.png')).sort((a,b) => a.localeCompare(b, 'en', { numeric: true })).map(f => path.join(temp, f));
      if (!files.length) throw new HttpError(400, 'O PDF não possui páginas legíveis');
      const extracted = await recognizeFiles(files);
      return { text: extracted, aviso: extracted.length < 20 ? 'Não foi possível identificar texto suficiente; preencha os dados manualmente.' : null };
    }
    const signature = tipoArquivo === 'image/png' ? buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : tipoArquivo === 'image/jpeg' ? buffer[0] === 255 && buffer[1] === 216
      : tipoArquivo === 'image/webp' ? buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP' : false;
    if (!signature) throw new HttpError(400, 'Imagem inválida ou conteúdo incompatível com o formato');
    const text = await recognizeFiles([caminho]);
    return { text, aviso: text.length < 20 ? 'Não foi possível identificar texto suficiente; preencha os dados manualmente.' : null };
  } finally {
    active -= 1;
    if (temp) await fs.rm(temp, { recursive: true, force: true });
  }
}

module.exports = {
  extrairTextoDeArquivo,
  extrairDados,
  parseValor,
  parseData,
  parseCpfCnpj,
};
