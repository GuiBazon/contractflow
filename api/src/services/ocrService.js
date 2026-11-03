// Servico de OCR (RF10/RF11). O resultado aqui e SEMPRE uma sugestao
// que deve passar por revisao e confirmacao do usuario (RN09/RN17/RNF18).
//
// Pipeline (ver docs/OCR.md):
//   arquivo -> [camada de texto do PDF] ou [rasteriza + pre-processa + Tesseract]
//           -> texto + confianca real do Tesseract
//           -> extracao/interpretacao dos campos
//           -> validacao (CPF/CNPJ, datas, valores)
//           -> sugestao para revisao do usuario
//
// O estagio "interpretacao" (interpretarTexto) e o ponto de extensao para uma
// futura camada de IA: ela recebe o mesmo texto e devolve o mesmo JSON.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const { OCR_CONFIG, garantirDirTessdata } = require('../config/ocr');
const { isValidCpfCnpj, isDate } = require('../utils/validators');
const pythonOcrService = require('./pythonOcrService');

const JPEG = { quality: 92 };

// ---------------------------------------------------------------------------
// 1. Pre-processamento de imagem (foto de celular -> imagem legivel)
// ---------------------------------------------------------------------------

async function preProcessarImagem(buffer) {
  const { preprocess } = OCR_CONFIG;

  const criarPipeline = () =>
    sharp(buffer, { failOn: 'none' })
      // Correcao de rotacao pela orientacao EXIF (celular em retrato/esquerda).
      .rotate()
      // Sem fundo: PNG transparente ficaria preto no Tesseract.
      .flatten({ background: '#ffffff' });

  let pipeline = criarPipeline();

  if (preprocess.trim) {
    try {
      // PDF escaneado costuma ter margem branca ao redor do conteudo. O
      // normalize precisa enxergar so o conteudo para nao apagar o texto.
      const semMargem = await pipeline.trim({ threshold: 10 }).toBuffer();
      const metaRecorte = await sharp(semMargem, { failOn: 'none' }).metadata();
      if ((metaRecorte.width || 0) >= 80 && (metaRecorte.height || 0) >= 80) {
        pipeline = sharp(semMargem, { failOn: 'none' });
      }
    } catch (error) {
      // imagem sem margem uniforme: segue com a original
      pipeline = criarPipeline();
    }
  }

  // Escala: fotos pequenas nao tem pixels suficientes para o Tesseract.
  const meta = await pipeline.metadata();
  if (meta.width && meta.width < preprocess.larguraMinima) {
    pipeline = pipeline.resize({
      width: preprocess.larguraMinima,
      withoutEnlargement: false,
      kernel: 'lanczos3',
    });
  }

  // Escala relativa tambem ajuda PDF rasterizado em baixa resolucao.
  pipeline = pipeline.grayscale();

  if (preprocess.normalize) {
    // Estica o contraste usando os percentis da propria imagem.
    pipeline = pipeline.normalize();
  } else {
    // Normalize + sharpen juntos amplificam o ruido de fotos desfocadas e
    // destroem a leitura. O sharpen fica so como alternativa ao normalize.
    pipeline = pipeline.sharpen({ sigma: 0.8 });
  }

  if (preprocess.threshold > 0) {
    pipeline = pipeline.threshold(preprocess.threshold);
  }

  const saida = await pipeline.jpeg(JPEG).toBuffer();
  return { buffer: saida, largura: meta.width || 0, altura: meta.height || 0 };
}

// ---------------------------------------------------------------------------
// 2. Rasterizacao de PDF escaneado
// ---------------------------------------------------------------------------

async function rasterizarPdf(caminho) {
  // pdf-to-img e ESM-only; import dinamico funciona em Node 20 e 24.
  const { pdf } = await import('pdf-to-img');

  const document = await pdf(caminho, { scale: OCR_CONFIG.pdfScale });
  const paginas = [];

  for await (const pagina of document) {
    if (paginas.length >= OCR_CONFIG.maxPdfPages) break;
    paginas.push(pagina.buffer);
  }

  if (paginas.length === 0) {
    throw Object.assign(new Error('Nenhuma página pôde ser lida deste PDF'), { status: 400 });
  }
  return paginas;
}

