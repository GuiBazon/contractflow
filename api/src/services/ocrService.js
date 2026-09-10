// Servico de OCR (RF10/RF11). O resultado aqui e SEMPRE uma sugestao
// que deve passar por revisao e confirmacao do usuario (RN09/RN17/RN18).

const pdfParse = require('pdf-parse');
const { recognize } = require('tesseract.js');

// Valor textual "R$ 1.234,56" ou "1.000,00" -> 1234.56
function parseValor(texto) {
  if (!texto) return null;
  const match = String(texto).replace(/\s/g, '').match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function parseData(texto) {
  if (!texto) return null;
  const m = String(texto).match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseCpfCnpj(texto) {
  if (!texto) return null;
  const m = String(texto).match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  return m ? m[0] : null;
}

function extrairDados(texto) {
  const t = String(texto || '').replace(/\r/g, '\n');
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

async function extrairTextoDeArquivo({ caminho, tipoArquivo }) {
  if (tipoArquivo === 'application/pdf') {
    const buffer = await pdfParse(caminho);
    const texto = (buffer.text || '').trim();
    if (texto.length < 20) {
      return { text: '', aviso: 'O PDF enviado não possui texto editável (pode ser um documento escaneado). O OCR de PDFs escaneados ainda não é suportado.' };
    }
    return { text: texto };
  }

  if (tipoArquivo && tipoArquivo.startsWith('image/')) {
    const result = await recognize(caminho, 'por', {
      logger: () => {},
    });
    const texto = (result.data.text || '').trim();
    if (texto.length < 20) {
      return { text: '', aviso: 'Não foi possível identificar texto na imagem enviada.' };
    }
    return { text: texto };
  }

  throw new Object.assign(new Error('Formato de arquivo não suportado para OCR'), { status: 400 });
}

module.exports = {
  extrairTextoDeArquivo,
  extrairDados,
  parseValor,
  parseData,
  parseCpfCnpj,
};