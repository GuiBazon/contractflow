// Configuracao central do OCR (RF10/RF11/RNF17/RNF18).
// Tudo aqui e sobrescrevivel por variavel de ambiente, para que o mesmo codigo
// funcione em desenvolvimento (Windows) e producao (Docker) sem alteracao.

const path = require('path');
const fs = require('fs');

function num(value, padrao) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

// Diretorio de cache do traineddata do Tesseract. Fica DENTRO de api/ mas e
// ignorado pelo git (nao versionamos binario de ~15MB). Em Docker este caminho
// deve ser montado como volume, senao o traineddata e baixado a cada build.
const TESSDATA_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  process.env.OCR_TESSDATA_DIR || '.tessdata'
);

const OCR_CONFIG = {
  // Idioma do Tesseract. "por" = portugues (Brasil).
  lang: process.env.OCR_LANG || 'por',
  // Origem do traineddata quando ele ainda nao esta em cache.
  // O CDN precisa do idioma e da versao no caminho; sem isso o download da 404
  // e a criacao do worker fica pendurada (o OCR nunca inicia).
  langPath:
    process.env.OCR_LANG_PATH ||
    `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${process.env.OCR_LANG || 'por'}/4.0.0_best_int`,
  cachePath: TESSDATA_DIR,
  // "write" = usa o cache e so baixa se o arquivo nao existir.
  cacheMethod: process.env.OCR_CACHE_METHOD || 'write',

  // Tempo maximo da leitura de um unico documento (ms). Estourou, a requisicao
  // responde 504 e o worker e descartado (evita CPU presa).
  timeoutMs: num(process.env.OCR_TIMEOUT_MS, 90000),

  // Quantos documentos podem ser lidos ao mesmo tempo no processo.
  maxConcurrency: num(process.env.OCR_MAX_CONCURRENCY, 2),

  // Paginas maxima rasterizadas de um PDF (protege contra PDF gigante).
  maxPdfPages: num(process.env.OCR_MAX_PDF_PAGES, 10),

  // Escala de rasterizacao do PDF. 1.0 = 72dpi; 2.78 ~ 200dpi.
  pdfScale: Number(process.env.OCR_PDF_SCALE) > 0 ? Number(process.env.OCR_PDF_SCALE) : 2.78,

  // Abaixo deste tamanho de texto o PDF e considerado escaneado e vai para OCR.
  minCharsPdfText: num(process.env.OCR_MIN_CHARS_PDF, 40),

  // Abaixo deste tamanho de texto o OCR e considerado sem leitura util.
  minCharsOcr: num(process.env.OCR_MIN_CHARS, 20),

  // Abaixo desta confianca a tela recebe aviso de revisao (RNF17).
  minConfianca: Number(process.env.OCR_MIN_CONFIDENCE) >= 0
    ? Number(process.env.OCR_MIN_CONFIDENCE)
    : 60,

  // Pre-processamento de imagem (foto de celular).
  preprocess: {
    // Largura minima antes do OCR. Fotos de celular costumam ter 1000-4000px.
    larguraMinima: num(process.env.OCR_LARGURA_MINIMA, 1600),
    // TesseractPSM: 3 = bloco unico, 6 = bloco uniforme, 4 = coluna unica.
    psm: num(process.env.OCR_PSM, 6),
    // Binarizacao. 0 = desligado (padrao). O proprio Tesseract ja faz Otsu;
    // ligar sem necessidade costuma PREJUDICAR texto com anti-aliasing.
    threshold: Number(process.env.OCR_THRESHOLD) || 0,
    // 0 = desliga realce de contraste automatico.
    normalize: process.env.OCR_NORMALIZE === '0' ? false : true,
    // Recorta a margem uniforme (comum em PDF escaneado). Sem isso, o
    // normalize usa a pagina branca inteira como referencia e escurece o
    // conteudo, fazendo o Tesseract nao enxergar o texto.
    trim: process.env.OCR_TRIM === '0' ? false : true,
  },

  // Segundos para o worker ocioso ser encerrado (libera memoria/CPU).
  workerIdleMs: num(process.env.OCR_WORKER_IDLE_MS, 120000),
};

function garantirDirTessdata() {
  try {
    fs.mkdirSync(OCR_CONFIG.cachePath, { recursive: true });
  } catch (error) {
    console.error('[ocr] nao foi possivel criar o cache do traineddata:', error.message);
  }
}

module.exports = { OCR_CONFIG, TESSDATA_DIR, garantirDirTessdata };