// ---------------------------------------------------------------------------
// 3. Pool de workers do Tesseract (concorrencia limitada + timeout + idle)
// ---------------------------------------------------------------------------

const workers = [];
const fila = [];
let timerIdle = null;

function tocarIdle() {
  if (timerIdle) clearTimeout(timerIdle);
  timerIdle = setTimeout(descartarWorkersOciosos, OCR_CONFIG.workerIdleMs);
  if (timerIdle.unref) timerIdle.unref();
}

async function criarWorker() {
  const { createWorker } = require('tesseract.js');
  garantirDirTessdata();

  const worker = await createWorker(OCR_CONFIG.lang, 1, {
    langPath: OCR_CONFIG.langPath,
    cachePath: OCR_CONFIG.cachePath,
    cacheMethod: OCR_CONFIG.cacheMethod,
    logger: () => {},
    errorHandler: (err) => console.error('[ocr/tesseract]', err && err.message),
  });

  await worker.setParameters({
    // PSM 6 = bloco uniforme: le melhor contratos (titulo + corpo + tabela)
    // do que o PSM 3 (bloco unico) que vinha antes.
    tessedit_pageseg_mode: String(OCR_CONFIG.preprocess.psm),
  });

  return { worker, ocupado: true, ultimoUso: Date.now() };
}

// A criacao do worker inclui o download do traineddata na primeira execucao.
// Sem timeout, uma URL/rede com problema deixa a requisicao pendurada para
// sempre (o timeout de reconhecimento so comeca depois do worker pronto).
function criarWorkerComTimeout() {
  const criacao = criarWorker();
  let timer = null;

  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        Object.assign(
          new Error(
            `Não foi possível iniciar o motor de OCR em ${Math.round(OCR_CONFIG.timeoutMs / 1000)}s. ` +
              'Verifique a conexão com a internet (o modelo de português é baixado na primeira execução) e tente novamente.'
          ),
          { status: 503 }
        )
      );
    }, OCR_CONFIG.timeoutMs);
    if (timer.unref) timer.unref();
  });

  return Promise.race([criacao, timeout])
    .finally(() => {
      if (timer) clearTimeout(timer);
    })
    .catch((error) => {
      // Se o timeout venceu, encerra o worker que terminar de criar depois.
      criacao
        .then((entrada) => entrada.worker.terminate().catch(() => {}))
        .catch(() => {});
      throw error;
    });
}

function descartarWorker(entrada) {
  const i = workers.indexOf(entrada);
  if (i >= 0) workers.splice(i, 1);
  entrada.worker
    .terminate()
    .catch(() => {})
    .finally(() => {
      if (fila.length > 0) Memoria();
    });
}

function descartarWorkersOciosos() {
  const agora = Date.now();
  for (const entrada of [...workers]) {
    if (!entrada.ocupado && agora - entrada.ultimoUso > OCR_CONFIG.workerIdleMs) {
      descartarWorker(entrada);
    }
  }
  if (workers.length > 0) tocarIdle();
}

function Memoria() {
  while (fila.length > 0 && workers.length < OCR_CONFIG.maxConcurrency) {
    const proximo = fila.shift();
    proximo();
  }
  if (fila.length === 0) tocarIdle();
}

function adquirirWorker() {
  return new Promise((resolve, reject) => {
    const tentar = async () => {
      // 1. worker ocioso?
      const livre = workers.find((w) => !w.ocupado);
      if (livre) {
        livre.ocupado = true;
        livre.ultimoUso = Date.now();
        return resolve(livre);
      }

      // 2. ainda cabe mais um worker no limite de concorrencia?
      if (workers.length < OCR_CONFIG.maxConcurrency) {
        try {
          const nova = await criarWorkerComTimeout();
          workers.push(nova);
          return resolve(nova);
        } catch (error) {
          console.error('[ocr] falha ao criar worker:', error.message);
          return reject(
            error.status
              ? error
              : Object.assign(
                new Error(
                  'Não foi possível iniciar o motor de OCR. Na primeira execução é necessária internet para baixar o modelo de português; depois disso ele fica em cache.'
                ),
                { status: 503 }
              )
          );
        }
      }

      // 3. limite atingido:fica na fila e Memoria() chama depois
      fila.push(tentar);
      return undefined;
    };

    tentar().catch(reject);
  });
}

function liberarWorker(entrada) {
  if (!entrada || workers.indexOf(entrada) === -1) return;
  entrada.ocupado = false;
  entrada.ultimoUso = Date.now();
  Memoria();
  tocarIdle();
}

function comWorker(fn) {
  return new Promise((resolve, reject) => {
    adquirirWorker()
      .then((entrada) => {
        let timer = null;
        let encerrado = false;

        timer = setTimeout(() => {
          encerrado = true;
          // o recognize pode continuar preso: descarta o worker inteiro
          descartarWorker(entrada);
          reject(
            Object.assign(
              new Error(
                `O OCR excedeu ${Math.round(OCR_CONFIG.timeoutMs / 1000)}s e foi interrompido. Tente um documento com menos páginas ou com imagem mais nítida.`
              ),
              { status: 504 }
            )
          );
        }, OCR_CONFIG.timeoutMs);

        Promise.resolve()
          .then(() => fn(entrada.worker))
          .then(
            (valor) => {
              if (encerrado) return;
              clearTimeout(timer);
              liberarWorker(entrada);
              resolve(valor);
            },
            (erro) => {
              if (encerrado) return;
              clearTimeout(timer);
              liberarWorker(entrada);
              reject(erro);
            }
          );
      })
      .catch(reject);
  });
}

async function encerrarWorkers() {
  for (const entrada of [...workers]) descartarWorker(entrada);
  if (timerIdle) clearTimeout(timerIdle);
  timerIdle = null;
  fila.length = 0;
}

// ---------------------------------------------------------------------------
// 4. Reconhecimento de imagem
// ---------------------------------------------------------------------------

function linhasComConfianca(data) {
  const linhas = [];
  for (const linha of (data && data.lines) || []) {
    const texto = String(linha.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!texto) continue;
    linhas.push({ texto, chave: texto.toLowerCase(), confianca: Number(linha.confidence) || 0 });
  }
  return linhas;
}

// confianca real das linhas onde o trecho foi encontrado
function confiancaDoTrecho(linhas, trecho) {
  if (!trecho || linhas.length === 0) return null;
  const alvo = String(trecho).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!alvo) return null;

  // tenta a linha que contem o trecho inteiro
  const exato = linhas.find((l) => l.chave.includes(alvo) || alvo.includes(l.chave));
  if (exato) return exato.confianca;

  // cai para a palavra mais significativa do trecho
  const palavras = alvo.split(' ').filter((p) => p.length >= 4);
  for (const palavra of palavras) {
    const achada = linhas.find((l) => l.chave.includes(palavra));
    if (achada) return achada.confianca;
  }
  return null;
}

async function reconhecerImagem(buffer) {
  return comWorker(async (worker) => {
    const { data } = await worker.recognize(buffer, {}, { text: true, blocks: true });
    return {
      text: String((data && data.text) || '').trim(),
      confianca: Number((data && data.confidence) || 0),
      linhas: linhasComConfianca(data),
    };
  });
}

// ---------------------------------------------------------------------------
// 5. Normalizadores (BR/US) - usados na extracao e uteis para o mobile
// ---------------------------------------------------------------------------

// "R$ 1.234,56" | "1.234,56" | "1234.56" | "1,234.56" -> 1234.56
function parseValor(texto) {
  if (texto === null || texto === undefined) return null;
  const limpo = String(texto).replace(/R\$/gi, '').replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!limpo || !/\d/.test(limpo)) return null;

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');
  let normalizado;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // o separador decimal e o ultimo a aparecer
    normalizado = ultimaVirgula > ultimoPonto ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/,/g, '');
  } else if (ultimaVirgula >= 0) {
    const depoisVirgula = limpo.length - ultimaVirgula - 1;
    const multiplasVirgulas = (limpo.match(/,/g) || []).length > 1;
    // "1,234" com 3 casas e virgula repetida = separador de milhar
    normalizado = multiplasVirgulas || depoisVirgula === 3 ? limpo.replace(/,/g, '') : limpo.replace(',', '.');
  } else if (ultimoPonto >= 0) {
    const depoisPonto = limpo.length - ultimoPonto - 1;
    const multiplosPontos = (limpo.match(/\./g) || []).length > 1;
    // "24.000" (3 casas, sem virgula) e milhar; "1234.56" e decimal
    normalizado = multiplosPontos || depoisPonto === 3 ? limpo.replace(/\./g, '') : limpo;
  } else {
    normalizado = limpo;
  }

  const value = Number(normalizado);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

// 10/03/2026 | 10-03-2026 | 2026-03-10 -> 2026-03-10 (sempre ISO valido)
function parseData(texto) {
  if (!texto) return null;
  const t = String(texto);

  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const candidato = `${iso[1]}-${iso[2]}-${iso[3]}`;
    return isDate(candidato) ? candidato : null;
  }

  const br = t.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
  if (br) {
    const dia = br[1].padStart(2, '0');
    const mes = br[2].padStart(2, '0');
    const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
    const candidato = `${ano}-${mes}-${dia}`;
    return isDate(candidato) ? candidato : null;
  }
  return null;
}

function parseCpfCnpj(texto) {
  if (!texto) return null;
  // NAO remove todo o espaco: isso colaria o numero no texto seguinte e o
  // \b final deixaria de casar. Apenas normaliza os espacos internos.
  const t = String(texto).replace(/[^\S\n]+/g, ' ');

  const cpf = t.match(/\b(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-\s]?(\d{2})\b/);
  if (cpf) {
    const digitos = cpf.slice(1).join('');
    if (isValidCpfCnpj(digitos).tipo === 'CPF') return digitos;
  }

  const cnpj = t.match(/\b(\d{2})[.\s]?(\d{3})[.\s]?(\d{3})[/\s]?(\d{4})[-\s]?(\d{2})\b/);
  if (cnpj) {
    const digitos = cnpj.slice(1).join('');
    if (isValidCpfCnpj(digitos).tipo === 'CNPJ') return digitos;
  }
  return null;
}

function parsePercentual(texto) {
  const v = parseValor(texto);
  return v === null ? null : Number(v.toFixed(2));
}

// ---------------------------------------------------------------------------
// 6. Extracao / interpretacao dos campos
// ---------------------------------------------------------------------------

const FORMAS_PAGAMENTO = [
  { nome: 'BOLETO', regex: /boleto/i },
  { nome: 'PIX', regex: /\bPIX\b|\bPIX\s+(?:à|a)\s+vista/i },
  { nome: 'CARTAO_CREDITO', regex: /cart[aã]o\s*(?:de\s*)?cr[eé]dito/i },
  { nome: 'CARTAO_DEBITO', regex: /cart[aã]o\s*(?:de\s*)?d[eé]bito/i },
  { nome: 'TRANSFERENCIA', regex: /transfer[eê]ncia/i },
  { nome: 'DINHEIRO', regex: /dinheiro|esp[eé]cie/i },
];

// Campos que a tela de revisao utiliza. A cobertura e a base do aviso de
// leitura incompleta (RNF17).
const CAMPOS_ESPERADOS = [
  'cliente_nome',
  'cpf_cnpj',
  'numero',
  'valor_total',
  'quantidade_parcelas',
  'valor_parcela',
  'vencimentos',
  'forma_pagamento',
];

function registrar(campo, valor, confiancaPorCampo, campos, confiancaLinhas) {
  campos.push(campo);
  const confianca = confiancaDoTrecho(confiancaLinhas, valor);
  if (confianca !== null) confiancaPorCampo[campo] = confianca;
}

// Estagio de interpretacao do texto. Recebe o texto lido e devolve a sugestao
// estruturada no formato aceito pelo contrato (dados_json) e pela RevisaoContrato.
// Ponto de extensao para uma futura IA de interpretacao de contratos.
function interpretarTexto(texto, opcoes = {}) {
  const t = String(texto || '').replace(/\r/g, '\n');
  const confiancaLinhas = opcoes.confiancaLinhas || [];
  const campos = [];
  const confiancaPorCampo = {};
  const dados = {};
  const alertas = [];

  // 6.1 cliente -----------------------------------------------------------
  const cliente = t.match(
    /(?:cliente|contratante|parte contratante|raz[aã]o social|nome)[\s:.-]*(?:\/)?\s*([^\n]{2,120})/i
  );
  if (cliente) {
    const nome = cliente[1]
      .replace(/[|:;,]$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // evita capturar "Cliente: 123.456.789-00" (documento) como nome
    if (nome && !/^[\d.\/-]+$/.test(nome) && !/^(cpf|cnpj)$/i.test(nome)) {
      dados.cliente_nome = nome.slice(0, 120);
      registrar('cliente_nome', nome, confiancaPorCampo, campos, confiancaLinhas);
    }
  }

  // 6.2 cpf/cnpj (com validacao real de digitos) ----------------------------
  const cpfCnpj = parseCpfCnpj(t);
  if (cpfCnpj) {
    dados.cpf_cnpj = cpfCnpj;
    registrar('cpf_cnpj', cpfCnpj, confiancaPorCampo, campos, confiancaLinhas);
    const check = isValidCpfCnpj(cpfCnpj);
    if (!check.ok) {
      dados.cpf_cnpj_valido = false;
      alertas.push('O CPF/CNPJ lido do documento não é válido. Confira o número na revisão.');
    } else {
      dados.cpf_cnpj_valido = true;
    }
  }

  // 6.3 numero do contrato -----------------------------------------------
  // Varre TODAS as ocorrencias: o titulo do documento ("CONTRATO DE
  // PRESTACAO") casa primeiro e nao pode impedir que a linha
  // "Numero do contrato: CTR-2026-001" seja aproveitada.
  const PALAVRAS_SEM_NUMERO =
    /^(?:de|do|da|dos|das|para|com|entre|em|a|o|e|prestacao|servico|servicos|locacao|arrendamento|adocao|fornecimento|compra|venda|obra|honorarios|empreitada|anexo|clausula)$/i;
  const RE_NUMERO = /(?:contrato\s*n[ºo°.]?|n[ºo°.]?\s*(?:do\s*)?contrato|numero\s*(?:do\s*)?contrato|contrato)\s*[.:-]?\s*([A-Z0-9][A-Z0-9\-/]{1,30})/gi;

  for (const achado of t.matchAll(RE_NUMERO)) {
    const candidato = achado[1].trim().toUpperCase();
    const temDigito = /\d/.test(candidato);
    const ehData = /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(candidato);
    if (temDigito && !ehData && !PALAVRAS_SEM_NUMERO.test(candidato) && !/^PARCELA/i.test(candidato)) {
      dados.numero = candidato;
      registrar('numero', achado[0], confiancaPorCampo, campos, confiancaLinhas);
      break;
    }
  }

  // 6.4 valor total -------------------------------------------------------
  const valorTotal =
    t.match(
      /(?:valor\s*total|total\s*(?:do|geral\s*d[oa]\s*)?contrato|valor\s*(?:do|de\s*para\s*o)\s*contrato|valor\s*da\s*presta[çc][aã]o)[^\d]{0,20}(R\$\s*)?([\d.,]{3,})/i
    ) || t.match(/\bvalor\s*(?:total)?[^\d]{0,12}(R\$\s*)?([\d.,]{3,})/i);
  if (valorTotal) {
    const v = parseValor(valorTotal[2]);
    if (v !== null && v > 0) {
      dados.valor_total = v;
      registrar('valor_total', valorTotal[0], confiancaPorCampo, campos, confiancaLinhas);
    }
  }

  // 6.5 quantidade e valor da parcela -------------------------------------
  const qtdParcelas = t.match(
    /(\d{1,3})\s*(?:x\s*(?:de\s*R?\$?)?|(?:x\s*)?parcelas?\b|presta[çc][õo]es?\b|de\s*\d{1,3}\s*x)/i
  );
  if (qtdParcelas) {
    dados.quantidade_parcelas = Number(qtdParcelas[1]);
    registrar('quantidade_parcelas', qtdParcelas[0], confiancaPorCampo, campos, confiancaLinhas);
  }

  const valorParcela = t.match(
    /(\d{1,3})\s*x\s*(?:de\s*)?(R\$\s*[\d.,]+)|(?:valor\s*(?:da|da\s*parcela)\s*(?:de\s*)?|parcelas?\s*(?:de|unitaria\s*de)\s*)(R\$\s*[\d.,]+)/i
  );
  if (valorParcela) {
    const bruto = valorParcela[2] || valorParcela[3];
    const v = parseValor(bruto);
    if (v !== null && v > 0) {
      dados.valor_parcela = v;
      registrar('valor_parcela', bruto, confiancaPorCampo, campos, confiancaLinhas);
    }
  }

  // 6.6 juros e multa -----------------------------------------------------
  const juros = t.match(/(?:juros?(?:\s+(?:ao\s*mes|a\.?m\.?|mensal(?:es)?|de\s*mora))?|mora)\D{0,12}(\d{1,2}[.,]?\d{0,2})\s*%/i);
  if (juros) {
    const p = parsePercentual(juros[1]);
    if (p !== null) {
      dados.juros_percentual = p;
      registrar('juros_percentual', juros[0], confiancaPorCampo, campos, confiancaLinhas);
    }
  }

  const multa = t.match(/multa\D{0,12}(\d{1,2}[.,]?\d{0,2})\s*%/i);
  if (multa) {
    const p = parsePercentual(multa[1]);
    if (p !== null) {
      dados.multa_percentual = p;
      registrar('multa_percentual', multa[0], confiancaPorCampo, campos, confiancaLinhas);
    }
  }

  // 6.7 vencimentos / datas ------------------------------------------------
  const vencimentos = [];
  const linhasData = t.match(/[^\n]*(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})[^\n]*/g) || [];
  for (const linha of linhasData) {
    for (const bruto of linha.match(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}/g) || []) {
      const d = parseData(bruto);
      if (d && !vencimentos.includes(d)) vencimentos.push(d);
    }
  }
  if (vencimentos.length > 0) {
    vencimentos.sort();
    dados.vencimentos = vencimentos;
    dados.data_inicio = vencimentos[0];
    dados.data_fim = vencimentos[vencimentos.length - 1];
    registrar('vencimentos', vencimentos[0], confiancaPorCampo, campos, confiancaLinhas);
    campos.push('data_inicio', 'data_fim');
  }

  // 6.8 forma de pagamento -----------------------------------------------
  for (const forma of FORMAS_PAGAMENTO) {
    if (forma.regex.test(t)) {
      dados.forma_pagamento = forma.nome;
      registrar('forma_pagamento', forma.nome, confiancaPorCampo, campos, confiancaLinhas);
      break;
    }
  }

  // 6.9 tipo / descricao --------------------------------------------------
  const tipo = t.match(
    /((?:tipo\s*(?:de\s*)?contrato|contrato\s*de)\s*(?:servi[çc]o|presta[çc][aã]o|loca[çc][aã]o|arrendamento|adoca[çc][aã]o|fornecimento|empreitada|honor[aá]rios|loca[çc][aã]o)?[^\n:]{0,40})/i
  );
  if (tipo) {
    const valor = tipo[1]
      .replace(/^(?:tipo\s*(?:de\s*)?contrato|contrato\s*de)\s*:?/i, '')
      .replace(/[|:;,]$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 100);
    if (valor.length >= 2) {
      dados.tipo = valor.charAt(0).toUpperCase() + valor.slice(1);
      registrar('tipo', tipo[1], confiancaPorCampo, campos, confiancaLinhas);
    }
  }

  return { dados, campos, confiancaPorCampo, alertas };
}

// ---------------------------------------------------------------------------
// 7. Confianca geral (documentada em docs/OCR.md)
// ---------------------------------------------------------------------------
//
//  OCR (Tesseract):  media das confiancas REAIS das linhas onde cada campo foi
//                    encontrado, combinada com a cobertura dos campos esperados.
//  Texto de PDF:     nao ha OCR; a confianca e a cobertura dos campos, porque
//                    a leitura da camada de texto e deterministica.
//
//  confianca = media_linhas * 0.7 + (cobertura * 100) * 0.3
//
// Nao existe mais a formula artificial "40 + campos * 8".

function calcularConfianca({ confiancaPorCampo, campos, origem }) {
  const esperados = CAMPOS_ESPERADOS.length;
  const encontrados = CAMPOS_ESPERADOS.filter((c) => campos.includes(c)).length;
  const cobertura = esperados > 0 ? encontrados / esperados : 0;

  if (encontrados === 0) {
    return { confianca: 0, cobertura: 0, encontrados, media: 0 };
  }

  const valores = Object.values(confiancaPorCampo).filter((n) => Number.isFinite(n) && n > 0);

  if (origem !== 'ocr' || valores.length === 0) {
    return {
      confianca: Math.round(cobertura * 100),
      cobertura,
      encontrados,
      media: null,
    };
  }

  const media = valores.reduce((soma, n) => soma + n, 0) / valores.length;
  const confianca = Math.round(media * 0.7 + cobertura * 100 * 0.3);
  return {
    confianca: Math.max(0, Math.min(100, confianca)),
    cobertura,
    encontrados,
    media: Math.round(media),
  };
}

// ---------------------------------------------------------------------------
// 8. Leitura do arquivo (texto do PDF ou OCR)
// ---------------------------------------------------------------------------

async function lerTextoDePdf(caminho) {
  try {
    const buffer = await pdfParse(caminho);
    return (buffer.text || '').trim();
  } catch (error) {
    // PDF corrompido/inexistente: cai no OCR (rasterizacao), que da erro proprio.
    return '';
  }
}

async function extrairTextoDeArquivo({ caminho, tipoArquivo }) {
  const avisos = [];

  // Integracao opcional com o servico Python de OCR (ocr-service/).
  // Desativada por padrao (PYTHON_OCR_ENABLED=false): nesse caso o fluxo abaixo
  // e identico ao comportamento anterior. Quando ativada e o Python responde,
  // o resultado ja vem no formato interno do OCR Node; se falhar (timeout,
  // indisponivel, resposta invalida), cai no OCR Node atual sem quebrar nada.
  const ehArquivoOcr =
    tipoArquivo === 'application/pdf' ||
    (tipoArquivo && tipoArquivo.startsWith('image/'));
  if (ehArquivoOcr) {
    const py = await pythonOcrService.extrairComPythonOcr({ caminho, tipoArquivo });
    if (py.usado && py.result) {
      return {
        ...py.result,
        avisos: [...avisos, ...(py.result.avisos || [])],
      };
    }
  }

  if (tipoArquivo === 'application/pdf') {
    const texto = await lerTextoDePdf(caminho);
    if (texto.length >= OCR_CONFIG.minCharsPdfText) {
      return {
        text: texto,
        confianca: null,
        origem: 'pdf-texto',
        paginas: null,
        avisos,
      };
    }
    // Sem camada de texto util: rasteriza, pre-processa e manda para o Tesseract.
    const paginas = await rasterizarPdf(caminho);
    avisos.push(
      'Este PDF não possui texto selecionável. As páginas foram convertidas em imagem e lidas por OCR, o que pode reduzir um pouco a precisão.'
    );
    const preparadas = [];
    for (const pagina of paginas) {
      const { buffer } = await preProcessarImagem(pagina);
      preparadas.push(buffer);
    }
    const resultado = await ocrSobrePaginas(preparadas);
    return { ...resultado, avisos: [...avisos, ...(resultado.avisos || [])] };
  }

  if (tipoArquivo && tipoArquivo.startsWith('image/')) {
    const preprocessado = await preProcessarImagem(fs.readFileSync(caminho));
    const resultado = await ocrSobrePaginas([preprocessado.buffer]);
    return { ...resultado, avisos: [...avisos, ...(resultado.avisos || [])] };
  }

  throw Object.assign(new Error('Formato de arquivo não suportado para OCR'), { status: 400 });
}

async function ocrSobrePaginas(buffers) {
  const textos = [];
  const todasLinhas = [];
  let somaConfianca = 0;
  let paginasLidas = 0;

  for (const buffer of buffers) {
    const { text, confianca, linhas } = await reconhecerImagem(buffer);
    if (text) {
      textos.push(text);
      // desloca o numero da linha para manter o indice global de linhas
      for (const linha of linhas) {
        todasLinhas.push({ ...linha, pagina: paginasLidas + 1 });
      }
      somaConfianca += confianca;
      paginasLidas += 1;
    }
  }

  const text = textos.join('\n\n').trim();

  if (text.length < OCR_CONFIG.minCharsOcr) {
    return {
      text: '',
      confianca: 0,
      origem: 'ocr',
      paginas: buffers.length,
      avisos: ['Não foi possível identificar texto legível no documento enviado. Verifique se a imagem está nítida e tente novamente.'],
    };
  }

  return {
    text,
    confianca: paginasLidas > 0 ? Math.round(somaConfianca / paginasLidas) : 0,
    confiancaLinhas: todasLinhas,
    origem: 'ocr',
    paginas: buffers.length,
  };
}

// Entrada unica: le o arquivo e devolve texto + campos + confianca real.
async function processarArquivo({ caminho, tipoArquivo }) {
  const leitura = await extrairTextoDeArquivo({ caminho, tipoArquivo });

  if (!leitura.text) {
    return {
      dados: {},
      campos: [],
      confianca: 0,
      confiancaMedia: leitura.confianca,
      confiancaPorCampo: {},
      cobertura: 0,
      origem: leitura.origem,
      paginas: leitura.paginas,
      texto: '',
      avisos: leitura.avisos,
    };
  }

  const { dados, campos, confiancaPorCampo, alertas } = interpretarTexto(leitura.text, {
    confiancaLinhas: leitura.confiancaLinhas || [],
  });

  const { confianca, cobertura } = calcularConfianca({
    confiancaPorCampo,
    campos,
    origem: leitura.origem,
  });

  const avisos = [...(leitura.avisos || []), ...alertas];
  if (confianca < OCR_CONFIG.minConfianca) {
    avisos.push('Alguns dados podem estar incorretos. Revise antes de confirmar.');
  }

  return {
    dados,
    campos,
    confianca,
    confiancaMedia: leitura.confianca,
    confiancaPorCampo,
    cobertura,
    origem: leitura.origem,
    paginas: leitura.paginas,
    texto: leitura.text,
    avisos,
  };
}

// Compatibilidade: extrairDados continua existindo com a mesma assinatura
// usada pelas telas/testes (texto -> { dados, campos, confianca }).
function extrairDados(texto, opcoes = {}) {
  const { dados, campos, confiancaPorCampo, alertas } = interpretarTexto(texto, opcoes);
  const { confianca } = calcularConfianca({
    confiancaPorCampo,
    campos,
    origem: opcoes.origem || 'ocr',
  });
  return { dados, campos, confianca, confiancaPorCampo, avisos: alertas };
}

module.exports = {
  // pipeline
  processarArquivo,
  extrairTextoDeArquivo,
  extrairDados,
  interpretarTexto,
  // utilitarios (reutilizados pelo controller e pelos testes)
  parseValor,
  parseData,
  parseCpfCnpj,
  parsePercentual,
  calcularConfianca,
  preProcessarImagem,
  rasterizarPdf,
  encerrarWorkers,
  CAMPOS_ESPERADOS,
};
